import React, { useState } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { formatFileSize, formatGreekDate } from '../utils/fileParser';

interface DocumentPreviewModalProps {
  document: DocumentItem | null;
  onClose: () => void;
  onToggleActive: (id: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  onClose,
  onToggleActive,
}) => {
  const [copied, setCopied] = useState(false);

  if (!document) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(document.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderIcon = () => {
    switch (document.type) {
      case 'xlsx':
        return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
      case 'image':
        return <FileImage className="h-5 w-5 text-purple-600" />;
      case 'pdf':
        return <FileCheck className="h-5 w-5 text-rose-600" />;
      default:
        return <FileText className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex h-full max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              {renderIcon()}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-md">
                {document.name}
              </h2>
              {/* Zero-pill metadata */}
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="uppercase font-mono">{document.type}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{formatFileSize(document.size)}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{document.charCount.toLocaleString('el-GR')} χαρακτήρες</span>
                <span aria-hidden="true">·</span>
                <span>{formatGreekDate(document.uploadedAt)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {document.type === 'image' && document.imageData ? (
            <div className="space-y-4">
              <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <img
                  src={document.imageData}
                  alt={document.name}
                  className="max-h-[350px] w-auto rounded-lg object-contain shadow-xs"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Οπτική Αναγνώριση
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Το αρχείο εικόνας αποστέλλεται αυτόματα στο μοντέλο Gemini Multimodal για οπτική αναγνώριση κειμένου (OCR) και ερμηνεία διαγραμμάτων κατά την υποβολή ερωτήσεων.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Εξαχθέν Περιεχόμενο Γνώσης
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Αντιγράφηκε' : 'Αντιγραφή'}</span>
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[50vh]">
                {document.content || 'Δεν βρέθηκε εξαγόμενο κείμενο.'}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <button
            onClick={() => onToggleActive(document.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              document.isActive
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {document.isActive ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Ενεργό στη Γνωσιακή Βάση</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-slate-400" />
                <span>Ανενεργό (Δεν χρησιμοποιείται)</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
          >
            Κλείσιμο
          </button>
        </div>
      </div>
    </div>
  );
};
