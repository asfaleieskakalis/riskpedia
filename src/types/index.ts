export type DocumentType = 'pdf' | 'docx' | 'xlsx' | 'txt' | 'image';

export interface DocumentItem {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  uploadedAt: string;
  content: string;
  charCount: number;
  isActive: boolean;
  imageData?: string;
  pdfBase64?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isAnswerable?: boolean;
}

export interface AppSettings {
  agencyName: string;
  subtitle: string;
  welcomeMessage: string;
  adminPin: string;
  designatedPath?: string;
  quickQuestions: string[];
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  mimeType: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  isSynced?: boolean;
}

export interface DriveSyncConfig {
  folderId: string;
  folderName: string;
  folderPath: string;
  lastSyncedAt?: string;
  syncedFileCount: number;
}

export interface AnalyticsEvent {
  id: string;
  timestamp: string;
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  isAnswerable: boolean;
  question: string;
}

export interface PolicySummary {
  policyType: string;
  company: string;
  policyNumber?: string;
  insuredName?: string;
  duration?: string;
  premium?: string;
  overallRating: 'Εξαιρετική' | 'Καλή' | 'Μέτρια' | 'Ελλιπής';
  ratingScore: number;
  quickVerdict: string;
}

export interface PolicyCoverage {
  name: string;
  limit: string;
  deductible: string;
  notes?: string;
}

export interface PolicyAlert {
  type: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface PolicyAnalysisResult {
  id: string;
  fileName: string;
  analyzedAt: string;
  summary: PolicySummary;
  coverages: PolicyCoverage[];
  exclusions: string[];
  gapsAndAlerts: PolicyAlert[];
  recommendations: string[];
  fullRawText?: string;
}

export type CustomerView = 'chat' | 'analyzer' | 'quiz';

export type InsuranceBranch =
  | 'Ασφάλιση Αυτοκινήτου & Οχήματος'
  | 'Ασφάλιση Κατοικίας & Περιουσίας'
  | 'Ασφάλιση Υγείας & Νοσοκομειακής Περίθαλψης'
  | 'Ασφάλιση Ζωής, Ατυχήματος & Σύνταξης'
  | 'Ασφάλιση Επιχείρησης & Αστικής Ευθύνης'
  | 'Νομική Προστασία, Ταξιδιωτική, Σκάφη & Πατίνι/Ποδήλατο';

export type QuizTopicKey =
  | 'general'
  | 'auto'
  | 'roadside'
  | 'home'
  | 'health'
  | 'life'
  | 'business'
  | 'micromobility'
  | 'other';

export interface QuizQuestion {
  id: string;
  branch: InsuranceBranch;
  branchShort: string;
  topicTags?: Exclude<QuizTopicKey, 'general'>[];
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  practicalTip: string;
}

