import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Award,
  MessageSquare,
  FileText,
  Lightbulb,
  ChevronDown,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { QuizQuestion, QuizTopicKey } from '../types';
import { QUIZ_TOPIC_OPTIONS, generateQuizByTopic } from '../data/quizQuestions';
import { playQuizAnswerSound, playQuizCompleteSound } from '../utils/quizSounds';

interface InsuranceQuizProps {
  onBackToChat?: () => void;
  onOpenAnalyzer?: () => void;
}

const OPTION_LETTERS = ['Α', 'Β', 'Γ', 'Δ'] as const;

export const InsuranceQuiz: React.FC<InsuranceQuizProps> = ({
  onBackToChat,
  onOpenAnalyzer,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<QuizTopicKey>('general');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(() =>
    generateQuizByTopic('general', true)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('docuquery_quiz_sound') !== 'off';
    } catch {
      return true;
    }
  });

  const currentTopicMeta = useMemo(
    () => QUIZ_TOPIC_OPTIONS.find((opt) => opt.key === selectedTopic) || QUIZ_TOPIC_OPTIONS[0],
    [selectedTopic]
  );

  const currentQuestion = quizQuestions[currentIndex];
  const selectedOptionForCurrent =
    currentQuestion !== undefined ? selectedAnswers[currentQuestion.id] : undefined;
  const hasAnsweredCurrent = selectedOptionForCurrent !== undefined;

  const score = useMemo(() => {
    return quizQuestions.reduce((acc, q) => {
      return acc + (selectedAnswers[q.id] === q.correctIndex ? 1 : 0);
    }, 0);
  }, [quizQuestions, selectedAnswers]);

  const answeredCount = Object.keys(selectedAnswers).length;
  const percentage =
    quizQuestions.length > 0 ? Math.round((score / quizQuestions.length) * 100) : 0;

  const handleTopicChange = (newTopic: QuizTopicKey) => {
    setSelectedTopic(newTopic);
    setQuizQuestions(generateQuizByTopic(newTopic, false));
    setCurrentIndex(0);
    setSelectedAnswers({});
    setIsCompleted(false);
  };

  const handleToggleSound = () => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('docuquery_quiz_sound', next ? 'on' : 'off');
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const handleSelectOption = (optionIdx: number) => {
    if (!currentQuestion || hasAnsweredCurrent) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIdx,
    }));
    if (isSoundEnabled) {
      playQuizAnswerSound(optionIdx === currentQuestion.correctIndex);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      if (isSoundEnabled) {
        playQuizCompleteSound();
      }
      setIsCompleted(true);
    }
  };

  const handleRestartQuiz = () => {
    setQuizQuestions(generateQuizByTopic(selectedTopic, false));
    setCurrentIndex(0);
    setSelectedAnswers({});
    setIsCompleted(false);
  };

  const getPerformanceTier = (finalScore: number, total: number) => {
    const ratio = total > 0 ? finalScore / total : 0;
    if (ratio >= 0.8) {
      return {
        title: 'Εξαιρετική Ασφαλιστική Επίγνωση!',
        subtitle:
          'Ξεχωρίζετε τι πραγματικά προσφέρουν οι καλύψεις πίσω από τους όρους και αποφεύγετε τις πιο συχνές παγίδες της καθημερινότητας.',
      };
    }
    if (ratio >= 0.5) {
      return {
        title: 'Πολύ Καλή Εικόνα — Ανακαλύψατε Κρυφά Οφέλη',
        subtitle:
          'Γνωρίζετε ήδη αρκετά, όμως είδατε στην πράξη πόσες προσιτές καλύψεις συχνά αγνοούνται μέχρι να τύχει το απρόοπτο.',
      };
    }
    return {
      title: 'Πολύτιμη Αφύπνιση Γνώσεων!',
      subtitle:
        'Οι περισσότεροι άνθρωποι μαθαίνουν αυτά τα οφέλη μόνο όταν πάθουν ζημιά. Διαβάστε παρακάτω τις απλές επεξηγήσεις για να ξέρετε τι δικαιούστε!',
    };
  };

  const progressGridColsClass =
    quizQuestions.length === 7
      ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'
      : quizQuestions.length === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
      {/* Top Navigation Strip */}
      {onBackToChat && (
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToChat}
            className="text-xs font-semibold text-[#415069] hover:text-[#122544] dark:text-slate-400 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#008361] cursor-pointer"
          >
            ← Επιστροφή στη Συμβουλευτική Q&A
          </button>
        </div>
      )}

      {/* Coverage / Topic Selector Dropdown Card */}
      <div className="mb-5 rounded-2xl border border-[#dadce0] bg-white px-5 py-4 shadow-xs dark:border-[#1e355b] dark:bg-[#0f1d33] transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label
              htmlFor="quiz-topic-select"
              className="block text-xs font-bold text-[#122544] dark:text-white"
            >
              Επιλέξτε Κάλυψη ή Κουίζ Γενικών Γνώσεων
            </label>
            <p className="mt-0.5 text-xs text-[#727586] dark:text-slate-400">
              Απαντήστε σε ερωτήσεις για τη συγκεκριμένη κάλυψη που σας ενδιαφέρει ή δοκιμάστε το μικτό κουίζ από όλους τους κλάδους.
            </p>
          </div>

          <div className="relative w-full sm:w-80 shrink-0">
            <select
              id="quiz-topic-select"
              value={selectedTopic}
              onChange={(e) => handleTopicChange(e.target.value as QuizTopicKey)}
              className="w-full appearance-none rounded-xl border border-[#dadce0] bg-[#fbfaf8] py-2.5 pl-3.5 pr-10 text-xs font-semibold text-[#122544] hover:border-[#008361] focus:border-[#008361] focus:outline-none focus:ring-2 focus:ring-[#008361]/20 dark:border-[#1e355b] dark:bg-[#122544] dark:text-white cursor-pointer transition-colors"
            >
              {QUIZ_TOPIC_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label} · {option.questionCountLabel}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#415069] dark:text-slate-300"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isCompleted && currentQuestion ? (
          /* ACTIVE MULTIPLE-CHOICE QUIZ */
          <motion.div
            key={`quiz-${selectedTopic}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {/* Quiz Header & Progress Bar */}
            <div className="overflow-hidden rounded-2xl border border-[#dadce0] bg-white p-6 sm:p-8 shadow-xs dark:border-[#1e355b] dark:bg-[#0f1d33] transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#dadce0]/70 dark:border-[#1e355b]">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#727586] dark:text-slate-400">
                    <span>Παιχνίδι Γνώσης & Ανακάλυψης</span>
                    <span aria-hidden="true">·</span>
                    <span>{currentTopicMeta.shortLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-[#008361] dark:text-[#24d99a] font-semibold">
                      Ερώτηση {currentIndex + 1} από {quizQuestions.length}
                    </span>
                  </div>
                  <h1 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-[#122544] dark:text-white text-balance">
                    Γνωρίζετε τι πραγματικά σας καλύπτει στην καθημερινότητα;
                  </h1>
                </div>

                <div className="flex items-center gap-3 text-right shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleSound}
                    aria-pressed={isSoundEnabled}
                    aria-label={isSoundEnabled ? 'Σίγαση ηχητικών εφέ' : 'Ενεργοποίηση ηχητικών εφέ'}
                    title={isSoundEnabled ? 'Ήχος ενεργός (κλικ για σίγαση)' : 'Ήχος σε σίγαση (κλικ για ενεργοποίηση)'}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dadce0] bg-[#fbfaf8] text-[#415069] hover:border-[#008361] hover:text-[#008361] dark:border-[#1e355b] dark:bg-[#122544] dark:text-slate-300 dark:hover:text-[#24d99a] transition-colors cursor-pointer"
                  >
                    {isSoundEnabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  <div>
                    <div className="text-[11px] font-medium text-[#727586] dark:text-slate-400">
                      Τρέχουσα Βαθμολογία
                    </div>
                    <motion.div
                      key={score}
                      initial={{ scale: 0.9, opacity: 0.7 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                      className="font-mono text-xl font-bold text-[#122544] dark:text-white tabular-nums"
                    >
                      {score} / {quizQuestions.length}
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Progress Track */}
              {(() => {
                const progressPercentage =
                  quizQuestions.length > 0
                    ? Math.round((answeredCount / quizQuestions.length) * 100)
                    : 0;

                return (
                  <div className="mt-5">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#008361] dark:text-[#24d99a]">
                        Κάλυψη: {currentQuestion.branchShort} ({currentQuestion.branch})
                      </span>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="text-[11px] text-[#727586] dark:text-slate-400">
                          {answeredCount} / {quizQuestions.length} απαντήθηκαν
                        </span>
                        <span className="rounded-md bg-[#def4f0] px-2 py-0.5 text-[11px] font-bold text-[#008361] dark:bg-[#008361]/25 dark:text-[#24d99a]">
                          {progressPercentage}%
                        </span>
                      </div>
                    </div>

                    {/* Continuous Smooth Fill Bar */}
                    <div
                      role="progressbar"
                      aria-label="Πρόοδος ολοκλήρωσης κουίζ"
                      aria-valuemin={0}
                      aria-valuemax={quizQuestions.length}
                      aria-valuenow={answeredCount}
                      className="h-3 w-full overflow-hidden rounded-full border border-[#dadce0]/60 bg-slate-100 dark:border-[#1e355b] dark:bg-[#122544]"
                    >
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#008361] via-[#1ba475] to-[#00b090]"
                        initial={false}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>

                  {/* 7-Step Segment Markers */}
                  <div
                    className="mt-2 grid gap-1.5"
                    style={{
                      gridTemplateColumns: `repeat(${quizQuestions.length}, minmax(0, 1fr))`,
                    }}
                    aria-hidden="true"
                  >
                    {quizQuestions.map((q, idx) => {
                      const ans = selectedAnswers[q.id];
                      const isAnswered = ans !== undefined;
                      const isCorrect = ans === q.correctIndex;
                      const isCurrent = idx === currentIndex;

                      return (
                        <div
                          key={q.id}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isAnswered
                              ? isCorrect
                                ? 'bg-[#008361] dark:bg-[#1ba475]'
                                : 'bg-rose-500 dark:bg-rose-400'
                              : isCurrent
                              ? 'bg-[#008361]/35 dark:bg-[#24d99a]/40'
                              : 'bg-slate-200 dark:bg-[#1e355b]'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Animated Question Frame */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6"
              >
                <h2 className="text-lg sm:text-xl font-bold text-[#122544] dark:text-white leading-snug text-balance">
                  {currentQuestion.question}
                </h2>

                {/* 4 Multiple Choice Options */}
                <div className="mt-5 space-y-3">
                  {currentQuestion.options.map((optionText, idx) => {
                    const isSelected = selectedOptionForCurrent === idx;
                    const isCorrect = idx === currentQuestion.correctIndex;

                    let buttonClasses =
                      'border-[#dadce0] bg-[#fbfaf8] text-[#0b1424] hover:border-[#008361] hover:bg-[#def4f0]/30 dark:border-[#1e355b] dark:bg-[#122544]/40 dark:text-slate-100 dark:hover:border-[#00b090]';

                    if (hasAnsweredCurrent) {
                      if (isCorrect) {
                        buttonClasses =
                          'border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100';
                      } else if (isSelected && !isCorrect) {
                        buttonClasses =
                          'border-rose-400 bg-rose-50 text-rose-950 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100';
                      } else {
                        buttonClasses =
                          'border-[#dadce0]/60 bg-white/60 text-[#727586] opacity-75 dark:border-[#1e355b]/60 dark:bg-[#0f1d33] dark:text-slate-400';
                      }
                    }

                    return (
                      <motion.button
                        key={idx}
                        type="button"
                        disabled={hasAnsweredCurrent}
                        onClick={() => handleSelectOption(idx)}
                        whileHover={!hasAnsweredCurrent ? { y: -1, scale: 1.004 } : undefined}
                        whileTap={!hasAnsweredCurrent ? { scale: 0.99 } : undefined}
                        transition={{ duration: 0.14 }}
                        className={`flex w-full min-h-[48px] items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[#008361] ${
                          hasAnsweredCurrent ? 'cursor-default' : 'cursor-pointer'
                        } ${buttonClasses}`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${
                              hasAnsweredCurrent && isCorrect
                                ? 'bg-emerald-600 text-white'
                                : hasAnsweredCurrent && isSelected && !isCorrect
                                ? 'bg-rose-600 text-white'
                                : 'bg-white border border-[#dadce0] text-[#122544] dark:bg-[#1e355b] dark:border-[#2a4575] dark:text-slate-200'
                            }`}
                          >
                            {OPTION_LETTERS[idx]}
                          </span>
                          <span className="font-medium leading-relaxed">{optionText}</span>
                        </div>

                        {hasAnsweredCurrent && isCorrect && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.18 }}
                            className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Σωστή</span>
                          </motion.div>
                        )}
                        {hasAnsweredCurrent && isSelected && !isCorrect && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.18 }}
                            className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-rose-700 dark:text-rose-300"
                          >
                            <XCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">Λάθος</span>
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Immediate Answer Explanation & Next Action */}
                <AnimatePresence>
                  {hasAnsweredCurrent && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-6 rounded-xl border border-[#dadce0] bg-[#f8f7f4] p-5 dark:border-[#1e355b] dark:bg-[#122544]/60"
                    >
                      <div className="flex items-center gap-2">
                        {selectedOptionForCurrent === currentQuestion.correctIndex ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                              Το γνωρίζατε σωστά!
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span className="text-sm font-bold text-rose-800 dark:text-rose-300">
                              Χρήσιμη ανακάλυψη! Η σωστή απάντηση είναι η επιλογή{' '}
                              {OPTION_LETTERS[currentQuestion.correctIndex]}
                            </span>
                          </>
                        )}
                      </div>

                      <p className="mt-2.5 text-sm text-[#0b1424] dark:text-slate-200 leading-relaxed">
                        {currentQuestion.explanation}
                      </p>

                      <div className="mt-3 flex items-start gap-2 text-xs font-medium text-[#008361] dark:text-[#24d99a]">
                        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{currentQuestion.practicalTip}</span>
                      </div>

                      <div className="mt-5 flex items-center justify-end">
                        <motion.button
                          type="button"
                          onClick={handleNextQuestion}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#008361] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#006e52] transition-colors whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
                        >
                          <span>
                            {currentIndex < quizQuestions.length - 1
                              ? 'Επόμενη Ερώτηση'
                              : 'Ολοκλήρωση & Τελική Βαθμολογία'}
                          </span>
                          <ArrowRight className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Question Progress Overview Strip */}
          <div className={`grid gap-2 ${progressGridColsClass}`}>
            {quizQuestions.map((q, idx) => {
              const ans = selectedAnswers[q.id];
              const isCurrent = idx === currentIndex;
              const isDone = ans !== undefined;
              const isRight = ans === q.correctIndex;

              return (
                <div
                  key={q.id}
                  className={`rounded-xl border px-3 py-2.5 text-xs transition-colors ${
                    isCurrent
                      ? 'border-[#008361] bg-white dark:bg-[#0f1d33] font-bold text-[#122544] dark:text-white'
                      : 'border-[#dadce0]/80 bg-white/70 dark:border-[#1e355b] dark:bg-[#0f1d33]/60 text-[#415069] dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 font-mono text-[11px] tabular-nums">
                    <span>
                      {idx + 1}/{quizQuestions.length}
                    </span>
                    {isDone ? (
                      isRight ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      )
                    ) : (
                      <span className="text-[10px] text-[#727586] dark:text-slate-500">
                        {isCurrent ? 'Ενεργή' : 'Εκκρεμεί'}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate font-medium text-[#122544] dark:text-slate-200">
                    {q.branchShort}
                  </div>
                </div>
              );
            })}
          </div>
          </motion.div>
        ) : (
          /* FINAL SCORECARD & EXPLANATIONS */
          <motion.div
            key="completed-scorecard"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            {/* Score Summary Card */}
            <div className="rounded-2xl border border-[#dadce0] bg-white p-6 sm:p-8 shadow-xs dark:border-[#1e355b] dark:bg-[#0f1d33]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#dadce0]/70 dark:border-[#1e355b]">
                <div className="max-w-xl">
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.08 }}
                    className="flex items-center gap-2 text-xs font-semibold text-[#008361] dark:text-[#24d99a]"
                  >
                    <motion.span
                      initial={{ scale: 0.5, rotate: -15 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.12 }}
                      className="inline-flex"
                    >
                      <Award className="h-4 w-4" />
                    </motion.span>
                    <span>Αποτέλεσμα Κουίζ · {currentTopicMeta.label}</span>
                  </motion.div>
                  <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#122544] dark:text-white text-balance">
                    {getPerformanceTier(score, quizQuestions.length).title}
                  </h1>
                  <p className="mt-2 text-sm text-[#415069] dark:text-slate-300 leading-relaxed">
                    {getPerformanceTier(score, quizQuestions.length).subtitle}
                  </p>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.12 }}
                  className="flex items-center gap-5 rounded-xl border border-[#dadce0] bg-[#f8f7f4] px-6 py-4 dark:border-[#1e355b] dark:bg-[#122544]/60 shrink-0 self-start md:self-auto"
                >
                  <div className="text-center">
                    <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#122544] dark:text-white tabular-nums">
                      {score}
                      <span className="text-lg font-normal text-[#727586] dark:text-slate-400">
                        /{quizQuestions.length}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[#727586] dark:text-slate-400">
                      Τελική Βαθμολογία
                    </div>
                  </div>
                  <div className="h-10 w-px bg-[#dadce0] dark:bg-[#1e355b]" />
                  <div className="text-center">
                    <div className="font-mono text-2xl font-bold text-[#008361] dark:text-[#24d99a] tabular-nums">
                      {percentage}%
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[#727586] dark:text-slate-400">
                      Επιτυχία
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Question-by-Question Mastery Summary */}
              <div className="mt-5">
                <h2 className="text-xs font-semibold text-[#727586] dark:text-slate-400 mb-3">
                  Επίδοση ανά Ερώτηση:
                </h2>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {quizQuestions.map((q, qIdx) => {
                    const isRight = selectedAnswers[q.id] === q.correctIndex;
                    return (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.22,
                          delay: 0.1 + qIdx * 0.04,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
                          isRight
                            ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-100'
                            : 'border-rose-200 bg-rose-50/60 text-rose-950 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-100'
                        }`}
                      >
                        <span className="font-semibold truncate">
                          {qIdx + 1}. {q.branchShort}
                        </span>
                        <span className="flex items-center gap-1 font-bold shrink-0">
                          {isRight ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Σωστό</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                              <span>Ανακάλυψη</span>
                            </>
                          )}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-5 border-t border-[#dadce0]/70 dark:border-[#1e355b] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestartQuiz}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#008361] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#006e52] transition-colors whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Επανάληψη Κουίζ</span>
                </button>

                {selectedTopic !== 'general' && (
                  <button
                    type="button"
                    onClick={() => handleTopicChange('general')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#008361]/40 bg-[#def4f0]/40 px-4 py-2.5 text-xs font-bold text-[#008361] hover:bg-[#def4f0]/70 dark:border-[#008361]/50 dark:bg-[#008361]/20 dark:text-[#24d99a] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Δοκιμή Κουίζ Γενικών Γνώσεων</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onOpenAnalyzer && (
                  <button
                    type="button"
                    onClick={onOpenAnalyzer}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#dadce0] bg-white px-4 py-2.5 text-xs font-semibold text-[#122544] hover:bg-[#f5f3ee] dark:border-[#1e355b] dark:bg-[#122544] dark:text-white dark:hover:bg-[#1e355b] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-[#008361]" />
                    <span>Ανάλυση Συμβολαίου</span>
                  </button>
                )}

                {onBackToChat && (
                  <button
                    type="button"
                    onClick={onBackToChat}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#dadce0] bg-white px-4 py-2.5 text-xs font-semibold text-[#122544] hover:bg-[#f5f3ee] dark:border-[#1e355b] dark:bg-[#122544] dark:text-white dark:hover:bg-[#1e355b] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-[#008361]" />
                    <span>Ρωτήστε τον Ψηφιακό Σύμβουλο</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Q&A Explanations Section */}
          <div className="rounded-2xl border border-[#dadce0] bg-white p-6 sm:p-8 shadow-xs dark:border-[#1e355b] dark:bg-[#0f1d33]">
            <div className="border-b border-[#dadce0]/70 pb-5 dark:border-[#1e355b]">
              <h2 className="text-lg sm:text-xl font-bold text-[#122544] dark:text-white">
                Αναλυτική Επεξήγηση των {quizQuestions.length} Ερωτήσεων & Απαντήσεών σας
              </h2>
              <p className="mt-1 text-xs text-[#727586] dark:text-slate-400">
                Μελετήστε τη σωστή απάντηση και τι κερδίζετε στην πράξη για κάθε ερώτηση που απαντήσατε.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              {quizQuestions.map((q, idx) => {
                  const userAnswerIdx = selectedAnswers[q.id];
                  const hasUserAnswer = userAnswerIdx !== undefined;
                  const isRight = userAnswerIdx === q.correctIndex;

                  return (
                    <div
                      key={q.id}
                      className="border-b border-[#dadce0]/60 pb-6 last:border-b-0 last:pb-0 dark:border-[#1e355b]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#727586] dark:text-slate-400">
                          <span className="font-mono font-bold tabular-nums text-[#008361] dark:text-[#24d99a]">
                            Ερώτηση {idx + 1}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#122544] dark:text-slate-200">
                            {q.branch}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{q.branchShort}</span>
                        </div>

                        {hasUserAnswer && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold ${
                              isRight
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {isRight ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Το γνωρίζατε σωστά</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3.5 w-3.5" />
                                <span>
                                  Επιλέξατε {OPTION_LETTERS[userAnswerIdx]} (Σωστό:{' '}
                                  {OPTION_LETTERS[q.correctIndex]})
                                </span>
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1.5 text-base font-bold text-[#122544] dark:text-white leading-snug">
                        {q.question}
                      </h3>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrectOpt = optIdx === q.correctIndex;
                          const isUserWrongOpt =
                            hasUserAnswer && userAnswerIdx === optIdx && !isCorrectOpt;

                          return (
                            <div
                              key={optIdx}
                              className={`flex items-start gap-2 rounded-xl border p-3 text-xs leading-relaxed ${
                                isCorrectOpt
                                  ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
                                  : isUserWrongOpt
                                  ? 'border-rose-300 bg-rose-50/70 text-rose-950 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100'
                                  : 'border-[#dadce0]/70 bg-[#fbfaf8] text-[#415069] dark:border-[#1e355b] dark:bg-[#122544]/30 dark:text-slate-300'
                              }`}
                            >
                              <span className="font-mono font-bold shrink-0">
                                {OPTION_LETTERS[optIdx]}.
                              </span>
                              <span className="flex-1">{opt}</span>
                              {isCorrectOpt && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              )}
                              {isUserWrongOpt && (
                                <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 rounded-xl bg-[#f8f7f4] p-4 text-xs text-[#0b1424] dark:bg-[#122544]/50 dark:text-slate-200 leading-relaxed space-y-2">
                        <p>
                          <strong className="text-[#122544] dark:text-white">
                            Αναλυτική Επεξήγηση:{' '}
                          </strong>
                          {q.explanation}
                        </p>
                        <p className="flex items-start gap-1.5 text-[#008361] dark:text-[#24d99a] font-medium">
                          <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>Τι κερδίζετε στην πράξη: {q.practicalTip}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </MotionConfig>
  );
};
