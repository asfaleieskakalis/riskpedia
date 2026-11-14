import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { CustomerChat } from './components/CustomerChat';
import { ContractAnalyzer } from './components/ContractAnalyzer';
import { InsuranceQuiz } from './components/InsuranceQuiz';
import { AdminPanel } from './components/AdminPanel';
import { AdminPinModal } from './components/AdminPinModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { HelpModal } from './components/HelpModal';
import { Footer } from './components/Footer';
import { DocumentItem, AppSettings, ChatMessage, DriveSyncConfig, AnalyticsEvent, CustomerView } from './types';
import {
  getStoredDocuments,
  saveStoredDocuments,
  getStoredSettings,
  saveStoredSettings,
  getStoredMessages,
  saveStoredMessages,
  getStoredDriveSyncConfig,
  saveStoredDriveSyncConfig,
  getStoredAnalytics,
  logAnalyticsEvent,
} from './utils/storage';

const isPublishedMode = (): boolean => {
  if (import.meta.env.PROD) return true;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host.startsWith('ais-pre-')) return true;
  }
  return false;
};

export default function App() {
  const isPublished = isPublishedMode();
  const showAdmin = !isPublished;
  const [documents, setDocuments] = useState<DocumentItem[]>(() => getStoredDocuments());
  const [settings, setSettings] = useState<AppSettings>(() => getStoredSettings());
  const [messages, setMessages] = useState<ChatMessage[]>(() => getStoredMessages());
  const [syncConfig, setSyncConfig] = useState<DriveSyncConfig | null>(() => getStoredDriveSyncConfig());
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>(() => getStoredAnalytics());
  const [isAdmin, setIsAdmin] = useState(false);
  const [customerView, setCustomerView] = useState<CustomerView>('chat');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Theme management (Light / Dark) with system preference fallback
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('docuquery_theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });
  const themeTransitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('docuquery_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('docuquery_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    return () => {
      if (themeTransitionTimerRef.current) {
        window.clearTimeout(themeTransitionTimerRef.current);
      }
    };
  }, []);

  // Prevent visitors from selecting or copying text/images via mouse, Ctrl+C, right-click, drag, etc.
  useEffect(() => {
    const visitorActive = !(showAdmin && isAdmin);
    document.body.classList.toggle('visitor-protected', visitorActive);

    if (!visitorActive) {
      return;
    }

    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCopyOrCut = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.clipboardData) {
        try {
          e.clipboardData.setData('text/plain', '');
        } catch {
          // Ignore clipboard write restrictions
        }
      }
      window.getSelection()?.removeAllRanges();
    };

    const handleSelectStart = (e: Event) => {
      if (!isEditableTarget(e.target)) {
        e.preventDefault();
      }
    };

    const handleSelectionChange = () => {
      if (!isEditableTarget(document.activeElement)) {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          selection.removeAllRanges();
        }
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }

      if (ctrlOrMeta && e.shiftKey && ['i', 'j', 'c', 'k'].includes(key)) {
        e.preventDefault();
        return;
      }

      if (ctrlOrMeta && !e.shiftKey && ['c', 'x', 's', 'u'].includes(key)) {
        e.preventDefault();
        window.getSelection()?.removeAllRanges();
        return;
      }

      if (ctrlOrMeta && !e.shiftKey && key === 'a' && !isEditableTarget(e.target)) {
        e.preventDefault();
        window.getSelection()?.removeAllRanges();
        return;
      }

      if (e.key === 'PrintScreen') {
        e.preventDefault();
        navigator.clipboard?.writeText('').catch(() => {});
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyOrCut);
    document.addEventListener('cut', handleCopyOrCut);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('dragstart', handleDragStart);
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyOrCut);
      document.removeEventListener('cut', handleCopyOrCut);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [showAdmin, isAdmin]);

  const toggleTheme = () => {
    document.documentElement.classList.add('theme-transitioning');
    if (themeTransitionTimerRef.current) {
      window.clearTimeout(themeTransitionTimerRef.current);
    }
    themeTransitionTimerRef.current = window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 350);
    setIsDark((prev) => !prev);
  };

  const handleUpdateDocuments = (newDocs: DocumentItem[]) => {
    setDocuments(newDocs);
    saveStoredDocuments(newDocs);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
  };

  const handleClearChat = () => {
    setMessages([]);
    saveStoredMessages([]);
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    saveStoredMessages(newHistory);
    setIsLoading(true);

    try {
      const activeDocs = documents.filter((d) => d.isActive);
      const res = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          documents: activeDocs,
          history: newHistory.slice(-8).map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            text: m.content,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Σφάλμα εξυπηρετητή (${res.status})`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.answer || 'Δεν κατέστη δυνατή η λήψη απάντησης.',
        timestamp: new Date().toISOString(),
        isAnswerable: data.isAnswerable,
      };

      const finalMessages = [...newHistory, assistantMsg];
      setMessages(finalMessages);
      saveStoredMessages(finalMessages);

      // Log question to usage analytics
      logAnalyticsEvent(text, Boolean(data.isAnswerable));
      setAnalyticsEvents(getStoredAnalytics());
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content:
          'Παρουσιάστηκε πρόβλημα κατά την επικοινωνία με τον εξυπηρετητή. Παρακαλούμε ελέγξτε τη σύνδεσή σας ή δοκιμάστε ξανά σε λίγο.',
        timestamp: new Date().toISOString(),
        isAnswerable: false,
      };
      const finalMessages = [...newHistory, errorMsg];
      setMessages(finalMessages);
      saveStoredMessages(finalMessages);

      // Log failed/error question
      logAnalyticsEvent(text, false);
      setAnalyticsEvents(getStoredAnalytics());
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDocActiveFromPreview = (id: string) => {
    const updated = documents.map((d) => (d.id === id ? { ...d, isActive: !d.isActive } : d));
    handleUpdateDocuments(updated);
    if (previewDoc && previewDoc.id === id) {
      setPreviewDoc({ ...previewDoc, isActive: !previewDoc.isActive });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f3ee] text-[#0b1424] dark:bg-[#0b1424] dark:text-[#f2f3f6] transition-colors">
      <Navbar
        agencyName={settings.agencyName}
        isAdmin={showAdmin && isAdmin}
        showAdmin={showAdmin}
        onOpenAdmin={() => {
          if (showAdmin) setIsPinModalOpen(true);
        }}
        onExitAdmin={() => setIsAdmin(false)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        customerView={customerView}
        onSelectCustomerView={(view) => {
          setIsAdmin(false);
          setCustomerView(view);
        }}
      />

      <main className="flex flex-1 flex-col">
        {showAdmin && isAdmin ? (
          <AdminPanel
            documents={documents}
            settings={settings}
            onUpdateDocuments={handleUpdateDocuments}
            onUpdateSettings={handleUpdateSettings}
            onPreviewDocument={(doc) => setPreviewDoc(doc)}
            syncConfig={syncConfig}
            onUpdateSyncConfig={(cfg) => {
              setSyncConfig(cfg);
              saveStoredDriveSyncConfig(cfg);
            }}
            analyticsEvents={analyticsEvents}
            onRefreshAnalytics={() => setAnalyticsEvents(getStoredAnalytics())}
          />
        ) : customerView === 'analyzer' ? (
          <ContractAnalyzer onBackToChat={() => setCustomerView('chat')} />
        ) : customerView === 'quiz' ? (
          <InsuranceQuiz
            onBackToChat={() => setCustomerView('chat')}
            onOpenAnalyzer={() => setCustomerView('analyzer')}
          />
        ) : (
          <CustomerChat
            documents={documents}
            settings={settings}
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onClearChat={handleClearChat}
            showAdmin={showAdmin}
            onOpenAdmin={() => {
              if (showAdmin) setIsPinModalOpen(true);
            }}
            onOpenAnalyzer={() => setCustomerView('analyzer')}
            onOpenQuiz={() => setCustomerView('quiz')}
          />
        )}
      </main>

      <Footer />

      {/* Modals */}
      {showAdmin && (
        <AdminPinModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          correctPin={settings.adminPin}
          onSuccess={() => {
            setIsPinModalOpen(false);
            setIsAdmin(true);
          }}
        />
      )}

      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onToggleActive={handleToggleDocActiveFromPreview}
      />

      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        showAdmin={showAdmin}
      />
    </div>
  );
}
