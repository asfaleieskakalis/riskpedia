import React from 'react';
import { X, ShieldCheck, FileCheck, Lock, Sparkles, HelpCircle } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  showAdmin?: boolean;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, showAdmin = true }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex h-full max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            <span>Οδηγίες Χρήσης & Αρχές Λειτουργίας</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300 mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Απόλυτη Προστασία Εγγράφων & Πηγών</span>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-300">
              Ο πελάτης/επισκέπτης δεν έχει καμία πρόσβαση στα αρχεία σας, στα ονόματά τους ή σε αποσπάσματα κειμένου. Τα αρχεία παραμένουν κλειδωμένα στο παρασκήνιο και χρησιμοποιούνται αποκλειστικά για την εξαγωγή έγκυρων απαντήσεων.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white dark:bg-slate-100 dark:text-slate-900">
                1
              </span>
              <span>Πώς λειτουργεί για τον Πελάτη (Customer Mode)</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 pl-6">
              Ο ενδιαφερόμενος βλέπει μια καθαρή, φιλική οθόνη συνομιλίας. Μπορεί να γράψει την απορία του ή να μιλήσει στο μικρόφωνο (φωνητική ερώτηση στα Ελληνικά). Λαμβάνει άμεση και κατανοητή απάντηση. Εάν ένα θέμα δεν καλύπτεται από τα έγγραφα, το σύστημα δηλώνει με ειλικρίνεια ότι δεν υπάρχει διαθέσιμη πληροφορία.
            </p>
          </div>

          {showAdmin && (
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white dark:bg-slate-100 dark:text-slate-900">
                  2
                </span>
                <span>Πώς λειτουργεί για τον Διαχειριστή (Admin Mode)</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-6">
                Κάνοντας κλικ στο κουμπί <strong>«Διαχείριση Αρχείων»</strong> και εισάγοντας το PIN (προεπιλογή: <code>1234</code>), έχετε πρόσβαση στον κλειδωμένο πίνακα:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 pl-6 mt-1 space-y-1">
                <li><strong>Σύνδεση με Google Drive Path:</strong> Συνδέστε απευθείας τον φάκελο (path) από το Google Drive σας. Ο συγχρονισμός και η διαχείριση γίνονται μόνο από εσάς — κανένας πελάτης δεν βλέπει το σύνδεσμο ή τα αρχεία.</li>
                <li>Ανεβάστε τοπικά έγγραφα PDF, Word (.docx), Excel (.xlsx, .csv), TXT και εικόνες.</li>
                <li>Ενεργοποιήστε ή απενεργοποιήστε αρχεία με ένα κλικ.</li>
                <li>Προσαρμόστε το όνομα του γραφείου και τις συχνές ερωτήσεις.</li>
                <li>Αλλάξτε τον κωδικό PIN για μέγιστη ασφάλεια.</li>
              </ul>
            </div>
          )}

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white dark:bg-slate-100 dark:text-slate-900">
                {showAdmin ? 3 : 2}
              </span>
              <span>Υποστηριζόμενα Αρχεία</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 pl-6 mt-1 text-xs">
              <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                <strong>Έγγραφα:</strong> PDF, Word (.docx), TXT, Markdown
              </div>
              <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                <strong>Πίνακες & Εικόνες:</strong> Excel (.xlsx, .csv), PNG, JPG
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
            <h5 className="font-semibold text-slate-900 dark:text-white mb-0.5">
              RiskPedia By Asfaleies Kakalis
            </h5>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Υπεύθυνος: Παναγιώτης Κακαλής • Γραφεία: Βενιζέλου 39, Αλεξανδρούπολη (Έδρα: Νέα Χιλή)
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              <a href="tel:6974706731" className="hover:underline">Κινητό/WhatsApp: 6974706731</a>
              <a href="tel:2551151345" className="hover:underline">Σταθερό: 2551151345</a>
              <a href="mailto:asfaleieskakalis@gmail.com" className="hover:underline">asfaleieskakalis@gmail.com</a>
              <a href="https://asfaleieskakalis.com" target="_blank" rel="noopener noreferrer" className="hover:underline">asfaleieskakalis.com</a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
          >
            Κατάλαβα
          </button>
        </div>
      </div>
    </div>
  );
};
