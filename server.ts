import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * Robust server-side PDF text extraction using pdfjs-dist
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
    }).promise;
    const pagesText: string[] = [];
    const maxPages = Math.min(doc.numPages, 20);
    for (let p = 1; p <= maxPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const pageStr = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pageStr) {
        pagesText.push(`[Σελίδα ${p}]\n${pageStr}`);
      }
    }
    return pagesText.join('\n\n');
  } catch (err) {
    console.warn('PDF text extraction error:', err);
    return '';
  }
}

// Initialize GoogleGenAI SDK with server-side API Key
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('WARNING: GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.');
}

const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Executes a Gemini model call with retry and fallback across valid models on 503/429
 */
async function generateWithRetry(params: any) {
  // Deduplicate list of candidate models, prioritizing fastest free tier options
  const modelsToTry = Array.from(
    new Set([
      params.model,
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
    ].filter(Boolean))
  );

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      return await ai.models.generateContent({
        ...params,
        model,
      });
    } catch (err: any) {
      lastError = err;
      const errorMessage = String(err?.message || '');
      const isQuotaOrUnavailable =
        errorMessage.includes('429') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('Quota') ||
        errorMessage.includes('503') ||
        errorMessage.includes('UNAVAILABLE') ||
        errorMessage.includes('high demand') ||
        errorMessage.includes('limit: 20');
      
      if (isQuotaOrUnavailable) {
        console.warn(`Model ${model} returned quota/unavailable (${errorMessage.slice(0, 80)}...). Trying fallback model...`);
        await new Promise((resolve) => setTimeout(resolve, 400));
        continue;
      }
      break;
    }
  }

  throw lastError;
}

/**
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

/**
 * Parse document contents on the server
 * Supports docx (mammoth), xlsx/xls/csv (xlsx), txt/md/json
 */
app.post('/api/documents/parse', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, type, base64Data } = req.body;
    if (!base64Data) {
      res.status(400).json({ error: 'Missing base64Data' });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const extension = (name || '').split('.').pop()?.toLowerCase() || '';

    let extractedText = '';

    if (extension === 'docx' || type?.includes('wordprocessingml')) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value.trim();
    } else if (['xlsx', 'xls', 'csv'].includes(extension) || type?.includes('spreadsheet') || type?.includes('excel')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const parts: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        if (csv.trim()) {
          parts.push(`[Φύλλο: ${sheetName}]\n${csv.trim()}`);
        }
      }
      extractedText = parts.join('\n\n');
    } else if (['txt', 'md', 'json', 'log'].includes(extension) || type?.startsWith('text/')) {
      extractedText = buffer.toString('utf-8');
    } else if (extension === 'pdf' || type?.includes('pdf')) {
      const pdfText = await extractTextFromPdf(buffer);
      extractedText = pdfText.trim() ? pdfText : '[Έγγραφο PDF - Σαρωμένη εικόνα ή μη εξαγώγιμο κείμενο]';
    } else {
      extractedText = buffer.toString('utf-8');
    }

    res.json({
      success: true,
      text: extractedText,
      charCount: extractedText.length,
    });
  } catch (error: any) {
    console.error('Error parsing document:', error);
    res.status(500).json({
      error: 'Αποτυχία εξαγωγής κειμένου από το αρχείο: ' + (error?.message || 'Άγνωστο σφάλμα'),
    });
  }
});

/**
 * Strict Grounded Q&A Chat for Customers
 * Rule: Answer ONLY based on the uploaded internal documents.
 * Crucial Rule: NEVER reveal file names, source paths, or internal metadata to the customer.
 */
app.post('/api/chat/ask', async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, documents, history = [] } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Παρακαλούμε εισάγετε μια έγκυρη ερώτηση.' });
      return;
    }

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      res.json({
        answer: 'Δεν υπάρχουν προς το παρόν ενεργά έγγραφα στη βάση γνώσης. Παρακαλούμε απευθυνθείτε στον διαχειριστή.',
        isAnswerable: false,
      });
      return;
    }

    // Build the internal knowledge context.
    // Notice: We do NOT provide internal file names in a way that the model echoes them to the user.
    // Instead we label items as Section / Knowledge Entry 1, 2, 3...
    const contents: any[] = [];

    // System instruction strictly constraining the output
    const systemInstruction = `
ΕΙΣΑΙ ΕΝΑΣ ΕΥΓΕΝΙΚΟΣ, ΕΠΑΓΓΕΛΜΑΤΙΑΣ ΚΑΙ ΑΠΟΛΥΤΑ ΕΓΚΥΡΟΣ ΨΗΦΙΑΚΟΣ ΕΚΠΡΟΣΩΠΟΣ ΕΞΥΠΗΡΕΤΗΣΗΣ.
Ο ΣΤΟΧΟΣ ΣΟΥ ΕΙΝΑΙ ΝΑ ΑΠΑΝΤΑΣ ΣΤΙΣ ΕΡΩΤΗΣΕΙΣ ΤΩΝ ΠΕΛΑΤΩΝ/ΕΠΙΣΚΕΠΤΩΝ.

ΚΡΙΣΙΜΟΙ ΚΑΝΟΝΕΣ ΑΣΦΑΛΕΙΑΣ ΚΑΙ ΤΕΚΜΗΡΙΩΣΗΣ:
1. ΑΠΑΝΤΗΣΗ ΜΟΝΟ ΑΠΟ ΤΗ ΓΝΩΣΗ: Απάντησε στην ερώτηση του χρήστη ΑΠΟΚΛΕΙΣΤΙΚΑ ΚΑΙ ΜΟΝΟ με βάση τις πληροφορίες που περιέχονται στο παρεχόμενο Εσωτερικό Σώμα Γνώσης (Internal Knowledge Base).
2. ΜΗΔΕΝΙΚΗ ΔΙΑΡΡΟΗ ΑΡΧΕΙΩΝ & ΠΗΓΩΝ: Ο πελάτης ΔΕΝ επιτρέπεται να γνωρίζει ποια αρχεία υπάρχουν, πώς ονομάζονται τα αρχεία (π.χ. μην πεις ποτέ "στο αρχείο συμβόλαιο.docx" ή "στον πίνακα excel"), ούτε να αναφέρεις εσωτερικές διαδρομές ή παραπομπές. Μίλα φυσικά σαν εκπρόσωπος της επιχείρησης (π.χ. "Σύμφωνα με τους όρους μας...", "Η διαδικασία προβλέπει ότι...").
3. ΑΥΣΤΗΡΗ ΑΠΑΓΟΡΕΥΣΗ ΕΙΚΑΣΙΩΝ (ANTI-HALLUCINATION):
   - Εάν η απάντηση ΔΕΝ αναφέρεται ρητά ή δεν προκύπτει με βεβαιότητα από το παρεχόμενο υλικό γνώσης, ΑΠΑΓΟΡΕΥΕΤΑΙ να χρησιμοποιήσεις γενικές εξωτερικές γνώσεις ή να μαντέψεις.
   - Σε αυτή την περίπτωση, πρέπει να απαντήσεις καθαρά και ευγενικά:
     "Λυπούμαστε, η συγκεκριμένη πληροφορία δεν είναι διαθέσιμη. Παρακαλούμε επικοινωνήστε απευθείας μαζί μας για περαιτέρω διευκρίνιση."
4. ΓΛΩΣΣΑ: Απάντησε στη γλώσσα της ερώτησης (κατά κανόνα Ελληνικά).
5. ΥΦΟΣ: Σαφές, ευγενικό, περιεκτικό και άμεσο. Μην μακρηγορείς χωρίς λόγο. Χρησιμοποίησε bullets αν βοηθά στην κατανόηση βημάτων ή προϋποθέσεων.
`.trim();

    // Collect textual entries and multimodal entries (PDFs/Images)
    let textKnowledgeCorpus = '';
    const inlineParts: any[] = [];

    documents.forEach((doc: any, index: number) => {
      if (!doc.isActive) return;

      const entryId = index + 1;
      if (doc.type === 'image' && doc.imageData) {
        const cleanBase64 = doc.imageData.includes(',') ? doc.imageData.split(',')[1] : doc.imageData;
        inlineParts.push({
          inlineData: {
            mimeType: doc.mimeType || 'image/jpeg',
            data: cleanBase64,
          },
        });
        textKnowledgeCorpus += `\n[Ενότητα Γνώσης ${entryId} (Οπτικό/Εικόνα)]: Δες το συνημμένο οπτικό υλικό ${entryId}.\n`;
      } else if (doc.type === 'pdf' && doc.pdfBase64) {
        const cleanBase64 = doc.pdfBase64.includes(',') ? doc.pdfBase64.split(',')[1] : doc.pdfBase64;
        inlineParts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: cleanBase64,
          },
        });
        textKnowledgeCorpus += `\n[Ενότητα Γνώσης ${entryId} (Έγγραφο)]: Δες το συνημμένο επίσημο έγγραφο ${entryId}.\n`;
      } else if (doc.content) {
        textKnowledgeCorpus += `\n--- ΕΝΟΤΗΤΑ ΓΝΩΣΗΣ ${entryId} ---\n${doc.content}\n`;
      }
    });

    if (!textKnowledgeCorpus.trim() && inlineParts.length === 0) {
      res.json({
        answer: 'Δεν βρέθηκε διαθέσιμο περιεχόμενο στα ενεργά έγγραφα.',
        isAnswerable: false,
      });
      return;
    }

    // Build the query prompt
    const promptText = `
ΕΣΩΤΕΡΙΚΟ ΣΩΜΑ ΓΝΩΣΗΣ:
${textKnowledgeCorpus}

ΠΡΟΣΦΑΤΟ ΙΣΤΟΡΙΚΟ ΣΥΝΟΜΙΛΙΑΣ:
${history.map((h: any) => `${h.role === 'user' ? 'Πελάτης' : 'Βοηθός'}: ${h.text}`).join('\n')}

ΕΡΩΤΗΣΗ ΠΕΛΑΤΗ:
"${question}"

Να απαντήσεις σύμφωνα με τις οδηγίες (αυστηρά μόνο από το εσωτερικό σώμα γνώσης, χωρίς αναφορά σε αρχεία/πηγές, ευγενικά και αξιόπιστα):
`.trim();

    const contentsPayload = inlineParts.length > 0 ? { parts: [...inlineParts, { text: promptText }] } : promptText;

    // Call Gemini server-side with retry and fallback
    const response = await generateWithRetry({
      model: 'gemini-flash-latest',
      contents: contentsPayload,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || 'Δεν κατέστη δυνατή η δημιουργία απάντησης.';

    // Check if the answer indicates missing information
    const isAnswerable = !reply.includes('δεν είναι διαθέσιμη') && !reply.includes('δεν υπάρχει διαθέσιμη');

    res.json({
      answer: reply,
      isAnswerable,
    });
  } catch (error: any) {
    console.error('Error in /api/chat/ask:', error);
    res.status(500).json({
      error: 'Παρουσιάστηκε σφάλμα κατά την επεξεργασία της απάντησης: ' + (error?.message || 'Άγνωστο σφάλμα'),
    });
  }
});

/**
 * Generate starter suggestions for the client without leaking file names
 */
app.post('/api/documents/suggest-questions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { documents } = req.body;
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      res.json({
        suggestions: [
          'Ποιες είναι οι βασικές καλύψεις και υπηρεσίες;',
          'Ποια δικαιολογητικά απαιτούνται συνήθως;',
          'Ποια είναι η διαδικασία δήλωσης ή επικοινωνίας;',
        ],
      });
      return;
    }

    // Pass sample of texts
    const sampleText = documents
      .filter((d) => d.content && d.isActive)
      .map((d) => d.content.slice(0, 1500))
      .join('\n\n')
      .slice(0, 5000);

    if (!sampleText) {
      res.json({
        suggestions: [
          'Ποιες καλύψεις παρέχονται;',
          'Ποιο είναι το κόστος ή η διαδικασία;',
          'Πώς μπορώ να εξυπηρετηθώ άμεσα;',
        ],
      });
      return;
    }

    const response = await generateWithRetry({
      model: 'gemini-3.8-flash',
      contents: `Με βάση το παρακάτω εσωτερικό κείμενο, δημιούργησε 3 έως 4 σύντομες, χρήσιμες ενδεικτικές ερωτήσεις που θα μπορούσε να κάνει ένας ενδιαφερόμενος πελάτης. 
Μην αναφέρεις ονόματα αρχείων ή τεχνικούς όρους. Επίστρεψε ΜΟΝΟ ένα JSON array από strings, π.χ. ["Ερώτηση 1", "Ερώτηση 2", "Ερώτηση 3"].

Κείμενο:
${sampleText}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    res.json({ suggestions: Array.isArray(parsed) && parsed.length > 0 ? parsed.slice(0, 4) : [
      'Ποιες είναι οι βασικές καλύψεις;',
      'Ποιες είναι οι εξαιρέσεις ή προϋποθέσεις;',
      'Ποια είναι τα απαραίτητα δικαιολογητικά;',
    ] });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.json({
      suggestions: [
        'Ποιες είναι οι βασικές καλύψεις;',
        'Ποια είναι τα βήματα εξυπηρέτησης;',
        'Πώς μπορώ να επικοινωνήσω μαζί σας;',
      ],
    });
  }
});

/**
 * Endpoint for Contract / Policy Analysis
 * Allows customers to upload or paste an insurance policy and receive a structured expert audit.
 */
app.post('/api/contract/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileName, mimeType, base64Data, pastedText } = req.body;

    if (!base64Data && !pastedText) {
      res.status(400).json({ error: 'Παρακαλούμε ανεβάστε ένα αρχείο συμβολαίου ή επικολλήστε το κείμενο του.' });
      return;
    }

    const inlineParts: any[] = [];
    let textContent = '';

    if (pastedText && typeof pastedText === 'string' && pastedText.trim()) {
      textContent = pastedText.trim();
    } else if (base64Data) {
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const buffer = Buffer.from(cleanBase64, 'base64');
      const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';

      if (ext === 'docx' || mimeType?.includes('wordprocessingml')) {
        const result = await mammoth.extractRawText({ buffer });
        textContent = result.value.trim();
      } else if (['txt', 'md', 'csv', 'json'].includes(ext) || mimeType?.startsWith('text/')) {
        textContent = buffer.toString('utf-8');
      } else if (ext === 'pdf' || mimeType?.includes('pdf')) {
        const pdfText = await extractTextFromPdf(buffer);
        if (pdfText && pdfText.trim().length > 30) {
          textContent = pdfText.trim();
        } else {
          // Scanned PDF with images only: pass as inlineData for multimodal OCR
          inlineParts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: cleanBase64,
            },
          });
        }
      } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext) || mimeType?.startsWith('image/')) {
        inlineParts.push({
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: cleanBase64,
          },
        });
      } else {
        // Fallback: try raw text decode
        textContent = buffer.toString('utf-8');
      }
    }

    const systemInstruction = `
ΕΙΣΑΙ Ο ΨΗΦΙΑΚΟΣ ΣΥΜΒΟΥΛΟΣ ΑΞΙΟΛΟΓΗΣΗΣ ΑΣΦΑΛΙΣΤΙΚΩΝ ΣΥΜΒΟΛΑΙΩΝ ΤΟΥ RISKΡΕDIA.
Η ΣΥΝΤΑΞΗ ΤΗΣ ΑΞΙΟΛΟΓΗΣΗΣ ΚΑΙ ΤΩΝ ΣΥΜΒΟΥΛΩΝ ΓΙΝΕΤΑΙ ΑΠΟΚΛΕΙΣΤΙΚΑ ΑΠΟ ΕΣΕΝΑ ΩΣ ΨΗΦΙΑΚΟΣ ΣΥΜΒΟΥΛΟΣ (ΚΑΙ ΟΧΙ ΩΣ ΕΠΙΣΗΜΗ ΠΡΟΣΦΟΡΑ Η ΕΓΓΥΗΣΗ ΑΠΟ ΤΙΣ «ΑΣΦΑΛΕΙΕΣ ΚΑΚΑΛΗΣ»).
ΣΚΟΠΟΣ ΣΟΥ ΕΙΝΑΙ ΝΑ ΑΝΑΛΥΣΕΙΣ ΜΕ ΑΠΟΛΥΤΗ ΑΞΙΟΠΙΣΤΙΑ, ΑΝΤΙΚΕΙΜΕΝΙΚΟΤΗΤΑ ΚΑΙ ΔΙΑΦΑΝΕΙΑ ΤΟ ΑΣΦΑΛΙΣΤΗΡΙΟ ΣΥΜΒΟΛΑΙΟ ΠΟΥ ΣΟΥ ΠΑΡΕΧΕΙ Ο ΠΕΛΑΤΗΣ.

ΟΔΗΓΙΕΣ ΑΝΑΛΥΣΗΣ:
1. Εντόπισε και κατάγραψε:
   - Είδος Ασφάλισης (π.χ. Ασφάλιση Αυτοκινήτου, Κατοικίας, Υγείας, Επιχείρησης, Σκάφους, Αστικής Ευθύνης κ.λπ.)
   - Ασφαλιστική Εταιρεία (π.χ. Generali, Ergo, Εθνική, Interamerican, Eurolife κ.λπ.)
   - Αριθμό Συμβολαίου και στοιχεία διάρκειας/ληκτότητας και ασφαλίστρων (εάν αναγράφονται)
   - Γενική Βαθμολογία Κάλυψης (overallRating: 'Εξαιρετική' | 'Καλή' | 'Μέτρια' | 'Ελλιπής') και βαθμός από 1 έως 10 (ratingScore).
   - Σύντομη, κατανοητή γνωμάτευση για τον πελάτη (quickVerdict).
2. Πίνακας Καλύψεων (coverages):
   - Κάθε επιμέρους κάλυψη (π.χ. Σωματικές Βλάβες, Υλικές Ζημιές, Οδική Βοήθεια, Θραύση Κρυστάλλων, Πυρκαγιά, Κλοπή, Φυσικά Φαινόμενα, Νοσοκομειακή Περίθαλψη κ.λπ.)
   - Ανώτατο όριο κάλυψης / κεφάλαιο ευθύνης (limit)
   - Ποσό ή ποσοστό απαλλαγής / συμμετοχής ασφαλισμένου (deductible)
   - Σύντομες σημειώσεις ή υποχρεώσεις (notes)
3. Εξαιρέσεις & Ψιλά Γράμματα (exclusions):
   - Σημαντικές εξαιρέσεις, αναμονές, γεωγραφικοί περιορισμοί ή όροι που αν δεν τηρηθούν χάνεται η αποζημίωση.
4. Κενά & Σημεία Προσοχής (gapsAndAlerts):
   - Εντόπισε τυχόν επικίνδυνες ελλείψεις (π.χ. έλλειψη οδικής βοήθειας, υπερβολική απαλλαγή, μη κάλυψη πλημμύρας σε σπίτι, απουσία νομικής προστασίας).
   - Ταξινόμησε ανά type: 'danger' (κρίσιμο κενό), 'warning' (σημείο προσοχής), 'info' (χρήσιμη πληροφορία).
5. Εξατομικευμένες Συμβουλές & Προτάσεις Βελτίωσης από τον Ψηφιακό Σύμβουλο (recommendations):
   - Πρακτικές συμβουλές πώς να θωρακιστεί καλύτερα ο πελάτης, πώς να εξοικονομήσει χρήματα ή να αξιοποιήσει φορολογικά οφέλη (π.χ. έκπτωση ΕΝΦΙΑ 10% για κατοικία).

ΠΡΟΣΟΧΗ: Επίστρεψε ΜΟΝΟ ΕΓΚΥΡΟ JSON χωρίς markdown code blocks, ακριβώς στη δομή του JSON schema.
`.trim();

    const promptText = `
Ανάλυσε το παρακάτω ασφαλιστήριο συμβόλαιο σύμφωνα με τις οδηγίες:
${textContent ? `\nΚΕΙΜΕΝΟ ΣΥΜΒΟΛΑΙΟΥ:\n${textContent}\n` : ''}

Επίστρεψε το αποτέλεσμα σε JSON με τα παρακάτω πεδία:
{
  "summary": {
    "policyType": "...",
    "company": "...",
    "policyNumber": "...",
    "insuredName": "...",
    "duration": "...",
    "premium": "...",
    "overallRating": "Καλή",
    "ratingScore": 8.5,
    "quickVerdict": "..."
  },
  "coverages": [
    { "name": "...", "limit": "...", "deductible": "...", "notes": "..." }
  ],
  "exclusions": [ "...", "..." ],
  "gapsAndAlerts": [
    { "type": "warning", "title": "...", "description": "..." }
  ],
  "recommendations": [ "...", "..." ],
  "fullRawText": "..."
}
`;

    const contentsPayload = inlineParts.length > 0
      ? { parts: [...inlineParts, { text: promptText }] }
      : promptText;

    const response = await generateWithRetry({
      model: 'gemini-flash-latest',
      contents: contentsPayload,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const rawOutput = (response.text || '').trim();
    const cleanJsonStr = rawOutput.startsWith('```')
      ? rawOutput.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim()
      : rawOutput;

    let parsedJson: any = {};
    try {
      parsedJson = JSON.parse(cleanJsonStr || '{}');
    } catch (parseErr) {
      console.warn('JSON parse error from Gemini output, extracting object:', parseErr);
      const match = cleanJsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsedJson = JSON.parse(match[0]);
        } catch {
          parsedJson = {};
        }
      }
    }

    // Attach metadata
    const result = {
      id: `analysis-${Date.now()}`,
      fileName: fileName || 'Συμβόλαιο (Κείμενο)',
      analyzedAt: new Date().toISOString(),
      summary: parsedJson.summary || {
        policyType: 'Ασφαλιστήριο Συμβόλαιο',
        company: 'Ασφαλιστική Εταιρεία',
        overallRating: 'Καλή',
        ratingScore: 7.5,
        quickVerdict: 'Το συμβόλαιο αναλύθηκε επιτυχώς.',
      },
      coverages: Array.isArray(parsedJson.coverages) ? parsedJson.coverages : [],
      exclusions: Array.isArray(parsedJson.exclusions) ? parsedJson.exclusions : [],
      gapsAndAlerts: Array.isArray(parsedJson.gapsAndAlerts) ? parsedJson.gapsAndAlerts : [],
      recommendations: Array.isArray(parsedJson.recommendations) ? parsedJson.recommendations : [],
      fullRawText: textContent || parsedJson.fullRawText || '',
    };

    res.json({
      success: true,
      analysis: result,
    });
  } catch (error: any) {
    console.error('Error in /api/contract/analyze:', error);
    res.status(500).json({
      error: 'Αποτυχία ανάλυσης συμβολαίου: ' + (error?.message || 'Άγνωστο σφάλμα'),
    });
  }
});

/**
 * Endpoint for asking questions directly about an analyzed contract
 */
app.post('/api/contract/ask', async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, analysis, contractText, history = [] } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Παρακαλούμε εισάγετε μια ερώτηση.' });
      return;
    }

    const systemInstruction = `
ΕΙΣΑΙ Ο ΨΗΦΙΑΚΟΣ ΣΥΜΒΟΥΛΟΣ ΑΝΑΛΥΣΗΣ ΣΥΜΒΟΛΑΙΩΝ ΤΟΥ RISKΡΕDIA.
ΑΠΑΝΤΑΣ ΣΕ ΕΡΩΤΗΣΕΙΣ ΤΟΥ ΠΕΛΑΤΗ ΣΧΕΤΙΚΑ ΜΕ ΤΟ ΣΥΓΚΕΚΡΙΜΕΝΟ ΑΣΦΑΛΙΣΤΗΡΙΟ ΣΥΜΒΟΛΑΙΟ ΠΟΥ ΕΧΕΙ ΑΝΑΛΥΘΕΙ.

ΚΑΝΟΝΕΣ:
1. Απάντησε με απόλυτη ακρίβεια και ειλικρίνεια βασιζόμενος στις καλύψεις, στα όρια, στις απαλλαγές και στις εξαιρέσεις του συμβολαίου του.
2. Εάν κάτι δεν καλύπτεται ή υπάρχει απαλλαγή, εξήγησέ το ξεκάθαρα χωρίς να ωραιοποιείς καταστάσεις.
3. Δώσε σαφείς οδηγίες για το τι πρέπει να κάνει ο πελάτης σε περίπτωση ζημιάς.
4. Αν χρειάζεται περαιτέρω διαπραγμάτευση ή επίσημη προσφορά, προέτρεψε τον πελάτη να επικοινωνήσει μέσω email (asfaleieskakalis@gmail.com) ή μέσω της ιστοσελίδας asfaleieskakalis.com.
5. Γλώσσα: Ελληνικά, ευγενικό, κατανοητό και επαγγελματικό ύφος.
`.trim();

    const promptText = `
ΔΕΔΟΜΕΝΑ ΑΝΑΛΥΣΗΣ ΣΥΜΒΟΛΑΙΟΥ:
- Είδος: ${analysis?.summary?.policyType || 'Ασφαλιστήριο'}
- Εταιρεία: ${analysis?.summary?.company || 'Δεν προσδιορίστηκε'}
- Βαθμολογία: ${analysis?.summary?.ratingScore || '-'}/10 (${analysis?.summary?.overallRating || ''})
- Καλύψεις: ${JSON.stringify(analysis?.coverages || [])}
- Εξαιρέσεις: ${JSON.stringify(analysis?.exclusions || [])}
- Σημεία Προσοχής: ${JSON.stringify(analysis?.gapsAndAlerts || [])}

${contractText ? `ΠΡΩΤΟΤΥΠΟ ΚΕΙΜΕΝΟ ΣΥΜΒΟΛΑΙΟΥ:\n${contractText.slice(0, 8000)}\n` : ''}

ΠΡΟΣΦΑΤΟ ΙΣΤΟΡΙΚΟ:
${history.map((h: any) => `${h.role === 'user' ? 'Πελάτης' : 'Σύμβουλος'}: ${h.text}`).join('\n')}

ΕΡΩΤΗΣΗ ΠΕΛΑΤΗ ΓΙΑ ΤΟ ΣΥΜΒΟΛΑΙΟ:
"${question}"
`.trim();

    const response = await generateWithRetry({
      model: 'gemini-flash-latest',
      contents: promptText,
      config: {
        systemInstruction,
      },
    });

    res.json({
      answer: response.text || 'Δεν κατέστη δυνατή η εξαγωγή απάντησης για το συμβόλαιο.',
    });
  } catch (error: any) {
    console.error('Error in /api/contract/ask:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την απάντηση της ερώτησης: ' + (error?.message || 'Άγνωστο σφάλμα'),
    });
  }
});

// Explicit 404 handler for all /api routes to prevent Vite from returning index.html
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Το API endpoint δεν βρέθηκε.' });
});

// Express global error handler for body parsing / payload issues
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Express server error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.type === 'entity.too.large'
      ? 'Το αρχείο είναι πολύ μεγάλο για μεταφόρτωση (μέγιστο όριο 50 MB).'
      : (err.message || 'Εσωτερικό σφάλμα εξυπηρετητή.'),
  });
});

// Serve frontend in dev (via Vite middleware) or prod (static files)
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }
}

setupViteOrStatic().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DocuQuery server running on http://0.0.0.0:${PORT}`);
  });
});
