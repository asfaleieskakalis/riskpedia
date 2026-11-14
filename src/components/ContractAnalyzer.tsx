import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Shield,
  ShieldAlert,
  Send,
  Sparkles,
  Mail,
  Printer,
  RotateCcw,
  Bot,
  User,
  ArrowRight,
  Lock,
  Layers,
  FileCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { PolicyAnalysisResult, PolicySummary, PolicyCoverage, PolicyAlert } from '../types';
import { SAMPLE_CONTRACTS, SampleContract } from '../data/sampleContracts';

interface ContractAnalyzerProps {
  onBackToChat?: () => void;
}

export const ContractAnalyzer: React.FC<ContractAnalyzerProps> = ({ onBackToChat }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<PolicyAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'coverages' | 'exclusions' | 'gaps' | 'recommendations'>('coverages');

  // Interactive Contract Q&A state
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const analysisSteps = [
    'Ανάγνωση όρων και στοιχείων συμβολαίου...',
    'Εντοπισμός καλύψεων, κεφαλαίων και απαλλαγών...',
    'Έλεγχος εξαιρέσεων και ψιλών γραμμάτων...',
    'Σύνταξη αξιολόγησης και συμβουλών από τον ψηφιακό σύμβουλο...',
  ];

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  };

  const handleSelectedFile = (selectedFile: File) => {
    setError(null);
    if (selectedFile.size > 25 * 1024 * 1024) {
      setError('Το αρχείο υπερβαίνει το μέγιστο επιτρεπτό όριο των 25 MB.');
      return;
    }
    setFile(selectedFile);
    setPastedText('');
  };

  const handleStartAnalysis = async (customText?: string, customName?: string) => {
    setError(null);
    setIsAnalyzing(true);
    setAnalysisStep(0);

    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => (prev < analysisSteps.length - 1 ? prev + 1 : prev));
    }, 1200);

    try {
      let payload: any = {};

      if (customText) {
        payload = {
          fileName: customName || 'Δείγμα Ασφαλιστηρίου.docx',
          pastedText: customText,
        };
      } else if (pastedText.trim()) {
        payload = {
          fileName: 'Κείμενο Συμβολαίου',
          pastedText: pastedText.trim(),
        };
      } else if (file) {
        // Fast-path: If it's a text-based file, read directly client-side to save bandwidth
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (['txt', 'md', 'csv', 'json'].includes(ext) || file.type.startsWith('text/')) {
          const rawText = await file.text();
          payload = {
            fileName: file.name,
            pastedText: rawText,
          };
        } else {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          });

          payload = {
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            base64Data,
          };
        }
      } else {
        throw new Error('Παρακαλούμε επιλέξτε αρχείο ή επικολλήστε κείμενο συμβολαίου.');
      }

      let res: Response = await fetch('/api/contract/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let contentType = res.headers.get('content-type') || '';

      // If the server was temporarily warming up (Nginx returned warmup HTML page), retry once after 1.5s
      if (!contentType.includes('application/json')) {
        console.warn('Initial response was non-JSON (server warming up), auto-retrying in 1.5s...');
        await new Promise((resolve) => setTimeout(resolve, 1500));
        res = await fetch('/api/contract/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        contentType = res.headers.get('content-type') || '';
      }

      if (!contentType.includes('application/json')) {
        const rawText = await res.text().catch(() => '');
        console.error('Non-JSON response from /api/contract/analyze:', res.status, rawText.slice(0, 200));
        if (res.status === 504 || res.status === 408) {
          throw new Error('Η ανάλυση καθυστέρησε στον διακομιστή (Timeout). Παρακαλούμε δοκιμάστε ξανά ή επικολλήστε το κείμενο.');
        }
        if (res.status === 413) {
          throw new Error('Το αρχείο είναι πολύ μεγάλο για μεταφόρτωση (μέγιστο 25 MB).');
        }
        throw new Error('Ο διακομιστής ήταν σε φάση αρχικοποίησης (Warmup). Παρακαλούμε πατήστε ξανά «Ξεκινήστε την Ανάλυση».');
      }

      const data = await res.json();
      if (!res.ok || !data.success || !data.analysis) {
        throw new Error(data.error || `Σφάλμα ανάλυσης (${res.status})`);
      }

      setAnalysisResult(data.analysis);
      setChatMessages([
        {
          id: 'welcome-chat',
          role: 'assistant',
          text: `Η ανάλυση του συμβολαίου σας ολοκληρώθηκε! Είμαι στη διάθεσή σας για οποιαδήποτε απορία έχετε σχετικά με τις καλύψεις, τις απαλλαγές ή τι θα συμβεί σε περίπτωση ζημιάς.`,
        },
      ]);
    } catch (err: any) {
      console.error('Contract analysis error:', err);
      setError(err?.message || 'Παρουσιάστηκε πρόβλημα κατά την ανάλυση του συμβολαίου.');
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  };

  const handleUseSample = (sample: SampleContract) => {
    setFile(null);
    setPastedText('');
    handleStartAnalysis(sample.text, sample.title);
  };

  const handleReset = () => {
    setFile(null);
    setPastedText('');
    setAnalysisResult(null);
    setChatMessages([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendChatQuestion = async (textToSend?: string) => {
    const q = (textToSend || chatInput).trim();
    if (!q || isAsking || !analysisResult) return;

    const userMsg = { id: `user-${Date.now()}`, role: 'user' as const, text: q };
    const newChat = [...chatMessages, userMsg];
    setChatMessages(newChat);
    setChatInput('');
    setIsAsking(true);

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      let res: Response = await fetch('/api/contract/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          analysis: analysisResult,
          contractText: analysisResult.fullRawText,
          history: newChat.slice(-6).map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      let contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        res = await fetch('/api/contract/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            analysis: analysisResult,
            contractText: analysisResult.fullRawText,
            history: newChat.slice(-6).map((m) => ({
              role: m.role,
              text: m.text,
            })),
          }),
        });
        contentType = res.headers.get('content-type') || '';
      }

      if (!contentType.includes('application/json')) {
        throw new Error(`Σφάλμα εξυπηρετητή (${res.status})`);
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Σφάλμα εξυπηρετητή (${res.status})`);
      }

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant' as const,
        text: data.answer || 'Δεν κατέστη δυνατή η λήψη απάντησης.',
      };

      setChatMessages([...newChat, assistantMsg]);
    } catch (err: any) {
      console.error('Contract ask error:', err);
      setChatMessages([
        ...newChat,
        {
          id: `err-${Date.now()}`,
          role: 'assistant' as const,
          text: 'Παρουσιάστηκε σφάλμα κατά την επεξεργασία της ερώτησης. Παρακαλούμε δοκιμάστε ξανά ή καλέστε απευθείας στο γραφείο μας.',
        },
      ]);
    } finally {
      setIsAsking(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'Εξαιρετική':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'Καλή':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'Μέτρια':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'Ελλιπής':
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      {/* Top Breadcrumb & Return to Chat */}
      <div className="mb-4 flex items-center justify-between">
        {onBackToChat && (
          <button
            onClick={onBackToChat}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#415069] hover:text-[#122544] dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <span>← Επιστροφή στην Εξυπηρέτηση Πελατών</span>
          </button>
        )}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#008361] dark:text-[#24d99a]">
          <Shield className="h-3.5 w-3.5" />
          <span>Ασφαλής Έλεγχος Συμβολαίου • Ψηφιακός Σύμβουλος RiskPedia</span>
        </div>
      </div>

      {!analysisResult ? (
        /* UPLOAD & START SCREEN */
        <div className="space-y-6">
          {/* Main Hero Card */}
          <div className="rounded-3xl border border-[#dadce0] bg-white p-6 sm:p-8 shadow-xs dark:border-[#1e355b] dark:bg-[#0f1d33] transition-colors">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#def4f0] px-3 py-1 text-xs font-semibold text-[#008361] dark:bg-[#008361]/20 dark:text-[#24d99a] mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Έξυπνος & Αξιόπιστος Έλεγχος Ασφαλιστηρίου</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#122544] dark:text-white">
                Ανάλυση Συμβολαίου & Εντοπισμός Κενών
              </h1>
              <p className="mt-2 text-sm text-[#415069] dark:text-slate-300 leading-relaxed">
                Ανεβάστε το ασφαλιστήριό σας (PDF, Word, Φωτογραφία ή Κείμενο) από οποιαδήποτε ασφαλιστική εταιρεία. Ο ψηφιακός μας ελεγκτής αποσαφηνίζει άμεσα τι πραγματικά καλύπτεται, ποιες είναι οι απαλλαγές, τα ψιλά γράμματα και πού υπάρχουν ευκαιρίες εξοικονόμησης.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Upload Box */}
            <div className="mt-6">
              {!showPasteArea ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                    file
                      ? 'border-[#008361] bg-[#def4f0]/30 dark:border-[#00b090] dark:bg-[#008361]/10'
                      : 'border-[#dadce0] hover:border-[#008361] bg-[#fbfaf8] hover:bg-[#def4f0]/20 dark:border-[#1e355b] dark:bg-[#122544]/40 dark:hover:border-[#00b090]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xs border border-[#dadce0] dark:border-[#1e355b] dark:bg-[#122544] text-[#008361] dark:text-[#24d99a] mb-3 group-hover:scale-105 transition-transform">
                    {file ? <FileCheck className="h-7 w-7 text-[#008361]" /> : <UploadCloud className="h-7 w-7" />}
                  </div>

                  {file ? (
                    <div>
                      <p className="text-sm font-bold text-[#122544] dark:text-white">
                        {file.name}
                      </p>
                      <p className="mt-1 text-xs text-[#415069] dark:text-slate-400">
                        Μέγεθος: {(file.size / 1024).toFixed(1)} KB • Έτοιμο για ανάλυση
                      </p>
                      <span className="mt-2 inline-block text-xs font-semibold text-[#008361] dark:text-[#24d99a] underline">
                        Κάντε κλικ για επιλογή άλλου αρχείου
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-[#122544] dark:text-white">
                        Σύρετε το συμβόλαιό σας εδώ ή κάντε κλικ για περιήγηση
                      </p>
                      <p className="mt-1 text-xs text-[#727586] dark:text-slate-400">
                        Υποστηρίζονται: PDF, Word (.docx), Φωτογραφίες/Εικόνες (JPG, PNG), TXT (έως 25 MB)
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#122544] dark:text-slate-200">
                    Επικολλήστε το κείμενο ή αποσπάσματα του ασφαλιστηρίου σας:
                  </label>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Επικολλήστε εδώ τους όρους, τον πίνακα καλύψεων ή το κείμενο του συμβολαίου σας..."
                    className="w-full rounded-2xl border border-[#dadce0] bg-white p-4 text-xs text-[#0b1424] placeholder-slate-400 focus:border-[#008361] focus:ring-2 focus:ring-[#008361]/20 focus:outline-none dark:border-[#1e355b] dark:bg-[#122544]/60 dark:text-white leading-relaxed font-mono"
                  />
                </div>
              )}

              {/* Mode switch & Analyze button */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasteArea(!showPasteArea);
                    setError(null);
                  }}
                  className="text-xs font-medium text-[#008361] hover:underline dark:text-[#24d99a]"
                >
                  {showPasteArea ? '← Επιστροφή σε ανέβασμα αρχείου' : '📝 Προτιμάτε να επικολλήσετε κείμενο;'}
                </button>

                <div className="flex items-center gap-3">
                  {(file || pastedText.trim()) && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="rounded-xl px-4 py-2.5 text-xs font-medium text-[#727586] hover:bg-[#f5f3ee] dark:hover:bg-[#122544] transition-colors"
                    >
                      Καθαρισμός
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleStartAnalysis()}
                    disabled={(!file && !pastedText.trim()) || isAnalyzing}
                    className="flex items-center gap-2 rounded-xl bg-[#008361] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#006e52] disabled:opacity-50 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Ξεκινήστε την Ανάλυση</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy Promise Strip */}
            <div className="mt-6 flex items-center gap-2 rounded-xl bg-[#f8f7f4] p-3 text-[11px] text-[#415069] dark:bg-[#122544]/40 dark:text-slate-400 border border-[#dadce0]/80 dark:border-[#1e355b]">
              <Lock className="h-4 w-4 text-[#008361] shrink-0" />
              <span>
                <strong>Απόλυτο Απόρρητο:</strong> Το συμβόλαιό σας υποβάλλεται σε κρυπτογραφημένη ανάλυση και δεν κοινοποιείται σε τρίτους ούτε αποθηκεύεται δημόσια.
              </span>
            </div>
          </div>

          {/* Sample Contracts Selector */}
          <div className="rounded-3xl border border-[#dadce0] bg-white p-6 shadow-xs dark:border-[#1e355b] dark:bg-[#0f1d33] transition-colors">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[#122544] dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#008361]" />
                <span>Δεν έχετε το συμβόλαιό σας πρόχειρο; Δοκιμάστε με ένα έτοιμο δείγμα:</span>
              </h3>
              <p className="mt-0.5 text-xs text-[#727586] dark:text-slate-400">
                Επιλέξτε ένα από τα ενδεικτικά ασφαλιστήρια για να δείτε πώς λειτουργεί η αξιόπιστη ανάλυση:
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {SAMPLE_CONTRACTS.map((sample) => (
                <div
                  key={sample.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#dadce0] bg-[#fbfaf8] p-4 dark:border-[#1e355b] dark:bg-[#122544]/30 hover:border-[#008361] transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-[#008361] font-semibold dark:text-[#24d99a]">
                      <span>{sample.category}</span>
                      <span className="text-[#727586] dark:text-slate-400 font-normal">{sample.company}</span>
                    </div>
                    <h4 className="mt-1.5 text-sm font-bold text-[#122544] dark:text-white">
                      {sample.title}
                    </h4>
                    <p className="mt-1 text-xs text-[#415069] dark:text-slate-300 leading-relaxed">
                      {sample.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUseSample(sample)}
                    disabled={isAnalyzing}
                    className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#122544] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1e355b] dark:bg-[#008361] dark:hover:bg-[#006e52] transition-colors shadow-2xs"
                  >
                    <span>Ανάλυση αυτού του Δείγματος</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ANALYSIS REPORT & INTERACTIVE Q&A SCREEN */
        <div className="space-y-6">
          {/* Executive Header Banner */}
          <div className="rounded-3xl border border-[#dadce0] bg-white p-6 sm:p-8 shadow-xs dark:border-[#1e355b] dark:bg-[#0f1d33] transition-colors">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-[#1e355b]">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-full bg-[#122544] text-white px-3 py-1 text-xs font-bold dark:bg-[#1e355b]">
                    {analysisResult.summary.policyType}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[#415069] dark:bg-slate-800 dark:text-slate-300">
                    Εταιρεία: {analysisResult.summary.company}
                  </span>
                  {analysisResult.summary.duration && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-[#415069] dark:bg-slate-800 dark:text-slate-300">
                      Διάρκεια: {analysisResult.summary.duration}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-extrabold text-[#122544] dark:text-white">
                  Αναφορά Ελέγχου: {analysisResult.fileName}
                </h2>
                <p className="mt-1 text-xs text-[#727586] dark:text-slate-400">
                  Ημερομηνία ανάλυσης: {new Date(analysisResult.analyzedAt).toLocaleDateString('el-GR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • Η αξιολόγηση συντάχθηκε από τον Ψηφιακό Σύμβουλο RiskPedia (όχι από την Ασφάλειες Κακαλής)
                </p>
              </div>

              {/* Rating Card */}
              <div className="flex items-center gap-4 bg-[#f8f7f4] p-4 rounded-2xl border border-[#dadce0] dark:bg-[#122544]/50 dark:border-[#1e355b] self-start lg:self-auto">
                <div className="text-center">
                  <div className="text-3xl font-black text-[#122544] dark:text-white tabular-nums">
                    {analysisResult.summary.ratingScore}
                    <span className="text-base font-normal text-slate-400">/10</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#727586] dark:text-slate-400">
                    Βαθμός Κάλυψης
                  </span>
                </div>
                <div className="border-l border-slate-200 dark:border-[#1e355b] pl-3">
                  <span className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-bold ${getRatingBadge(analysisResult.summary.overallRating)}`}>
                    {analysisResult.summary.overallRating}
                  </span>
                  {analysisResult.summary.premium && (
                    <span className="block mt-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Κόστος: {analysisResult.summary.premium}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Verdict */}
            <div className="mt-5 rounded-2xl bg-[#def4f0]/40 p-4 border border-[#008361]/20 dark:bg-[#008361]/10 dark:border-[#008361]/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#008361] dark:text-[#24d99a] mb-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Γνωμάτευση Ψηφιακού Συμβούλου</span>
              </h3>
              <p className="text-sm text-[#0b1424] dark:text-slate-200 leading-relaxed font-medium">
                {analysisResult.summary.quickVerdict}
              </p>
            </div>

            {/* Tab navigation */}
            <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-100 pb-3 dark:border-[#1e355b]">
              <button
                onClick={() => setActiveReportTab('coverages')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeReportTab === 'coverages'
                    ? 'bg-[#122544] text-white shadow-xs dark:bg-[#008361]'
                    : 'bg-[#f8f7f4] text-[#415069] hover:bg-slate-200 dark:bg-[#122544]/40 dark:text-slate-300'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Πίνακας Καλύψεων ({analysisResult.coverages.length})</span>
              </button>

              <button
                onClick={() => setActiveReportTab('exclusions')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeReportTab === 'exclusions'
                    ? 'bg-[#122544] text-white shadow-xs dark:bg-[#008361]'
                    : 'bg-[#f8f7f4] text-[#415069] hover:bg-slate-200 dark:bg-[#122544]/40 dark:text-slate-300'
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Εξαιρέσεις & Ψιλά Γράμματα ({analysisResult.exclusions.length})</span>
              </button>

              <button
                onClick={() => setActiveReportTab('gaps')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeReportTab === 'gaps'
                    ? 'bg-[#122544] text-white shadow-xs dark:bg-[#008361]'
                    : 'bg-[#f8f7f4] text-[#415069] hover:bg-slate-200 dark:bg-[#122544]/40 dark:text-slate-300'
                }`}
              >
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Σημεία Προσοχής & Κενά ({analysisResult.gapsAndAlerts.length})</span>
              </button>

              <button
                onClick={() => setActiveReportTab('recommendations')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeReportTab === 'recommendations'
                    ? 'bg-[#122544] text-white shadow-xs dark:bg-[#008361]'
                    : 'bg-[#f8f7f4] text-[#415069] hover:bg-slate-200 dark:bg-[#122544]/40 dark:text-slate-300'
                }`}
              >
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <span>Συμβουλές Ψηφιακού Συμβούλου ({analysisResult.recommendations.length})</span>
              </button>
            </div>

            {/* Tab content */}
            <div className="mt-5">
              {/* 1. Coverages Tab */}
              {activeReportTab === 'coverages' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#dadce0] bg-[#f8f7f4] dark:border-[#1e355b] dark:bg-[#122544]/50 text-[#122544] dark:text-white font-bold">
                        <th className="py-2.5 px-3">Κάλυψη</th>
                        <th className="py-2.5 px-3">Όριο / Κεφάλαιο Ευθύνης</th>
                        <th className="py-2.5 px-3">Απαλλαγή (Συμμετοχή σας)</th>
                        <th className="py-2.5 px-3">Σημειώσεις / Όροι</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1e355b]">
                      {analysisResult.coverages.map((cov, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-[#122544]/30 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-[#122544] dark:text-white">
                            {cov.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#008361] dark:text-[#24d99a]">
                            {cov.limit || 'Απεριόριστη / Ως ορίζεται'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block font-medium ${cov.deductible === '0 €' || cov.deductible.includes('Μηδενική') ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-amber-700 dark:text-amber-400'}`}>
                              {cov.deductible || '0 €'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#415069] dark:text-slate-300 leading-normal">
                            {cov.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 2. Exclusions Tab */}
              {activeReportTab === 'exclusions' && (
                <div className="space-y-3">
                  <p className="text-xs text-[#727586] dark:text-slate-400 mb-2">
                    Παρακάτω αναφέρονται οι περιπτώσεις όπου η ασφαλιστική εταιρεία ρητά δεν υποχρεούται σε αποζημίωση.
                  </p>
                  {analysisResult.exclusions.map((exc, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200"
                    >
                      <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{exc}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Gaps & Alerts Tab */}
              {activeReportTab === 'gaps' && (
                <div className="space-y-3">
                  {analysisResult.gapsAndAlerts.map((gap, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 rounded-2xl p-4 border text-xs leading-relaxed ${
                        gap.type === 'danger'
                          ? 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'
                          : gap.type === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
                          : 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200'
                      }`}
                    >
                      {gap.type === 'danger' ? (
                        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                      ) : gap.type === 'warning' ? (
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                      ) : (
                        <Info className="h-5 w-5 text-blue-600 shrink-0" />
                      )}
                      <div>
                        <strong className="block text-sm font-bold mb-0.5">{gap.title}</strong>
                        <p>{gap.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Recommendations Tab */}
              {activeReportTab === 'recommendations' && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-[#008361]/30 bg-[#def4f0]/30 p-4 dark:border-[#008361]/50 dark:bg-[#008361]/20 mb-3">
                    <h4 className="text-xs font-bold text-[#008361] dark:text-[#24d99a] uppercase tracking-wider mb-1">
                      Εξατομικευμένη Αξιολόγηση & Προτάσεις από τον Ψηφιακό Σύμβουλο
                    </h4>
                    <p className="text-xs text-[#122544] dark:text-slate-200">
                      Η σύνταξη της αξιολόγησης και των συμβουλών πραγματοποιείται αυτόματα από τον Ψηφιακό Σύμβουλο (και όχι από το γραφείο «Ασφάλειες Κακαλής»), με βάση τα στοιχεία του εγγράφου σας:
                    </p>
                  </div>

                  {analysisResult.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-xl border border-[#dadce0] bg-[#fbfaf8] p-3 text-xs text-[#0b1424] dark:border-[#1e355b] dark:bg-[#122544]/40 dark:text-slate-200"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#008361] text-white text-[11px] font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed font-medium">{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Contact & Print Actions */}
            <div className="mt-8 pt-5 border-t border-slate-100 dark:border-[#1e355b] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl border border-[#dadce0] bg-white px-3.5 py-2 text-xs font-semibold text-[#122544] hover:bg-[#f5f3ee] dark:border-[#1e355b] dark:bg-[#122544] dark:text-white dark:hover:bg-[#1e355b] transition-colors shadow-2xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Εκτύπωση / Αποθήκευση PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-xl border border-[#dadce0] bg-white px-3.5 py-2 text-xs font-semibold text-[#727586] hover:bg-[#f5f3ee] dark:border-[#1e355b] dark:bg-[#122544] dark:text-slate-300 dark:hover:bg-[#1e355b] transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Ανάλυση άλλου συμβολαίου</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="mailto:asfaleieskakalis@gmail.com"
                  className="flex items-center gap-1.5 rounded-xl bg-[#008361] px-4 py-2 text-xs font-bold text-white hover:bg-[#006e52] shadow-xs transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Επικοινωνία via Email (asfaleieskakalis@gmail.com)</span>
                </a>
              </div>
            </div>
          </div>

          {/* Interactive Contract Q&A Chat */}
          <div className="rounded-3xl border border-[#dadce0] bg-white p-6 sm:p-8 shadow-xs dark:border-[#1e355b] dark:bg-[#0f1d33] transition-colors">
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#def4f0] px-3 py-1 text-xs font-bold text-[#008361] dark:bg-[#008361]/20 dark:text-[#24d99a] mb-2">
                <Bot className="h-3.5 w-3.5" />
                <span>Διαδραστικές Ερωτήσεις για το Συμβόλαιό σας</span>
              </div>
              <h3 className="text-xl font-bold text-[#122544] dark:text-white">
                Ρωτήστε οτιδήποτε σχετικά με το αναλυμένο ασφαλιστήριο
              </h3>
              <p className="mt-1 text-xs text-[#727586] dark:text-slate-400">
                Μπορείτε να ρωτήσετε π.χ. «Τι γίνεται αν τρακάρω με δική μου υπαιτιότητα;», «Πόση είναι η απαλλαγή μου σε περίπτωση χαλαζιού;» ή «Πώς μπορώ να πάρω έκπτωση ΕΝΦΙΑ;».
              </p>
            </div>

            {/* Quick Prompt Starters */}
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                'Ποιες είναι οι σημαντικότερες εξαιρέσεις που πρέπει να προσέχω;',
                'Ποια είναι η δική μου συμμετοχή (απαλλαγή) σε περίπτωση ζημιάς;',
                'Πώς μπορώ να βελτιώσω το συμβόλαιο αυτό και να εξοικονομήσω χρήματα;',
              ].map((starter, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => handleSendChatQuestion(starter)}
                  disabled={isAsking}
                  className="rounded-lg border border-[#dadce0] bg-[#f8f7f4] px-3 py-1.5 text-left text-xs font-medium text-[#122544] hover:border-[#008361] hover:bg-[#def4f0]/40 hover:text-[#008361] dark:border-[#1e355b] dark:bg-[#122544]/60 dark:text-slate-300 dark:hover:border-[#00b090] transition-colors disabled:opacity-50"
                >
                  {starter}
                </button>
              ))}
            </div>

            {/* Chat Stream */}
            <div className="max-h-96 overflow-y-auto space-y-3 p-3 rounded-2xl bg-[#f8f7f4]/80 dark:bg-[#0b1424]/40 border border-[#dadce0]/80 dark:border-[#1e355b]">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#008361] text-white text-xs">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      msg.role === 'user'
                        ? 'bg-[#122544] text-white rounded-tr-xs'
                        : 'bg-white text-[#0b1424] border border-[#dadce0] dark:bg-[#122544] dark:text-slate-100 dark:border-[#1e355b] rounded-tl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#122544]/20 text-[#122544] dark:bg-[#1e355b] dark:text-slate-200 text-xs">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {isAsking && (
                <div className="flex gap-2.5 justify-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#008361] text-white text-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-xs bg-white border border-[#dadce0] px-4 py-2 text-xs text-[#727586] dark:border-[#1e355b] dark:bg-[#122544] dark:text-slate-300 flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#008361] animate-bounce [animation-delay:-0.3s]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-[#008361] animate-bounce [animation-delay:-0.15s]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-[#008361] animate-bounce" />
                    </div>
                    <span>Έλεγχος των όρων του συμβολαίου...</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatQuestion();
              }}
              className="mt-3 flex items-center gap-2 rounded-2xl border border-[#dadce0] bg-white p-2 dark:border-[#1e355b] dark:bg-[#0f1d33] focus-within:border-[#008361] focus-within:ring-2 focus-within:ring-[#008361]/20 transition-all shadow-xs"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Κάντε μια ερώτηση για το συμβόλαιό σας..."
                disabled={isAsking}
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-[#0b1424] placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isAsking}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#008361] text-white hover:bg-[#006e52] disabled:opacity-40 transition-colors shadow-xs"
                title="Αποστολή ερώτησης"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Analyzing Loading Modal Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-[#dadce0] bg-white p-8 text-center shadow-2xl dark:border-[#1e355b] dark:bg-[#0f1d33]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#def4f0] text-[#008361] dark:bg-[#008361]/20 dark:text-[#24d99a] mb-4">
              <Sparkles className="h-8 w-8 animate-spin [animation-duration:3s]" />
            </div>

            <h3 className="text-lg font-bold text-[#122544] dark:text-white">
              Ανάλυση Συμβολαίου σε Εξέλιξη...
            </h3>
            <p className="mt-1 text-xs text-[#727586] dark:text-slate-400">
              Ο ψηφιακός σύμβουλος εξετάζει λεπτομερώς κάθε όρο και κάλυψη.
            </p>

            <div className="mt-6 space-y-2.5 text-left text-xs">
              {analysisSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2.5 transition-opacity ${
                    idx === analysisStep
                      ? 'text-[#008361] dark:text-[#24d99a] font-bold'
                      : idx < analysisStep
                      ? 'text-[#122544] dark:text-slate-300 opacity-80'
                      : 'text-slate-400 opacity-40'
                  }`}
                >
                  {idx < analysisStep ? (
                    <CheckCircle2 className="h-4 w-4 text-[#008361] shrink-0" />
                  ) : idx === analysisStep ? (
                    <div className="h-2 w-2 rounded-full bg-[#008361] animate-ping shrink-0 ml-1 mr-1" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0 ml-1 mr-1" />
                  )}
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
