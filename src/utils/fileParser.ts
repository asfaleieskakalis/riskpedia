import { DocumentItem, DocumentType } from '../types';

/**
 * Converts a browser File into a base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Determine DocumentType from filename or mime
 */
export function detectDocumentType(file: File): DocumentType {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(extension) || file.type.startsWith('image/')) {
    return 'image';
  }
  if (extension === 'pdf' || file.type.includes('pdf')) {
    return 'pdf';
  }
  if (extension === 'docx' || extension === 'doc' || file.type.includes('wordprocessingml')) {
    return 'docx';
  }
  if (['xlsx', 'xls', 'csv'].includes(extension) || file.type.includes('spreadsheet') || file.type.includes('excel')) {
    return 'xlsx';
  }
  return 'txt';
}

/**
 * Process a user-uploaded file into a DocumentItem
 */
export async function processUploadedFile(file: File): Promise<DocumentItem> {
  const docType = detectDocumentType(file);
  const dataUrl = await fileToBase64(file);
  const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

  let extractedContent = '';
  let charCount = 0;

  if (docType === 'image') {
    extractedContent = `[Εικόνα/Οπτικό Έγγραφο: ${file.name}]`;
    charCount = Math.round(file.size / 10);
  } else if (docType === 'pdf') {
    // Send to parse endpoint or reserve for multimodal
    try {
      const response = await fetch('/api/documents/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          type: file.type,
          base64Data,
        }),
      });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        extractedContent = data.text || `[Επίσημο Έγγραφο PDF: ${file.name}]`;
        charCount = extractedContent.length || Math.round(file.size / 5);
      } else {
        extractedContent = `[Επίσημο Έγγραφο PDF: ${file.name}]`;
        charCount = Math.round(file.size / 5);
      }
    } catch {
      extractedContent = `[Επίσημο Έγγραφο PDF: ${file.name}]`;
      charCount = Math.round(file.size / 5);
    }
  } else {
    // DOCX, XLSX, TXT
    try {
      const response = await fetch('/api/documents/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          type: file.type,
          base64Data,
        }),
      });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        extractedContent = data.text || '';
        charCount = extractedContent.length;
      } else {
        extractedContent = `[Αρχείο: ${file.name}]`;
        charCount = extractedContent.length;
      }
    } catch {
      // Fallback for simple text files
      if (docType === 'txt') {
        extractedContent = atob(base64Data);
        charCount = extractedContent.length;
      } else {
        extractedContent = `[Αρχείο: ${file.name}]`;
        charCount = extractedContent.length;
      }
    }
  }

  const docItem: DocumentItem = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: file.name,
    type: docType,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    content: extractedContent,
    charCount: charCount || extractedContent.length,
    isActive: true,
    imageData: docType === 'image' ? dataUrl : undefined,
    pdfBase64: docType === 'pdf' ? base64Data : undefined,
  };

  return docItem;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatGreekDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
