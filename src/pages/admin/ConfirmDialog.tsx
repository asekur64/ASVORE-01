import { AlertTriangle, X } from 'lucide-react';
import type { Language } from '../../types/index.ts';

interface ConfirmDialogProps {
  open: boolean;
  lang: Language;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  lang,
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#111113]/65 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-white dark:bg-[#17171A] border border-[#111113]/15 dark:border-white/15 p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 flex items-center justify-center shrink-0 ${
                destructive ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-[#B89352]/15 text-[#B89352]'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="font-display text-xl font-semibold text-[#111113] dark:text-[#FAF8F5]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="text-[#5C5B57] dark:text-[#FAF8F5]/60 hover:text-[#111113] dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-[#5C5B57] dark:text-[#FAF8F5]/75 leading-relaxed">{message}</p>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold border border-[#111113]/20 dark:border-white/20 text-[#111113] dark:text-[#FAF8F5] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer ${
              destructive
                ? 'bg-red-700 text-white hover:bg-red-800'
                : 'bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] hover:opacity-90'
            }`}
          >
            {confirmLabel || (lang === 'bn' ? 'নিশ্চিত করুন' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-5 space-y-3 animate-pulse">
      <div className="h-4 w-48 bg-[#111113]/10 dark:bg-white/10" />
      <div className="space-y-2.5 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 bg-[#111113]/5 dark:bg-white/5" />
        ))}
      </div>
    </div>
  );
}
