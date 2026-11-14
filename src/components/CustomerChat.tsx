import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Volume2,
  VolumeX,
  RotateCcw,
  Mic,
  MicOff,
  AlertCircle,
  HelpCircle,
  Globe,
  Mail,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { ChatMessage, DocumentItem, AppSettings } from '../types';

interface CustomerChatProps {
  documents: DocumentItem[];
  settings: AppSettings;
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  onClearChat: () => void;
  showAdmin?: boolean;
  onOpenAdmin: () => void;
  onOpenAnalyzer?: () => void;
  onOpenQuiz?: () => void;
}

export const CustomerChat: React.FC<CustomerChatProps> = ({
  documents,
  settings,
  messages,
  onSendMessage,
  isLoading,
  onClearChat,
  showAdmin = true,
  onOpenAdmin,
  onOpenAnalyzer,
  onOpenQuiz,
}) => {
  const [inputText, setInputText] = useState('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Setup Web Speech Recognition for voice queries in Greek
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'el-GR';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
    }

    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const handleToggleListening = () => {
    if (!speechRecognitionRef.current) {
      alert('Η αναγνώριση φωνής δεν υποστηρίζεται από το πρόγραμμα περιήγησής σας.');
      return;
    }
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Mic error:', err);
        setIsListening(false);
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputText.trim();
    if (!query || isLoading) return;

    setInputText('');
    await onSendMessage(query);
  };

  const handleQuickQuestionClick = async (q: string) => {
    if (isLoading) return;
    setInputText('');
    await onSendMessage(q);
  };

  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'el-GR';
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const activeDocsCount = documents.filter((d) => d.isActive).length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
      {/* Official Agency Hero Banner */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-colors">
        {/* Full Graphic Banner from User Assets */}
        <div className="relative w-full overflow-hidden bg-white border-b border-slate-100 dark:border-slate-800">
          <img
            src="/assets/aistudio/Gemini_Generated_Image_orpotporpotporpo_ccb5e5af.jpg"
            alt="ΑΣΦΑΛΕΙΕΣ ΚΑΚΑΛΗΣ - Σίγουρα δίπλα σας"
            className="w-full h-auto max-h-56 sm:max-h-64 object-contain object-center bg-white"
          />
        </div>

        {/* Interactive Quick Contact Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-2.5 text-xs dark:border-slate-800/80 dark:bg-slate-800/40">
          <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">Επικοινωνία:</span>
            <a
              href="mailto:asfaleieskakalis@gmail.com"
              className="flex items-center gap-1.5 font-semibold text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-400"
              title="Email Εξυπηρέτησης"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>asfaleieskakalis@gmail.com</span>
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://asfaleieskakalis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-semibold text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-400"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>asfaleieskakalis.com</span>
            </a>
          </div>
        </div>

        {/* Welcome message & Starters */}
        <div className="p-5">
          <div className="whitespace-pre-line text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
            {settings.welcomeMessage
              .replace(/\*?\s*Η παρούσα υπηρεσία παρέχει[\s\S]*?(?:σύμβουλο\.?|$)/i, '')
              .trim()}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-slate-400 dark:text-slate-500">
            *Η παρούσα υπηρεσία παρέχει καθαρά μια συμβουλευτική καθοδήγηση και ενημέρωση. Δεν υποκαθιστά τη συμπλήρωση του επίσημου Εντύπου Διερεύνησης Αναγκών, ούτε την εξατομικευμένη επικοινωνία από εξουσιοδοτημένο ασφαλιστικό σύμβουλο.
          </p>

          {/* Feature Highlight: Contract Analyzer Card */}
          <div className="mt-4 rounded-xl border border-[#008361]/30 bg-gradient-to-r from-[#def4f0]/60 via-white to-[#def4f0]/30 p-4 dark:border-[#008361]/40 dark:from-[#008361]/15 dark:via-[#122544] dark:to-[#008361]/10 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#008361] text-white shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#122544] dark:text-white">
                      Έλεγχος & Ανάλυση Ασφαλιστηρίου
                    </span>
                    <span className="rounded-full bg-[#008361] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Νέο
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#415069] dark:text-slate-300 leading-snug">
                    Ανεβάστε το συμβόλαιό σας (PDF, εικόνα ή έγγραφο) και λάβετε αντικειμενικό έλεγχο καλύψεων, εντοπισμό ψιλών γραμμάτων & προτάσεις βελτίωσης.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {onOpenQuiz && (
                  <button
                    type="button"
                    onClick={onOpenQuiz}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#008361]/40 bg-white hover:bg-[#def4f0]/60 px-3 py-2 text-xs font-bold text-[#008361] dark:border-[#008361]/50 dark:bg-[#122544] dark:text-[#24d99a] dark:hover:bg-[#1e355b] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Κουίζ Γνώσεων</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenAnalyzer}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#008361] hover:bg-[#006e52] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Έλεγχος Συμβολαίου</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Questions Starters */}
          {settings.quickQuestions && settings.quickQuestions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1e355b]">
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#415069] dark:text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-[#008361] dark:text-[#24d99a]" />
                <span>Συχνές Ερωτήσεις Πελατών</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickQuestionClick(q)}
                    disabled={isLoading}
                    className="rounded-lg border border-[#dadce0] bg-white px-3 py-2 text-left text-xs font-medium text-[#122544] hover:border-[#008361] hover:bg-[#def4f0]/40 hover:text-[#008361] dark:border-[#1e355b] dark:bg-[#122544]/70 dark:text-slate-200 dark:hover:border-[#00b090] dark:hover:bg-[#008361]/20 dark:hover:text-white transition-colors disabled:opacity-50 shadow-2xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dadce0] bg-white/70 py-10 px-6 text-center dark:border-[#1e355b] dark:bg-[#0f1d33]/50">
            <div className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[#dadce0] bg-white p-1 shadow-xs dark:border-[#1e355b]">
              <img
                src="/assets/aistudio/logo1_f97c3b58.jpg"
                alt="ΑΣΦΑΛΕΙΕΣ ΚΑΚΑΛΗΣ"
                className="h-full w-full object-contain"
              />
            </div>
            <h3 className="text-base font-semibold text-[#122544] dark:text-white">
              Πώς μπορούμε να σας εξυπηρετήσουμε;
            </h3>
            <p className="mt-1.5 max-w-md text-xs sm:text-sm text-[#415069] dark:text-slate-400 leading-relaxed">
              Κάντε οποιαδήποτε ερώτηση παρακάτω ή επιλέξτε μία από τις συχνές απορίες. Οι απαντήσεις παρέχονται αποκλειστικά από τους επίσημους εσωτερικούς όρους και οδηγούς.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#dadce0] bg-white p-0.5 shadow-xs dark:border-[#1e355b]">
                  <img
                    src="/assets/aistudio/logo1_f97c3b58.jpg"
                    alt="ΑΣΦΑΛΕΙΕΣ ΚΑΚΑΛΗΣ"
                    className="h-full w-full object-contain"
                  />
                </div>
              )}

              <div
                className={`group relative max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-colors ${
                  msg.role === 'user'
                    ? 'bg-[#122544] text-white rounded-tr-xs shadow-xs'
                    : 'bg-white text-[#0b1424] border border-[#dadce0] dark:bg-[#122544]/90 dark:text-slate-100 dark:border-[#1e355b] rounded-tl-xs shadow-xs'
                }`}
              >
                {/* Content */}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Status notice if not found in knowledge base */}
                {msg.role === 'assistant' && msg.isAnswerable === false && (
                  <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>Η απάντηση δεν αναφέρεται στα αρχεία μας.</span>
                  </div>
                )}

                {/* Assistant footer actions: copy, speak, timestamp */}
                {msg.role === 'assistant' && (
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-[#1e355b]/80 pt-2 text-[11px] text-[#727586] dark:text-slate-400">
                    <span className="tabular-nums">
                      {new Date(msg.timestamp).toLocaleTimeString('el-GR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSpeak(msg.id, msg.content)}
                        className="rounded p-1 text-[#727586] hover:bg-[#f5f3ee] hover:text-[#122544] dark:hover:bg-[#1e355b] dark:hover:text-slate-200 transition-colors"
                        title={speakingId === msg.id ? 'Διακοπή ομιλίας' : 'Ανάγνωση φωνητικά'}
                      >
                        {speakingId === msg.id ? (
                          <VolumeX className="h-3.5 w-3.5 text-[#008361]" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#122544]/20 text-[#122544] dark:bg-[#1e355b] dark:text-slate-200">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#dadce0] bg-white p-0.5 shadow-xs dark:border-[#1e355b]">
              <img
                src="/assets/aistudio/logo1_f97c3b58.jpg"
                alt="ΑΣΦΑΛΕΙΕΣ ΚΑΚΑΛΗΣ"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-[#dadce0] bg-white px-4 py-3 text-sm text-[#415069] dark:border-[#1e355b] dark:bg-[#0f1d33] dark:text-slate-400 shadow-xs">
              <div className="flex space-x-1">
                <div className="h-2 w-2 rounded-full bg-[#008361] animate-bounce [animation-delay:-0.3s]" />
                <div className="h-2 w-2 rounded-full bg-[#008361] animate-bounce [animation-delay:-0.15s]" />
                <div className="h-2 w-2 rounded-full bg-[#008361] animate-bounce" />
              </div>
              <span className="text-xs">Επαλήθευση από τα εσωτερικά έγγραφα...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar & Controls */}
      <div className="sticky bottom-4 z-20 mt-4">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center rounded-2xl border border-[#dadce0] bg-white p-2 shadow-lg dark:border-[#1e355b] dark:bg-[#0f1d33] transition-shadow focus-within:border-[#008361] focus-within:ring-2 focus-within:ring-[#008361]/20"
        >
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleToggleListening}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'text-[#415069] hover:bg-[#f5f3ee] hover:text-[#0b1424] dark:text-slate-400 dark:hover:bg-[#122544] dark:hover:text-slate-100'
            }`}
            title={isListening ? 'Διακοπή ηχογράφησης' : 'Φωνητική ερώτηση (Ελληνικά)'}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening
                ? 'Σας ακούω... Μιλήστε τώρα'
                : 'Γράψτε την ερώτησή σας εδώ...'
            }
            disabled={isLoading}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-[#0b1424] placeholder-[#727586] focus:outline-none dark:text-white dark:placeholder-slate-500"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#008361] text-white hover:bg-[#006e52] disabled:opacity-40 disabled:hover:bg-[#008361] transition-colors shadow-xs"
            title="Αποστολή ερώτησης"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {/* Footer info: security pledge & clear chat */}
        <div className="mt-2.5 flex items-center justify-between px-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Αυστηρή Τεκμηρίωση:
            </span>
            <span>Οι απαντήσεις αντλούνται αποκλειστικά από τα εσωτερικά έγγραφα.</span>
          </div>

          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={onClearChat}
                className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                title="Καθαρισμός ιστορικού συνομιλίας"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Καθαρισμός</span>
              </button>
            )}

            {showAdmin && (
              <button
                onClick={onOpenAdmin}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-2"
              >
                Διαχειριστής
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
