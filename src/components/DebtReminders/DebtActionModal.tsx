import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, X } from 'lucide-react';

interface ConfirmDialogState {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  title?: string;
}

interface DebtActionModalProps {
  confirmDialog: ConfirmDialogState | null;
  setConfirmDialog: (state: ConfirmDialogState | null) => void;
}

export default function DebtActionModal({ confirmDialog, setConfirmDialog }: DebtActionModalProps) {
  return (
    <AnimatePresence>
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="bg-white dark:bg-slate-900 border-4 border-slate-950 rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl relative"
          >
            {/* Header/Banner decorative style */}
            <div className="bg-orange-400 border-b-4 border-slate-950 p-4 flex items-center justify-between text-slate-950">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-slate-950" />
                <h3 className="font-black text-xs uppercase tracking-tight">{confirmDialog.title || "Xác nhận"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="rounded-full bg-white/45 hover:bg-white/60 p-1 cursor-pointer transition-all border border-slate-950"
                title="Đóng hộp thoại"
              >
                <X className="w-4 h-4 text-slate-950" />
              </button>
            </div>

            {/* Main content body */}
            <div className="p-6 space-y-4">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed text-center">
                {confirmDialog.message}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs py-2.5 rounded-xl border-2 border-slate-950 shadow-sm transition-all active:translate-y-0.5 cursor-pointer text-center"
                >
                  Bỏ qua
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-black text-xs py-2.5 rounded-xl border-2 border-slate-950 shadow-sm transition-all active:translate-y-0.5 cursor-pointer text-center"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
