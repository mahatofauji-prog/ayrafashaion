import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        id="confirmation-modal-card"
        className="bg-[#0D0D0D] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D4AF37]/40 text-white transition-all transform scale-100"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {isDestructive ? (
              <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#18181B] border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#D4AF37]" />
              </div>
            )}
            <h3 className="text-lg font-serif font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-zinc-300 leading-relaxed">{message}</p>

        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            id="modal-cancel-button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-[#1A1A1A] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            id="modal-confirm-button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white transition-all shadow-sm ${
              isDestructive
                ? 'bg-rose-700 hover:bg-rose-800 active:bg-rose-900'
                : 'bg-[#D4AF37] hover:bg-[#C9A227] text-black font-extrabold'
            } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
