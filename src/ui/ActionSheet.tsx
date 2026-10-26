"use client";

import { useEffect, useId, useRef } from "react";

export interface ActionSheetAction {
  label: string;
  role?: "destructive" | "default";
  onSelect: () => void;
}

export interface ActionSheetProps {
  open: boolean;
  title?: string;
  message?: string;
  actions: ActionSheetAction[];
  onCancel: () => void;
  cancelLabel?: string;
}

/** Bottom action sheet: grouped actions, with "Vazgeç" in its own group below (HIG › Action sheets). */
export function ActionSheet({ open, title, message, actions, onCancel, cancelLabel = "Vazgeç" }: ActionSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="action-sheet"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={message ? messageId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onCancel();
      }}
    >
      <div className="action-sheet__group">
        {title || message ? (
          <div className="action-sheet__header">
            {title ? (
              <h2 className="action-sheet__title" id={titleId}>
                {title}
              </h2>
            ) : null}
            {message ? (
              <p className="action-sheet__message" id={messageId}>
                {message}
              </p>
            ) : null}
          </div>
        ) : null}
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`action-sheet__action${action.role === "destructive" ? " action-sheet__action--destructive" : ""}`}
            onClick={action.onSelect}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className="action-sheet__group">
        <button type="button" className="action-sheet__action action-sheet__action--cancel" onClick={onCancel} autoFocus>
          {cancelLabel}
        </button>
      </div>
    </dialog>
  );
}
