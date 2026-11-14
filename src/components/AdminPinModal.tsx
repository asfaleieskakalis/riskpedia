import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, KeyRound, AlertCircle } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  correctPin,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === correctPin) {
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <Lock className="h-4 w-4 text-blue-600" />
            <span>Είσοδος Διαχειριστή</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center pt-2 pb-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs dark:border-slate-700">
            <img
              src="/assets/aistudio/logo1_f97c3b58.jpg"
              alt="ΑΣΦΑΛΕΙΕΣ ΚΑΚΑΛΗΣ"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="mt-2 text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
            RiskPedia
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            By Asfaleies Kakalis • Πύλη Διαχειριστή
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-2">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed text-center">
            Εισάγετε τον κωδικό PIN για αποκλειστική πρόσβαση στα αρχεία και στο Google Drive.
          </p>

          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Κωδικός PIN
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="••••"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-center text-lg tracking-widest font-mono text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-white ${
                  error
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700'
                }`}
              />
              <KeyRound className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Λανθασμένος κωδικός PIN. Δοκιμάστε ξανά.</span>
              </div>
            )}
          </div>

          <div className="mt-3 rounded-lg bg-[#def4f0] p-2.5 text-[11px] text-[#008361] dark:bg-[#008361]/20 dark:text-[#24d99a]">
            <strong>Προεπιλεγμένο PIN:</strong> 1234 (Μπορείτε να το αλλάξετε μέσα στις ρυθμίσεις).
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3.5 py-2 text-xs font-medium text-[#415069] hover:bg-[#f5f3ee] dark:text-slate-400 dark:hover:bg-[#122544]"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={!pin.trim()}
              className="rounded-lg bg-[#122544] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1e355b] dark:bg-[#008361] dark:hover:bg-[#006e52] disabled:opacity-50 transition-colors shadow-xs"
            >
              Είσοδος
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
