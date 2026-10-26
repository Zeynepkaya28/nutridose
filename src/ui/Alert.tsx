"use client";

import { useEffect, useId, useRef } from "react";
import { Icon, type SymbolName } from "./Icon";

export interface AlertAction {
  label: string;
  role?: "default" | "cancel" | "destructive";
  onSelect: () => void;
}

export interface AlertProps {
  open: boolean;
  title: string;
  message: string;
  icon?: SymbolName;
  actions: AlertAction[];
}

/**
 * Centered alert. Buttons stack vertically: the default action on top, "Vazgeç" (cancel) at the bottom.
 * Escape triggers the cancel action. Use only for the critical interaction (requiresAlert).
 */
export function Alert({ open, title, message, icon, actions }: AlertProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();
  const ordered = [
    ...actions.filter((a) => a.role === "default"),
    ...actions.filter((a) => a.role !== "default" && a.role !== "cancel"),
    ...actions.filter((a) => a.role === "cancel"),
  ];
  const cancel = actions.find((a) => a.role === "cancel");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="alert"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        cancel?.onSelect();
      }}
    >
      <div className="alert__content">
        {icon ? <Icon name={icon} className="alert__icon" /> : null}
        <h2 className="alert__title" id={titleId}>
          {title}
        </h2>
        <p className="alert__message" id={messageId}>
          {message}
        </p>
      </div>
      <div className="alert__actions">
        {ordered.map((action) => (
          <button
            key={action.label}
            type="button"
            autoFocus={action.role === "default"}
            className={`alert__action alert__action--${action.role ?? "plain"}`}
            onClick={action.onSelect}
          >
            {action.label}
          </button>
        ))}
      </div>
    </dialog>
  );
}
