import type { FindingStatus } from "@/domain/types";
import { Icon, type SymbolName } from "./Icon";

/** Each status has its own color, shape and word, so it never relies on color alone. */
export const STATUS: Record<FindingStatus, { label: string; icon: SymbolName }> = {
  pass: { label: "Uygun", icon: "checkmark.circle.fill" },
  caution: { label: "Dikkat", icon: "exclamationmark.triangle.fill" },
  high: { label: "Yüksek risk", icon: "xmark.octagon.fill" },
  error: { label: "Kontrol edilemedi", icon: "questionmark.circle.fill" },
};

export function StatusBadge({ status }: { status: FindingStatus }) {
  const { label, icon } = STATUS[status];
  return (
    <span className={`status status--${status}`}>
      <Icon name={icon} />
      {label}
    </span>
  );
}

export function FindingItem({
  status,
  title,
  detail,
}: {
  status: FindingStatus;
  title: string;
  detail?: string | null;
}) {
  const { label, icon } = STATUS[status];
  return (
    <li>
      <div className={`list-row finding finding--${status}`}>
        <Icon name={icon} className="finding__icon" />
        <span className="finding__body">
          <span className="finding__label">{label}</span>
          <span className="finding__title">{title}</span>
          {detail ? <span className="finding__detail">{detail}</span> : null}
        </span>
      </div>
    </li>
  );
}
