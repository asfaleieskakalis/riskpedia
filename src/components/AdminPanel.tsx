import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCheck,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Settings,
  Sparkles,
  RefreshCw,
  Search,
  Plus,
  KeyRound,
  RotateCcw,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { DocumentItem, AppSettings, DriveSyncConfig, AnalyticsEvent } from '../types';
import { processUploadedFile, formatFileSize, formatGreekDate } from '../utils/fileParser';
import { INITIAL_DOCUMENTS, DEFAULT_SETTINGS } from '../data/initialDocs';
import { GoogleDriveSync } from './GoogleDriveSync';
import { UsageAnalytics } from './UsageAnalytics';
import { TrendingUp } from 'lucide-react';

interface AdminPanelProps {
  documents: DocumentItem[];
  settings: AppSettings;
  onUpdateDocuments: (docs: DocumentItem[]) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onPreviewDocument: (doc: DocumentItem) => void;
  syncConfig: DriveSyncConfig | null;
  onUpdateSyncConfig: (config: DriveSyncConfig | null) => void;
  analyticsEvents: AnalyticsEvent[];
  onRefreshAnalytics: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  documents,
  settings,
  onUpdateDocuments,
  onUpdateSettings,
  onPreviewDocument,
  syncConfig,
  onUpdateSyncConfig,
  analyticsEvents,
  onRefreshAnalytics,
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'drive' | 'analytics' | 'settings'>('documents');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Settings draft state
  const [agencyName, setAgencyName] = useState(settings.agencyName);
  const [subtitle, setSubtitle] = useState(settings.subtitle);
  const [welcomeMessage, setWelcomeMessage] = useState(settings.welcomeMessage);
  const [adminPin, setAdminPin] = useState(settings.adminPin);
  const [quickQuestions, setQuickQuestions] = useState<string[]>([...settings.quickQuestions]);
  const [newQuestionInput, setNewQuestionInput] = useState('');
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFilesSelected(files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await handleFilesSelected(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFilesSelected = async (files: File[]) => {
    setIsUploading(true);
    setUploadMessage(null);
    try {
      const newDocs: DocumentItem[] = [];
      for (const file of files) {
        const item = await processUploadedFile(file);
        newDocs.push(item);
      }
      onUpdateDocuments([...newDocs, ...documents]);
      setUploadMessage({
        type: 'success',
        text: `Προστέθηκαν επιτυχώς ${files.length} αρχείο/α στη βάση γνώσης.`,
      });
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: 'Σφάλμα κατά την επεξεργασία των αρχείων: ' + (err?.message || 'Άγνωστο σφάλμα'),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleDocActive = (id: string) => {
    const updated = documents.map((d) => (d.id === id ? { ...d, isActive: !d.isActive } : d));
    onUpdateDocuments(updated);
  };

  const handleDeleteDoc = (id: string) => {
    if (window.confirm('Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτό το έγγραφο από τη βάση γνώσης;')) {
      const updated = documents.filter((d) => d.id !== id);
      onUpdateDocuments(updated);
    }
  };

  const handleToggleAll = (active: boolean) => {
    const updated = documents.map((d) => ({ ...d, isActive: active }));
    onUpdateDocuments(updated);
  };

  const handleResetSampleDocs = () => {
    if (window.confirm('Επαναφορά των αρχικών υποδειγματικών εγγράφων; Θα αντικατασταθούν τα τρέχοντα έγγραφα.')) {
      onUpdateDocuments(INITIAL_DOCUMENTS);
      onUpdateSettings(DEFAULT_SETTINGS);
      setAgencyName(DEFAULT_SETTINGS.agencyName);
      setSubtitle(DEFAULT_SETTINGS.subtitle);
      setWelcomeMessage(DEFAULT_SETTINGS.welcomeMessage);
      setAdminPin(DEFAULT_SETTINGS.adminPin);
      setQuickQuestions([...DEFAULT_SETTINGS.quickQuestions]);
      setUploadMessage({
        type: 'success',
        text: 'Τα αρχικά έγγραφα και ρυθμίσεις επανήλθαν.',
      });
    }
  };

  const handleSaveSettings = () => {
    const updated: AppSettings = {
      agencyName: agencyName.trim() || DEFAULT_SETTINGS.agencyName,
      subtitle: subtitle.trim() || DEFAULT_SETTINGS.subtitle,
      welcomeMessage: welcomeMessage.trim() || DEFAULT_SETTINGS.welcomeMessage,
      adminPin: adminPin.trim() || '1234',
      quickQuestions: quickQuestions.filter((q) => q.trim().length > 0),
    };
    onUpdateSettings(updated);
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 2500);
  };

  const handleAddQuestion = () => {
    const text = newQuestionInput.trim();
    if (!text) return;
    setQuickQuestions([...quickQuestions, text]);
    setNewQuestionInput('');
  };

  const handleRemoveQuestion = (index: number) => {
    setQuickQuestions(quickQuestions.filter((_, i) => i !== index));
  };

  const handleGenerateQuestionsWithAI = async () => {
    setIsGeneratingSuggestions(true);
    try {
      const res = await fetch('/api/documents/suggest-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setQuickQuestions(data.suggestions);
        }
      }
    } catch (err) {
      console.error('Error generating suggestions:', err);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Filter documents
  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = documents.filter((d) => d.isActive).length;
  const totalCharacters = documents.reduce((sum, d) => sum + d.charCount, 0);

  const renderFileIcon = (type: DocumentItem['type']) => {
    switch (type) {
      case 'xlsx':
        return <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'image':
        return <FileImage className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'pdf':
        return <FileCheck className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Top Banner / KPIs */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex h-12 items-center justify-center rounded-xl bg-white p-1.5 border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
            <img
              src="/assets/aistudio/logo3_c604fd8a.jpg"
              alt="ΑΣΦΑΛΕΙΕΣ ΚΑΚΑΛΗΣ"
              className="h-9 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Πίνακας Διαχείρισης & Γνωσιακής Βάσης
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              RiskPedia By Asfaleies Kakalis • Τα έγγραφα παραμένουν αυστηρά εσωτερικά και προστατευμένα.
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 self-start">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'documents'
                ? 'bg-white text-[#122544] shadow-xs dark:bg-[#122544] dark:text-white'
                : 'text-[#415069] hover:text-[#0b1424] dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Έγγραφα ({documents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'drive'
                ? 'bg-white text-[#008361] shadow-xs dark:bg-[#122544] dark:text-[#24d99a]'
                : 'text-[#415069] hover:text-[#0b1424] dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Google Drive Path {syncConfig ? '✓' : ''}</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'analytics'
                ? 'bg-white text-[#008361] shadow-xs dark:bg-[#122544] dark:text-[#24d99a]'
                : 'text-[#415069] hover:text-[#0b1424] dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-[#008361] dark:text-[#24d99a]" />
            <span>Στατιστικά Χρήσης</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'settings'
                ? 'bg-white text-[#122544] shadow-xs dark:bg-[#122544] dark:text-white'
                : 'text-[#415069] hover:text-[#0b1424] dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Ρυθμίσεις & Προτροπές</span>
          </button>
        </div>
      </div>

      {activeTab === 'documents' ? (
        <div className="space-y-6">
          {/* KPI Cards Strip */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-500 dark:text-slate-400">Σύνολο Αρχείων</span>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {documents.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-500 dark:text-slate-400">Ενεργά για Αναζήτηση</span>
              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                {activeCount}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-500 dark:text-slate-400">Ευρετηριασμένο Κείμενο</span>
              <p className="mt-1 text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums">
                {totalCharacters.toLocaleString('el-GR')} <span className="text-xs font-normal text-slate-400">χαρ.</span>
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-500 dark:text-slate-400">Τύποι Αρχείων</span>
              <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                PDF · Word · Excel · TXT · Εικόνες
              </p>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50/60 dark:border-blue-400 dark:bg-blue-950/30'
                : 'border-slate-300/80 bg-white hover:border-blue-400 hover:bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg,.webp"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-3">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Σύρετε και αφήστε νέα αρχεία εδώ ή κάντε κλικ για επιλογή
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Υποστηρίζονται έγγραφα <strong>PDF</strong>, <strong>Word (.docx)</strong>, <strong>Excel (.xlsx, .csv)</strong>, <strong>αρχεία κειμένου (.txt)</strong> και <strong>εικόνες</strong> (PNG, JPG).
            </p>
            {isUploading && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Ανάλυση και εξαγωγή περιεχομένου...</span>
              </div>
            )}
          </div>

          {/* Feedback banner */}
          {uploadMessage && (
            <div
              className={`rounded-xl p-3.5 text-xs flex items-center justify-between ${
                uploadMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              <span>{uploadMessage.text}</span>
              <button
                onClick={() => setUploadMessage(null)}
                className="font-bold underline text-[11px] ml-2"
              >
                Κλείσιμο
              </button>
            </div>
          )}

          {/* Documents Table Section */}
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            {/* Table toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Αναζήτηση στα αρχεία..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => handleToggleAll(true)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Ενεργοποίηση Όλων
                </button>
                <button
                  onClick={() => handleToggleAll(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Απενεργοποίηση Όλων
                </button>
                <button
                  onClick={handleResetSampleDocs}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Επαναφορά αρχικών υποδειγματικών εγγράφων"
                >
                  Επαναφορά Υποδειγμάτων
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Όνομα Εγγράφου</th>
                    <th className="px-4 py-3">Τύπος & Μέγεθος</th>
                    <th className="px-4 py-3">Εξαχθέντες Χαρακτήρες</th>
                    <th className="px-4 py-3">Ημερομηνία</th>
                    <th className="px-4 py-3 text-center">Κατάσταση</th>
                    <th className="px-4 py-3 text-right">Ενέργειες</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Δεν βρέθηκαν έγγραφα.
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                          <div className="flex items-center gap-2">
                            {renderFileIcon(doc.type)}
                            <span className="truncate" title={doc.name}>
                              {doc.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {/* Zero-pill metadata */}
                          <span>{doc.type.toUpperCase()}</span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span className="tabular-nums">{formatFileSize(doc.size)}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 tabular-nums">
                          {doc.charCount.toLocaleString('el-GR')}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatGreekDate(doc.uploadedAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleDocActive(doc.id)}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                              doc.isActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {doc.isActive ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Ενεργό</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" />
                                <span>Ανενεργό</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onPreviewDocument(doc)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                              title="Προεπισκόπηση περιεχομένου"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                              title="Διαγραφή εγγράφου"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'drive' ? (
        <GoogleDriveSync
          existingDocuments={documents}
          onDocumentsSynced={onUpdateDocuments}
          syncConfig={syncConfig}
          onUpdateSyncConfig={onUpdateSyncConfig}
        />
      ) : activeTab === 'analytics' ? (
        <UsageAnalytics
          analyticsEvents={analyticsEvents}
          onRefreshAnalytics={onRefreshAnalytics}
        />
      ) : (
        /* Settings Tab */
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Ρυθμίσεις Εμφάνισης & Προτροπών Πελάτη
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Προσαρμόστε τα στοιχεία της επιχείρησης, το μήνυμα υποδοχής και τον κωδικό πρόσβασης.
              </p>
            </div>
            {settingsSavedToast && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg animate-in fade-in">
                <Check className="h-3.5 w-3.5" />
                Αποθηκεύτηκαν!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Όνομα Επιχείρησης / Γραφείου
              </label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Υπότιτλος Εξυπηρέτησης
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Μήνυμα Καλωσορίσματος στον Πελάτη
            </label>
            <textarea
              rows={3}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
            />
          </div>

          {/* Quick questions list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Προτεινόμενες Ερωτήσεις Πελάτη (Quick Starters)
              </label>
              <button
                onClick={handleGenerateQuestionsWithAI}
                disabled={isGeneratingSuggestions || activeCount === 0}
                className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>
                  {isGeneratingSuggestions ? 'Παραγωγή...' : 'Αυτόματη παραγωγή με AI'}
                </span>
              </button>
            </div>

            <div className="space-y-2">
              {quickQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <span className="flex-1 text-xs text-slate-800 dark:text-slate-200">{q}</span>
                  <button
                    onClick={() => handleRemoveQuestion(idx)}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    title="Αφαίρεση"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newQuestionInput}
                  onChange={(e) => setNewQuestionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddQuestion();
                    }
                  }}
                  placeholder="Προσθέστε νέα ενδεικτική ερώτηση..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  disabled={!newQuestionInput.trim()}
                  className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Προσθήκη</span>
                </button>
              </div>
            </div>
          </div>

          {/* Admin PIN */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Κωδικός PIN Διαχειριστή
            </label>
            <div className="flex items-center gap-3 max-w-xs">
              <input
                type="text"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                maxLength={8}
                className="w-32 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center font-mono text-sm tracking-widest text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="text-[11px] text-slate-500">
                Χρησιμοποιείται για να εισέρχεστε στη διαχείριση αρχείων.
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
            <button
              onClick={handleResetSampleDocs}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Επαναφορά αρχικών προεπιλογών</span>
            </button>

            <button
              onClick={handleSaveSettings}
              className="flex items-center gap-2 rounded-xl bg-[#008361] px-5 py-2 text-xs font-semibold text-white hover:bg-[#006e52] shadow-xs transition-colors"
            >
              <Check className="h-4 w-4" />
              <span>Αποθήκευση Ρυθμίσεων</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
