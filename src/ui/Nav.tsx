import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function LargeTitle({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: ReactNode }) {
  return (
    <header className="nav-large">
      <div>
        <h1 className="nav-large__title">{title}</h1>
        {subtitle ? <p className="nav-large__subtitle">{subtitle}</p> : null}
      </div>
      {trailing}
    </header>
  );
}

export function BackBar({ href, label }: { href: string; label: string }) {
  return (
    <nav className="nav-bar" aria-label="Gezinme">
      <Link href={href} className="nav-bar__back">
        <Icon name="chevron.left" />
        {label}
      </Link>
    </nav>
  );
}

export function Disclaimer() {
  return <p className="disclaimer">NutriDose tıbbi tavsiye yerine geçmez. Kararlarınızı doktorunuz veya eczacınızla verin.</p>;
}
