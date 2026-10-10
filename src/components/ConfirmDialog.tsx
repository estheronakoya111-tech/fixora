"use client";

import { AnimatePresence, motion } from "framer-motion";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/30 p-5 backdrop-blur-[2px]"
          onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
        >
          <motion.section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-lift sm:p-7"
          >
            <h2 id="confirm-dialog-title" className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
            <p id="confirm-dialog-description" className="mt-3 text-sm leading-6 text-muted">{description}</p>
            <div className="mt-7 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={onCancel} className="rounded-full border border-border-strong bg-surface-sunken px-4 py-2.5 text-sm font-medium transition-colors hover:bg-border">
                Cancel
              </button>
              <button type="button" onClick={onConfirm} className={`rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-colors ${danger ? "bg-danger hover:bg-danger/90" : "bg-positive hover:bg-positive-strong"}`}>
                {confirmLabel}
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
