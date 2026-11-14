import { DocumentItem, AppSettings, ChatMessage } from '../types';
import { INITIAL_DOCUMENTS, DEFAULT_SETTINGS } from '../data/initialDocs';

const STORAGE_KEY_DOCS = 'docuquery_documents_v1';
const STORAGE_KEY_SETTINGS = 'docuquery_settings_v1';
const STORAGE_KEY_MESSAGES = 'docuquery_chat_messages_v1';

export function getStoredDocuments(): DocumentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOCS);
    if (!raw) {
      saveStoredDocuments(INITIAL_DOCUMENTS);
      return INITIAL_DOCUMENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const hasProfile = parsed.some((d: DocumentItem) => d.id === 'doc-kakalis-agency-profile-2026');
      if (!hasProfile) {
        const profileDoc = INITIAL_DOCUMENTS.find((d) => d.id === 'doc-kakalis-agency-profile-2026');
        if (profileDoc) {
          const merged = [profileDoc, ...parsed];
          saveStoredDocuments(merged);
          return merged;
        }
      }
      return parsed;
    }
    return INITIAL_DOCUMENTS;
  } catch (error) {
    console.error('Failed to load documents from storage:', error);
    return INITIAL_DOCUMENTS;
  }
}

export function saveStoredDocuments(docs: DocumentItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(docs));
  } catch (error) {
    console.error('Failed to save documents to storage:', error);
  }
}

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) {
      saveStoredSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    const settings = { ...DEFAULT_SETTINGS, ...parsed };
    let changed = false;
    if (!settings.agencyName || settings.agencyName === 'Γραφείο Εξυπηρέτησης & Ασφαλειών' || settings.agencyName === 'ΑΣΦΑΛΕΙΕΣ ΚΑΚΑΛΗΣ') {
      settings.agencyName = 'RiskPedia By Asfaleies Kakalis';
      changed = true;
    }
    if (
      !settings.welcomeMessage ||
      settings.welcomeMessage.startsWith('Καλώς ήρθατε στο RiskPedia των Ασφαλειών Κακάλης!')
    ) {
      settings.welcomeMessage = DEFAULT_SETTINGS.welcomeMessage;
      changed = true;
    } else if (/Η παρούσα υπηρεσία παρέχει/i.test(settings.welcomeMessage)) {
      const cleaned = settings.welcomeMessage
        .replace(/\*?\s*Η παρούσα υπηρεσία παρέχει[\s\S]*?(?:σύμβουλο\.?|$)/i, '')
        .trim();
      settings.welcomeMessage = cleaned || DEFAULT_SETTINGS.welcomeMessage;
      changed = true;
    }
    if (changed) {
      saveStoredSettings(settings);
    }
    return settings;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

export function getStoredMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

export function saveStoredMessages(messages: ChatMessage[]): void {
  try {
    // Keep last 30 messages in history
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages.slice(-30)));
  } catch (error) {
    console.error('Failed to save messages:', error);
  }
}

const STORAGE_KEY_DRIVE_SYNC = 'docuquery_drive_sync_v1';

export function getStoredDriveSyncConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRIVE_SYNC);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredDriveSyncConfig(config: any) {
  try {
    if (config) {
      localStorage.setItem(STORAGE_KEY_DRIVE_SYNC, JSON.stringify(config));
    } else {
      localStorage.removeItem(STORAGE_KEY_DRIVE_SYNC);
    }
  } catch (error) {
    console.error('Failed to save drive sync config:', error);
  }
}

const STORAGE_KEY_ANALYTICS = 'docuquery_analytics_events_v1';

/**
 * Generate realistic seed analytics data for the past 14 days
 */
function generateSeedAnalytics(): import('../types').AnalyticsEvent[] {
  const events: import('../types').AnalyticsEvent[] = [];
  const now = new Date();
  
  const sampleQuestionsAnswered = [
    'Τι καλύπτει η 24ωρη Οδική Βοήθεια;',
    'Ποιο είναι το τηλέφωνο ανάγκης;',
    'Ποια είναι τα δικαιολογητικά για αναγγελία ζημιάς;',
    'Καλύπτεται η θραύση κρυστάλλων χωρίς απαλλαγή;',
    'Ποια προγράμματα υγείας προσφέρονται;',
    'Πόσο διαρκεί η αναμονή για χειρουργικές επεμβάσεις;',
    'Τι ισχύει για ζημιές από φυσικά φαινόμενα;',
    'Ποιο είναι το όριο αποζημίωσης στο Φιλικό Διακανονισμό;',
    'Πώς αποζημιώνομαι σε περίπτωση ολικής κλοπής;',
    'Καλύπτονται σωματικές βλάβες τρίτων;',
    'Ποιες κλινικές είναι συμβεβλημένες;',
    'Πότε γίνεται η πραγματογνωμοσύνη στο συνεργείο;',
  ];

  const sampleQuestionsUnanswered = [
    'Ποιο είναι το κόστος για ασφάλεια σκάφους αναψυχής;',
    'Παρέχετε ασφάλιση επαγγελματικού drone;',
    'Ποια είναι τα γραφεία σας στη Θεσσαλονίκη;',
    'Προσφέρετε συνταξιοδοτικά προγράμματα εξωτερικού;',
  ];

  // Past 14 days
  for (let i = 13; i >= 0; i--) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - i);
    const dateStr = targetDate.toISOString().split('T')[0];
    
    // Varying number of questions per day (between 6 and 16, fewer on weekends)
    const dayOfWeek = targetDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const count = isWeekend ? Math.floor(Math.random() * 5) + 4 : Math.floor(Math.random() * 8) + 9;

    for (let j = 0; j < count; j++) {
      const isAnswerable = Math.random() > 0.15; // 85% answered
      const qList = isAnswerable ? sampleQuestionsAnswered : sampleQuestionsUnanswered;
      const question = qList[Math.floor(Math.random() * qList.length)];
      
      // Realistic business hours (9:00 - 20:00)
      const hour = Math.floor(Math.random() * 11) + 9;
      const minute = Math.floor(Math.random() * 60);
      const evDate = new Date(targetDate);
      evDate.setHours(hour, minute, 0, 0);

      events.push({
        id: `ev-${dateStr}-${j}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: evDate.toISOString(),
        date: dateStr,
        hour,
        isAnswerable,
        question,
      });
    }
  }

  return events;
}

export function getStoredAnalytics(): import('../types').AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ANALYTICS);
    if (!raw) {
      const seeded = generateSeedAnalytics();
      localStorage.setItem(STORAGE_KEY_ANALYTICS, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : generateSeedAnalytics();
  } catch (error) {
    console.error('Failed to load analytics:', error);
    return generateSeedAnalytics();
  }
}

export function logAnalyticsEvent(question: string, isAnswerable: boolean): void {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const newEvent: import('../types').AnalyticsEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      date: dateStr,
      hour: now.getHours(),
      isAnswerable,
      question: question.trim(),
    };

    const current = getStoredAnalytics();
    const updated = [newEvent, ...current].slice(0, 500); // keep up to 500 records
    localStorage.setItem(STORAGE_KEY_ANALYTICS, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to log analytics event:', error);
  }
}

export function resetAnalyticsData(): import('../types').AnalyticsEvent[] {
  const seeded = generateSeedAnalytics();
  localStorage.setItem(STORAGE_KEY_ANALYTICS, JSON.stringify(seeded));
  return seeded;
}


