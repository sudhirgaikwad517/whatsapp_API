import React from 'react';
import { create } from 'zustand';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in red for destructive actions (delete, remove, revoke). */
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

const useConfirmStore = create<ConfirmState>(() => ({
  isOpen: false,
  title: '',
  message: '',
  resolve: null,
}));

/**
 * Promise-based replacement for `window.confirm()` — usable from anywhere
 * (no need to render a component locally):
 *
 *   const ok = await confirmAction({ title: 'Delete contact?', message: '...', danger: true });
 *   if (!ok) return;
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.setState({ ...options, isOpen: true, resolve });
  });
}

/** Mount once near the root of the app (see App.tsx). */
export const ConfirmDialogHost: React.FC = () => {
  const { isOpen, title, message, confirmLabel, cancelLabel, danger, resolve } = useConfirmStore();

  if (!isOpen) return null;

  const close = (result: boolean) => {
    resolve?.(result);
    useConfirmStore.setState({ isOpen: false, resolve: null });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close(false);
      }}
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 id="confirm-dialog-title" className="text-sm font-bold text-white">{title}</h3>
            <p id="confirm-dialog-message" className="text-xs text-slate-400">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            autoFocus
            onClick={() => close(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            {cancelLabel || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              danger ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
