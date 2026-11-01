/*
 * <Icon name="pills.fill" /> — keyed by SF Symbol name.
 * SF Symbols may only be used in apps for Apple platforms, so on the web each name maps to an
 * open-licensed equivalent (Phosphor Icons, MIT). The native iOS client (Faz 7) uses real SF Symbols
 * with the same names. A ".fill" suffix selects the filled weight.
 */
import {
  Barcode,
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  Clock,
  Eye,
  EyeSlash,
  Key,
  ShieldCheck,
  FileMagnifyingGlass,
  ForkKnife,
  Heartbeat,
  House,
  Info,
  Keyboard,
  Leaf,
  MagnifyingGlass,
  MinusCircle,
  Pill,
  Plus,
  PlusCircle,
  Question,
  SignOut,
  Stethoscope,
  Trash,
  UserCircle,
  Warning,
  WarningOctagon,
  X,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

const SYMBOLS = {
  house: House,
  pills: Pill,
  "fork.knife": ForkKnife,
  "person.crop.circle": UserCircle,
  "barcode.viewfinder": Barcode,
  keyboard: Keyboard,
  "doc.text.viewfinder": FileMagnifyingGlass,
  "checkmark.circle": CheckCircle,
  "exclamationmark.triangle": Warning,
  "xmark.octagon": WarningOctagon,
  "questionmark.circle": Question,
  "chevron.right": CaretRight,
  "chevron.left": CaretLeft,
  checkmark: Check,
  plus: Plus,
  "plus.circle": PlusCircle,
  "minus.circle": MinusCircle,
  xmark: X,
  trash: Trash,
  "heart.text.square": Heartbeat,
  "info.circle": Info,
  clock: Clock,
  eye: Eye,
  "eye.slash": EyeSlash,
  key: Key,
  "lock.shield": ShieldCheck,
  magnifyingglass: MagnifyingGlass,
  stethoscope: Stethoscope,
  leaf: Leaf,
  "rectangle.portrait.and.arrow.right": SignOut,
} satisfies Record<string, PhosphorIcon>;

type BaseName = keyof typeof SYMBOLS;
export type SymbolName = BaseName | `${BaseName}.fill`;

export interface IconProps {
  name: SymbolName;
  /** Accessible name. Omit for decorative icons next to visible text. */
  label?: string;
  className?: string;
  size?: number | string;
}

export function Icon({ name, label, className, size = "1em" }: IconProps) {
  const filled = name.endsWith(".fill");
  const base = (filled ? name.slice(0, -".fill".length) : name) as BaseName;
  const Glyph = SYMBOLS[base];
  return (
    <Glyph
      className={className}
      size={size}
      weight={filled ? "fill" : "regular"}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
    />
  );
}
