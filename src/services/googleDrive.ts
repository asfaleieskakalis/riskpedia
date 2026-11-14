import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GoogleDriveFolder, GoogleDriveFile, DocumentItem, DocumentType } from '../types';

// Ensure Firebase is initialized only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory token cache (NEVER persisted to localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Need user interaction to get token if not in memory
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Δεν ήταν δυνατή η ανάκτηση του access token από τη σύνδεση Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Extract folder ID from a Google Drive URL or raw ID
 * Supports:
 * - https://drive.google.com/drive/folders/1abcXYZ...
 * - https://drive.google.com/drive/u/0/folders/1abcXYZ...
 * - Raw folder ID
 */
export function extractFolderId(input: string): string {
  const clean = input.trim();
  const folderMatch = clean.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }
  // If it's a direct ID without slashes
  if (/^[a-zA-Z0-9_-]{15,}$/.test(clean)) {
    return clean;
  }
  return clean;
}

/**
 * List folders inside a parent folder or in root ("root")
 */
export async function listDriveFolders(parentId = 'root'): Promise<GoogleDriveFolder[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Απαιτείται σύνδεση με το Google Drive.');

  const query = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType)&orderBy=name&pageSize=100`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Σφάλμα φόρτωσης φακέλων (${response.status})`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Get details of a single folder
 */
export async function getDriveFolderDetails(folderId: string): Promise<GoogleDriveFolder> {
  const token = await getAccessToken();
  if (!token) throw new Error('Απαιτείται σύνδεση με το Google Drive.');

  const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Δεν βρέθηκε ο φάκελος (${response.status})`);
  }

  return await response.json();
}

/**
 * Searches for folders by name in Google Drive
 */
export async function searchDriveFolders(searchTerm: string): Promise<GoogleDriveFolder[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Απαιτείται σύνδεση με το Google Drive.');

  const cleanTerm = searchTerm.replace(/'/g, "\\'");
  const query = `name contains '${cleanTerm}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType)&orderBy=name&pageSize=20`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Automatically resolves a hierarchy of folders (e.g. ['AiBot', 'APP'])
 */
export async function findFolderByHierarchy(folderNames: string[]): Promise<GoogleDriveFolder | null> {
  const token = await getAccessToken();
  if (!token || folderNames.length === 0) return null;

  let currentParentId = 'root';
  let matchedFolder: GoogleDriveFolder | null = null;

  for (const name of folderNames) {
    const cleanName = name.trim().replace(/'/g, "\\'");
    // Search exact name inside current parent
    let query = `'${currentParentId}' in parents and name = '${cleanName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=files(id,name,mimeType)&pageSize=5`;

    let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    let data = res.ok ? await res.json() : null;

    if (!data?.files || data.files.length === 0) {
      // Fallback: search anywhere in Drive by case-insensitive name
      query = `name = '${cleanName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name,mimeType)&pageSize=5`;
      res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      data = res.ok ? await res.json() : null;
    }

    if (data?.files && data.files.length > 0) {
      const found: GoogleDriveFolder = data.files[0];
      matchedFolder = found;
      currentParentId = found.id;
    } else {
      return null;
    }
  }

  return matchedFolder;
}

/**
 * List all non-folder files inside a specific Google Drive folder
 */
export async function listFilesInFolder(folderId: string): Promise<GoogleDriveFile[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Απαιτείται σύνδεση με το Google Drive.');

  const query = `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=modifiedTime desc&pageSize=100`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Σφάλμα φόρτωσης αρχείων (${response.status})`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Download and convert a Google Drive file into an app DocumentItem
 */
export async function syncDriveFileToDocument(
  file: GoogleDriveFile
): Promise<DocumentItem> {
  const token = await getAccessToken();
  if (!token) throw new Error('Απαιτείται σύνδεση με το Google Drive.');

  let extractedContent = '';
  let docType: DocumentType = 'txt';
  let imageData: string | undefined = undefined;
  let pdfBase64: string | undefined = undefined;
  let fileSize = Number(file.size) || 0;

  // Handle Google Native Docs & Sheets export
  if (file.mimeType === 'application/vnd.google-apps.document') {
    docType = 'docx';
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`;
    const res = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Αποτυχία εξαγωγής Google Doc: ${file.name}`);
    extractedContent = await res.text();
    fileSize = extractedContent.length;
  } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
    docType = 'xlsx';
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv`;
    const res = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Αποτυχία εξαγωγής Google Sheet: ${file.name}`);
    const csv = await res.text();
    extractedContent = `[Φύλλο Google Sheets: ${file.name}]\n${csv}`;
    fileSize = extractedContent.length;
  } else {
    // Binary or text file download (PDF, Word, Excel, Images, TXT)
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Αποτυχία λήψης αρχείου: ${file.name}`);

    const blob = await res.blob();
    fileSize = blob.size;
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (file.mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
      docType = 'image';
      const base64 = await blobToBase64(blob);
      imageData = base64;
      extractedContent = `[Οπτικό Έγγραφο Google Drive: ${file.name}]`;
    } else if (file.mimeType === 'application/pdf' || extension === 'pdf') {
      docType = 'pdf';
      const base64 = await blobToBase64(blob);
      const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
      pdfBase64 = cleanBase64;
      extractedContent = `[Επίσημο Έγγραφο PDF Google Drive: ${file.name}]`;
    } else {
      // DOCX, XLSX, TXT: convert to base64 and parse on server
      const base64 = await blobToBase64(blob);
      const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

      if (['docx', 'doc'].includes(extension) || file.mimeType.includes('wordprocessingml')) {
        docType = 'docx';
      } else if (['xlsx', 'xls', 'csv'].includes(extension) || file.mimeType.includes('spreadsheet')) {
        docType = 'xlsx';
      } else {
        docType = 'txt';
      }

      try {
        const parseRes = await fetch('/api/documents/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            type: file.mimeType,
            base64Data: cleanBase64,
          }),
        });
        if (parseRes.ok) {
          const parseData = await parseRes.json();
          extractedContent = parseData.text || '';
        } else {
          extractedContent = `[Αρχείο Google Drive: ${file.name}]`;
        }
      } catch {
        extractedContent = `[Αρχείο Google Drive: ${file.name}]`;
      }
    }
  }

  return {
    id: `gdrive-${file.id}`,
    name: file.name,
    type: docType,
    size: fileSize,
    uploadedAt: file.modifiedTime || new Date().toISOString(),
    content: extractedContent,
    charCount: extractedContent.length || Math.round(fileSize / 5),
    isActive: true,
    imageData,
    pdfBase64,
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
