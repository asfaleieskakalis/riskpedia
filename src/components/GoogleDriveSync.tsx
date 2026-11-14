import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Folder,
  FolderOpen,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  FileCheck,
  FileImage,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Link,
  ShieldCheck,
  Search,
} from 'lucide-react';
import {
  signInWithGoogle,
  logoutGoogle,
  initDriveAuth,
  listDriveFolders,
  listFilesInFolder,
  syncDriveFileToDocument,
  getDriveFolderDetails,
  extractFolderId,
  findFolderByHierarchy,
} from '../services/googleDrive';
import { GoogleDriveFolder, GoogleDriveFile, DocumentItem, DriveSyncConfig } from '../types';
import { formatFileSize, formatGreekDate, processUploadedFile } from '../utils/fileParser';

interface GoogleDriveSyncProps {
  existingDocuments: DocumentItem[];
  onDocumentsSynced: (newDocs: DocumentItem[]) => void;
  syncConfig: DriveSyncConfig | null;
  onUpdateSyncConfig: (config: DriveSyncConfig | null) => void;
}

export const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({
  existingDocuments,
  onDocumentsSynced,
  syncConfig,
  onUpdateSyncConfig,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([
    { id: 'root', name: 'My Drive' },
  ]);
  const [folders, setFolders] = useState<GoogleDriveFolder[]>([]);
  const [filesInFolder, setFilesInFolder] = useState<GoogleDriveFile[]>([]);
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Manual folder path / URL input
  const [customPathInput, setCustomPathInput] = useState('');
  const [isConnectingCustom, setIsConnectingCustom] = useState(false);

  // Syncing progress
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);

  // Designated Path requested by user
  const designatedPath = "G:\\Το Drive μου\\AiBot\\APP";
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const localDirInputRef = React.useRef<HTMLInputElement>(null);

  const handleAutoDetectAiBotApp = async () => {
    if (!token) {
      alert('Παρακαλούμε συνδεθείτε πρώτα με το Google Account σας παρακάτω.');
      return;
    }
    setIsAutoDetecting(true);
    setSyncStatusText('Αναζήτηση φακέλου "AiBot/APP" στο Google Drive...');
    try {
      const folder = await findFolderByHierarchy(['AiBot', 'APP']);
      if (folder) {
        const newConfig: DriveSyncConfig = {
          folderId: folder.id,
          folderName: folder.name,
          folderPath: `Το Drive μου / AiBot / APP`,
          lastSyncedAt: new Date().toISOString(),
          syncedFileCount: 0,
        };
        onUpdateSyncConfig(newConfig);
        setBreadcrumbs([
          { id: 'root', name: 'My Drive' },
          { id: 'parent', name: 'AiBot' },
          { id: folder.id, name: folder.name },
        ]);
        await loadFolderContents(folder.id);
        setSyncStatusText(`Βρέθηκε και συνδέθηκε ο φάκελος "${folder.name}" (${designatedPath})!`);
      } else {
        alert(
          `Δεν βρέθηκε φάκελος με όνομα "AiBot/APP" στο συνδεδεμένο Google Drive. Ελέγξτε αν ο φάκελος υπάρχει στο Drive σας ή περιηγηθείτε στους φακέλους παρακάτω.`
        );
        setSyncStatusText(null);
      }
    } catch (err: any) {
      alert(`Σφάλμα εντοπισμού: ${err?.message}`);
      setSyncStatusText(null);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleSelectLocalFolderFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsSyncing(true);
    setSyncStatusText(`Ανάγνωση αρχείων από το ${designatedPath}...`);

    try {
      const files = Array.from(fileList);
      const newDocs: DocumentItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setSyncStatusText(`Επεξεργασία (${i + 1}/${files.length}): ${file.name}...`);
        try {
          const doc = await processUploadedFile(file);
          newDocs.push(doc);
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
        }
      }

      if (newDocs.length > 0) {
        onDocumentsSynced([...newDocs, ...existingDocuments]);
        const newConfig: DriveSyncConfig = {
          folderId: 'local-g-drive-app',
          folderName: 'APP',
          folderPath: designatedPath,
          lastSyncedAt: new Date().toISOString(),
          syncedFileCount: newDocs.length,
        };
        onUpdateSyncConfig(newConfig);
        setSyncStatusText(`Συγχρονίστηκαν επιτυχώς ${newDocs.length} αρχεία από το ${designatedPath}!`);
        setTimeout(() => setSyncStatusText(null), 4000);
      }
    } catch (err: any) {
      alert(`Σφάλμα συγχρονισμού φακέλου: ${err?.message}`);
    } finally {
      setIsSyncing(false);
      if (localDirInputRef.current) localDirInputRef.current.value = '';
    }
  };

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setIsLoadingAuth(false);
        loadFolderContents('root');
      },
      () => {
        setUser(null);
        setToken(null);
        setIsLoadingAuth(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await signInWithGoogle();
      setUser(res.user);
      setToken(res.accessToken);
      await loadFolderContents('root');
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError(err?.message || 'Αποτυχία σύνδεσης με τον λογαριασμό Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setUser(null);
    setToken(null);
    setFolders([]);
    setFilesInFolder([]);
    setCurrentFolderId('root');
    setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
  };

  const loadFolderContents = async (folderId: string) => {
    setIsLoadingFolder(true);
    setFolderError(null);
    try {
      const [fetchedFolders, fetchedFiles] = await Promise.all([
        listDriveFolders(folderId),
        listFilesInFolder(folderId),
      ]);
      setFolders(fetchedFolders);
      setFilesInFolder(fetchedFiles);
      setCurrentFolderId(folderId);
    } catch (err: any) {
      console.error('Folder load error:', err);
      setFolderError(err?.message || 'Σφάλμα ανάγνωσης περιεχομένου φακέλου.');
    } finally {
      setIsLoadingFolder(false);
    }
  };

  const handleNavigateToFolder = async (folder: GoogleDriveFolder) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    await loadFolderContents(folder.id);
  };

  const handleBreadcrumbClick = async (index: number) => {
    const target = breadcrumbs[index];
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    await loadFolderContents(target.id);
  };

  const handleConnectByPathOrUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = customPathInput.trim();
    if (!input) return;

    setIsConnectingCustom(true);
    setFolderError(null);
    try {
      const folderId = extractFolderId(input);
      const details = await getDriveFolderDetails(folderId);
      
      const newConfig: DriveSyncConfig = {
        folderId: details.id,
        folderName: details.name,
        folderPath: `Google Drive / ${details.name}`,
        lastSyncedAt: new Date().toISOString(),
        syncedFileCount: 0,
      };

      onUpdateSyncConfig(newConfig);
      setBreadcrumbs([
        { id: 'root', name: 'My Drive' },
        { id: details.id, name: details.name },
      ]);
      await loadFolderContents(details.id);
      setCustomPathInput('');
    } catch (err: any) {
      setFolderError(`Δεν βρέθηκε φάκελος με αυτό το URL ή ID: ${err?.message}`);
    } finally {
      setIsConnectingCustom(false);
    }
  };

  const handleSetCurrentAsKnowledgeFolder = () => {
    const currentName = breadcrumbs[breadcrumbs.length - 1]?.name || 'Επιλεγμένος Φάκελος';
    const pathString = breadcrumbs.map((b) => b.name).join(' / ');

    const newConfig: DriveSyncConfig = {
      folderId: currentFolderId,
      folderName: currentName,
      folderPath: pathString,
      lastSyncedAt: new Date().toISOString(),
      syncedFileCount: 0,
    };

    onUpdateSyncConfig(newConfig);
  };

  // Sync a single file into the knowledge base
  const handleSyncSingleFile = async (file: GoogleDriveFile) => {
    setIsSyncing(true);
    setSyncStatusText(`Συγχρονισμός αρχείου: ${file.name}...`);
    try {
      const docItem = await syncDriveFileToDocument(file);
      // Replace existing with same gdrive ID or add new
      const filtered = existingDocuments.filter((d) => d.id !== docItem.id);
      onDocumentsSynced([docItem, ...filtered]);
      setSyncStatusText(`Το αρχείο "${file.name}" συγχρονίστηκε επιτυχώς.`);
      setTimeout(() => setSyncStatusText(null), 3000);
    } catch (err: any) {
      alert(`Σφάλμα συγχρονισμού: ${err?.message}`);
      setSyncStatusText(null);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync all files from current folder into the knowledge base
  const handleSyncAllFiles = async () => {
    if (filesInFolder.length === 0) {
      alert('Δεν υπάρχουν αρχεία στον τρέχοντα φάκελο για συγχρονισμό.');
      return;
    }

    const confirmed = window.confirm(
      `Επιθυμείτε να συγχρονίσετε και τα ${filesInFolder.length} αρχεία από το Google Drive στη γνωσιακή βάση;`
    );
    if (!confirmed) return;

    setIsSyncing(true);
    const syncedDocs: DocumentItem[] = [];
    let successCount = 0;

    for (let i = 0; i < filesInFolder.length; i++) {
      const file = filesInFolder[i];
      setSyncStatusText(`Συγχρονισμός (${i + 1}/${filesInFolder.length}): ${file.name}...`);
      try {
        const docItem = await syncDriveFileToDocument(file);
        syncedDocs.push(docItem);
        successCount++;
      } catch (err) {
        console.error(`Error syncing ${file.name}:`, err);
      }
    }

    if (syncedDocs.length > 0) {
      // Merge with existing, avoiding duplicates by id
      const syncedIds = new Set(syncedDocs.map((d) => d.id));
      const remainingExisting = existingDocuments.filter((d) => !syncedIds.has(d.id));
      onDocumentsSynced([...syncedDocs, ...remainingExisting]);

      if (syncConfig) {
        onUpdateSyncConfig({
          ...syncConfig,
          lastSyncedAt: new Date().toISOString(),
          syncedFileCount: successCount,
        });
      }
    }

    setIsSyncing(false);
    setSyncStatusText(`Ολοκληρώθηκε ο συγχρονισμός ${successCount} αρχείων από το Google Drive.`);
    setTimeout(() => setSyncStatusText(null), 4000);
  };

  const renderFileIcon = (file: GoogleDriveFile) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (file.mimeType.includes('spreadsheet') || ['xlsx', 'xls', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    }
    if (file.mimeType.includes('image/') || ['png', 'jpg', 'jpeg'].includes(ext)) {
      return <FileImage className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
    }
    if (file.mimeType.includes('pdf') || ext === 'pdf') {
      return <FileCheck className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
    }
    return <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  };

  const isFileAlreadySynced = (driveFileId: string) => {
    return existingDocuments.some((d) => d.id === `gdrive-${driveFileId}`);
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
      {/* Designated Knowledge Source Path Card */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/90 to-indigo-50/50 p-5 dark:border-blue-900/60 dark:from-blue-950/40 dark:to-indigo-950/20 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold shadow-xs">
                📁
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                Ορισμένη Διαδρομή Πηγής Γνώσης
              </span>
            </div>
            <h3 className="mt-1.5 text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white select-all">
              {designatedPath}
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Η εφαρμογή έχει ορίσει αυτή τη διαδρομή ως τη μοναδική επίσημη πηγή γνώσης. Κανένας πελάτης δεν έχει πρόσβαση σε αυτή.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Quick Auto-Detect button via Google Drive Cloud */}
            <button
              type="button"
              onClick={handleAutoDetectAiBotApp}
              disabled={isAutoDetecting || isSyncing}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs whitespace-nowrap"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAutoDetecting ? 'animate-spin' : ''}`} />
              <span>Αυτόματη Εύρεση στο Drive (AiBot/APP)</span>
            </button>

            {/* Local Windows folder button */}
            <button
              type="button"
              onClick={() => localDirInputRef.current?.click()}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 transition-colors shadow-xs whitespace-nowrap"
            >
              <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
              <span>Επιλογή Φακέλου από Windows (G:\...)</span>
            </button>

            {/* Hidden directory input */}
            <input
              type="file"
              ref={localDirInputRef}
              {...({ webkitdirectory: '', directory: '' } as any)}
              multiple
              onChange={handleSelectLocalFolderFiles}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
        <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          <strong className="block text-sm font-bold text-blue-950 dark:text-blue-100 mb-0.5">
            Αποκλειστική Διαχείριση & Πλήρης Απόκρυψη από τους Πελάτες
          </strong>
          Η διαδρομή του Google Drive και τα αρχεία σας είναι ορατά <strong>μόνο σε εσάς</strong>. Οι πελάτες δεν έχουν πρόσβαση στο σύνδεσμο, δεν βλέπουν τη διαδρομή στο Drive και δεν μπορούν να διαγράψουν ή να επεξεργαστούν κανένα αρχείο.
        </div>
      </div>

      {/* Google Authentication Section */}
      {!user ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center dark:border-slate-800 dark:bg-slate-950/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs dark:bg-slate-800 mb-3">
            <svg className="h-6 w-6" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Συνδέστε το Google Drive σας
          </h3>
          <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
            Συνδεθείτε με τον λογαριασμό Google σας για να επιλέξετε τον φάκελο γνώσης από τον οποίο θα αντλούνται τα επίσημα έγγραφα.
          </p>

          {/* Official Sign in with Google Button */}
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>{isLoggingIn ? 'Σύνδεση σε εξέλιξη...' : 'Σύνδεση με Google'}</span>
          </button>

          {authError && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4" />
              <span>{authError}</span>
            </div>
          )}
        </div>
      ) : (
        /* Connected State */
        <div className="space-y-6">
          {/* User Profile Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google Account'}
                  className="h-10 w-10 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {user.displayName || 'Συνδεδεμένος Διαχειριστής'}
                  </span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Συνδεδεμένο
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {user.email}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Αποσύνδεση Google</span>
            </button>
          </div>

          {/* Currently Selected Knowledge Folder Info */}
          {syncConfig && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Ενεργός Φάκελος Γνωσιακής Βάσης (Google Drive)
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {syncConfig.folderPath}
                    </h4>
                    {syncConfig.lastSyncedAt && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Τελευταίος συγχρονισμός: {formatGreekDate(syncConfig.lastSyncedAt)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSyncAllFiles}
                  disabled={isSyncing}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Συγχρονισμός Όλων</span>
                </button>
              </div>
            </div>
          )}

          {/* Direct Folder Link / Path Input */}
          <form onSubmit={handleConnectByPathOrUrl} className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={customPathInput}
                onChange={(e) => setCustomPathInput(e.target.value)}
                placeholder="Επικολλήστε σύνδεσμο φακέλου Google Drive (URL) ή ID φακέλου..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={isConnectingCustom || !customPathInput.trim()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors whitespace-nowrap"
            >
              {isConnectingCustom ? 'Σύνδεση...' : 'Σύνδεση Φακέλου'}
            </button>
          </form>

          {/* Folder Navigation & Explorer */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden">
            {/* Breadcrumb path toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                    <button
                      onClick={() => handleBreadcrumbClick(idx)}
                      className={`hover:underline font-medium ${
                        idx === breadcrumbs.length - 1
                          ? 'text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSetCurrentAsKnowledgeFolder}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Ορισμός αυτού του φακέλου ως Πηγή Γνώσης
                </button>
              </div>
            </div>

            {/* Sync status toast */}
            {syncStatusText && (
              <div className="bg-blue-50 p-2.5 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                <span>{syncStatusText}</span>
                {isSyncing && <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />}
              </div>
            )}

            {folderError && (
              <div className="bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-b border-rose-100">
                {folderError}
              </div>
            )}

            {/* Explorer content list */}
            <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
              {isLoadingFolder ? (
                <div className="flex items-center justify-center py-8 text-xs text-slate-500">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600 mr-2" />
                  <span>Ανάγνωση περιεχομένου Google Drive...</span>
                </div>
              ) : (
                <>
                  {/* Subfolders Grid */}
                  {folders.length > 0 && (
                    <div>
                      <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Υποφάκελοι ({folders.length})
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {folders.map((folder) => (
                          <button
                            key={folder.id}
                            onClick={() => handleNavigateToFolder(folder)}
                            className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 text-left text-xs font-medium text-slate-800 hover:border-blue-400 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-600 transition-colors truncate"
                          >
                            <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                            <span className="truncate">{folder.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Files Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Αρχεία στον φάκελο ({filesInFolder.length})
                      </h5>
                      {filesInFolder.length > 0 && (
                        <button
                          onClick={handleSyncAllFiles}
                          disabled={isSyncing}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Συγχρονισμός όλων ({filesInFolder.length})
                        </button>
                      )}
                    </div>

                    {filesInFolder.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                        Δεν υπάρχουν έγγραφα σε αυτόν τον φάκελο.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                        {filesInFolder.map((file) => {
                          const synced = isFileAlreadySynced(file.id);
                          return (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                                {renderFileIcon(file)}
                                <div className="truncate">
                                  <span className="font-medium text-slate-900 dark:text-white truncate block">
                                    {file.name}
                                  </span>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                    {file.size && <span>{formatFileSize(Number(file.size))}</span>}
                                    {file.modifiedTime && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span>{formatGreekDate(file.modifiedTime)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {synced ? (
                                  <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Συγχρονισμένο</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleSyncSingleFile(file)}
                                    disabled={isSyncing}
                                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                                  >
                                    Συγχρονισμός
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
