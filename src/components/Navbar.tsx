import React from 'react';
import { Lock, Unlock, Moon, Sun, HelpCircle } from 'lucide-react';
import { CustomerView } from '../types';

interface NavbarProps {
  agencyName: string;
  isAdmin: boolean;
  showAdmin?: boolean;
  onOpenAdmin: () => void;
  onExitAdmin: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenHelp: () => void;
  customerView?: CustomerView;
  onSelectCustomerView?: (view: CustomerView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  agencyName,
  isAdmin,
  showAdmin = true,
  onOpenAdmin,
  onExitAdmin,
  isDark,
  onToggleTheme,
  onOpenHelp,
  customerView = 'chat',
  onSelectCustomerView,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#dadce0]/80 bg-white/95 backdrop-blur-md dark:border-[#1e355b] dark:bg-[#0b1424]/95 transition-colors">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6">
        {/* Zone 1: Official Brand Logo & Name */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center rounded-lg bg-white p-1 border border-[#dadce0] shadow-xs dark:border-[#1e355b]">
            <img
              src="/assets/aistudio/logo3_c604fd8a.jpg"
              alt="ΑΣΦΑΛΕΙΕΣ ΚΑΚΑΛΗΣ"
              className="h-9 sm:h-10 w-auto object-contain max-w-[130px] sm:max-w-[180px]"
            />
          </div>
          <div className="flex flex-col border-l border-[#dadce0] dark:border-[#1e355b] pl-3">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-[#122544] dark:text-white leading-tight">
              RiskPedia
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#415069] dark:text-slate-400">
              By Asfaleies Kakalis
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation / Tab Switcher */}
        <nav className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium overflow-x-auto">
          {isAdmin ? (
            <span className="flex items-center gap-1.5 text-[#008361] dark:text-[#24d99a] font-semibold bg-[#008361]/10 px-3 py-1.5 rounded-lg border border-[#008361]/20 whitespace-nowrap shrink-0">
              <Unlock className="h-3.5 w-3.5" />
              <span>Πίνακας Διαχείρισης Αρχείων</span>
            </span>
          ) : (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#122544] border border-[#dadce0]/70 dark:border-[#1e355b]">
              <button
                type="button"
                onClick={() => onSelectCustomerView?.('chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  customerView === 'chat'
                    ? 'bg-white dark:bg-[#1e355b] text-[#122544] dark:text-white shadow-2xs'
                    : 'text-[#415069] dark:text-slate-400 hover:text-[#0b1424] dark:hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">Συμβουλευτική Q&A</span>
                <span className="sm:hidden">Q&A</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectCustomerView?.('analyzer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  customerView === 'analyzer'
                    ? 'bg-[#008361] text-white shadow-xs'
                    : 'text-[#415069] dark:text-slate-400 hover:text-[#0b1424] dark:hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">Ανάλυση Συμβολαίου</span>
                <span className="sm:hidden">Συμβόλαιο</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectCustomerView?.('quiz')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  customerView === 'quiz'
                    ? 'bg-[#008361] text-white shadow-xs'
                    : 'text-[#415069] dark:text-slate-400 hover:text-[#0b1424] dark:hover:text-white'
                }`}
              >
                <span>Κουίζ Γνώσεων</span>
              </button>
            </div>
          )}
        </nav>

        {/* Zone 3: Primary Action & Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={onToggleTheme}
            aria-label={isDark ? 'Εναλλαγή σε φωτεινή λειτουργία' : 'Εναλλαγή σε σκοτεινή λειτουργία'}
            title={isDark ? 'Φωτεινή λειτουργία' : 'Σκοτεινή λειτουργία'}
            className={`relative inline-flex h-9 w-[62px] shrink-0 cursor-pointer items-center rounded-full border p-1 transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008361] ${
              isDark
                ? 'border-[#1e355b] bg-[#122544] shadow-inner'
                : 'border-[#dadce0] bg-[#f5f3ee] hover:border-[#122544]/30'
            }`}
          >
            {/* Ambient track icons */}
            <Sun
              className={`absolute left-2 h-3.5 w-3.5 transition-all duration-300 ${
                isDark ? 'text-slate-500 opacity-55 scale-90' : 'text-amber-500 opacity-0 scale-75'
              }`}
            />
            <Moon
              className={`absolute right-2 h-3.5 w-3.5 transition-all duration-300 ${
                isDark ? 'text-[#24d99a] opacity-0 scale-75' : 'text-[#415069] opacity-65 scale-90'
              }`}
            />

            {/* Sliding thumb */}
            <span
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-xs transition-all duration-300 ease-in-out ${
                isDark
                  ? 'translate-x-[24px] bg-[#008361] text-white rotate-0'
                  : 'translate-x-0 bg-white text-amber-500 rotate-0'
              }`}
            >
              {isDark ? (
                <Moon className="h-3.5 w-3.5 transition-transform duration-300" />
              ) : (
                <Sun className="h-3.5 w-3.5 transition-transform duration-300" />
              )}
            </span>
          </button>

          <button
            onClick={onOpenHelp}
            aria-label="Οδηγίες χρήσης"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dadce0] text-[#415069] hover:bg-[#f5f3ee] hover:text-[#0b1424] dark:border-[#1e355b] dark:text-slate-300 dark:hover:bg-[#122544] dark:hover:text-white transition-colors"
            title="Πληροφορίες & Οδηγίες"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {showAdmin &&
            (isAdmin ? (
              <button
                onClick={onExitAdmin}
                className="flex items-center gap-1.5 rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-xs font-semibold text-[#122544] hover:bg-[#f5f3ee] dark:border-[#1e355b] dark:bg-[#122544] dark:text-slate-200 dark:hover:bg-[#1e355b] transition-colors whitespace-nowrap"
              >
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <span>Κλείδωμα & Επιστροφή</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 rounded-lg bg-[#122544] hover:bg-[#1e355b] px-3.5 py-2 text-xs font-medium text-white dark:bg-[#008361] dark:hover:bg-[#006e52] transition-colors whitespace-nowrap shadow-xs"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Διαχείριση Αρχείων</span>
              </button>
            ))}
        </div>
      </div>
    </header>
  );
};
