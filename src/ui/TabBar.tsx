"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type SymbolName } from "./Icon";

const TABS: Array<{ href: string; label: string; icon: SymbolName; match: (path: string) => boolean }> = [
  { href: "/", label: "Bugün", icon: "house.fill", match: (p) => p === "/" },
  { href: "/ilaclarim", label: "İlaçlarım", icon: "pills.fill", match: (p) => p.startsWith("/ilaclarim") },
  { href: "/ogunler", label: "Öğünler", icon: "fork.knife", match: (p) => p.startsWith("/ogunler") || p.startsWith("/analiz") },
  { href: "/profil", label: "Profil", icon: "person.crop.circle.fill", match: (p) => p.startsWith("/profil") },
];

/** Floating glass capsule above the content. Always visible; modals (top layer) cover it. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Ana sekmeler">
      <ul className="tabbar__list">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link href={tab.href} className="tabbar__item" aria-current={active ? "page" : undefined}>
                <Icon name={tab.icon} />
                <span className="tabbar__label">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
