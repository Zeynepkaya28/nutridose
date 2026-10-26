import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type SymbolName } from "./Icon";

export function ListSection({
  header,
  footer,
  children,
  id,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  const headingId = id ? `${id}-header` : undefined;
  return (
    <section className="list-section" aria-labelledby={header ? headingId : undefined}>
      {header ? (
        <h2 className="list-section__header" id={headingId}>
          {header}
        </h2>
      ) : null}
      <ul className="list">{children}</ul>
      {footer ? <p className="list-section__footer">{footer}</p> : null}
    </section>
  );
}

type Accessory = "chevron" | "check" | "none";

export interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  detail?: ReactNode;
  icon?: SymbolName;
  /** Background of the rounded icon square, e.g. "var(--system-red)". */
  iconColor?: string;
  /** chevron = opens a sub page; check = selected item. */
  accessory?: Accessory;
  href?: string;
  onClick?: () => void;
  buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  tone?: "default" | "tint" | "destructive";
  trailing?: ReactNode;
  /** For selectable rows (role="checkbox" / aria-checked). */
  checked?: boolean;
}

function RowInner({ title, subtitle, detail, icon, iconColor, accessory = "none", trailing, checked }: ListRowProps) {
  return (
    <>
      {icon ? (
        <span className="list-row__icon" style={iconColor ? ({ "--icon-bg": iconColor } as React.CSSProperties) : undefined}>
          <Icon name={icon} />
        </span>
      ) : null}
      <span className="list-row__content">
        <span className="list-row__text">
          <span className="list-row__title">{title}</span>
          {subtitle ? <span className="list-row__subtitle">{subtitle}</span> : null}
        </span>
        {detail ? <span className="list-row__detail">{detail}</span> : null}
      </span>
      {trailing}
      {accessory === "chevron" ? (
        <span className="list-row__accessory">
          <Icon name="chevron.right" />
        </span>
      ) : null}
      {accessory === "check" ? (
        <span className="list-row__accessory list-row__accessory--check">
          {checked ? <Icon name="checkmark" /> : <span style={{ width: "1.25rem" }} />}
        </span>
      ) : null}
    </>
  );
}

export function ListRow(props: ListRowProps) {
  const { href, onClick, buttonProps, tone = "default", icon } = props;
  const className = [
    "list-row",
    icon ? "list-row--has-icon" : "",
    tone === "destructive" ? "list-row--destructive" : "",
    tone === "tint" ? "list-row--tint" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <li>
        <Link href={href} className={className}>
          <RowInner {...props} />
        </Link>
      </li>
    );
  }
  if (onClick || buttonProps) {
    const selectable = props.accessory === "check";
    return (
      <li>
        <button
          type="button"
          className={className}
          onClick={onClick}
          role={selectable ? "checkbox" : undefined}
          aria-checked={selectable ? Boolean(props.checked) : undefined}
          {...buttonProps}
        >
          <RowInner {...props} />
        </button>
      </li>
    );
  }
  return (
    <li>
      <div className={className}>
        <RowInner {...props} />
      </div>
    </li>
  );
}
