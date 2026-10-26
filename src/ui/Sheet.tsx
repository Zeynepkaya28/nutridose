"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type Detent = "medium" | "large";

const DISMISS_DISTANCE = 120;
const EXPAND_DISTANCE = 60;

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  initialDetent?: Detent;
  /** Optional trailing header action (e.g. "Ekle"). */
  action?: ReactNode;
  cancelLabel?: string;
}

/**
 * Bottom sheet with medium/large detents, a grabber and "Vazgeç" on the leading side.
 * Built on <dialog>.showModal(): focus is trapped, Escape closes and the page behind is inert.
 * Drag the grabber/header down to dismiss (or to go from large to medium), up to expand.
 */
export function Sheet({ open, onClose, title, children, initialDetent = "medium", action, cancelLabel = "Vazgeç" }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [detent, setDetent] = useState<Detent>(initialDetent);
  const drag = useRef<{ startY: number; delta: number; pointerId: number } | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setDetent(initialDetent);
      dialog.showModal();
      // Start screen readers and keyboard focus at the sheet itself, not on the grabber.
      dialog.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, initialDetent]);

  const setDragOffset = (px: number) => ref.current?.style.setProperty("--sheet-drag", `${Math.max(0, px)}px`);

  const onPointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest("button:not(.sheet__grabber-hit)")) return;
    drag.current = { startY: event.clientY, delta: 0, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    ref.current?.setAttribute("data-dragging", "true");
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current.delta = event.clientY - drag.current.startY;
    setDragOffset(drag.current.delta);
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    const { delta } = drag.current;
    drag.current = null;
    ref.current?.removeAttribute("data-dragging");
    setDragOffset(0);
    if (delta > DISMISS_DISTANCE) {
      if (detent === "large" && delta < DISMISS_DISTANCE * 2.5) setDetent("medium");
      else onClose();
    } else if (delta < -EXPAND_DISTANCE) {
      setDetent("large");
    }
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      tabIndex={-1}
      data-detent={detent}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Tap on the dimmed backdrop closes the sheet.
        if (event.target !== ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const inside =
          event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        if (!inside) onClose();
      }}
    >
      <div
        className="sheet__handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          type="button"
          className="sheet__grabber-hit"
          aria-label={detent === "medium" ? "Sayfayı büyüt" : "Sayfayı küçült"}
          onClick={() => setDetent(detent === "medium" ? "large" : "medium")}
        >
          <span className="sheet__grabber" />
        </button>
        <div className="sheet__header">
          <button type="button" className="btn btn--plain" onClick={onClose}>
            {cancelLabel}
          </button>
          <h2 className="sheet__title" id={titleId}>
            {title}
          </h2>
          <div>{action}</div>
        </div>
      </div>
      <div className="sheet__body">{open ? children : null}</div>
    </dialog>
  );
}
