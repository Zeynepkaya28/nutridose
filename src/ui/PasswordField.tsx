"use client";

import { useState } from "react";
import { Icon } from "./Icon";

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  describedBy,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        className="field"
        autoComplete={autoComplete}
        placeholder={label}
        required
        maxLength={72}
        aria-describedby={describedBy}
        spellCheck={false}
        autoCapitalize="none"
      />
      <button
        type="button"
        className="btn btn--plain btn--icon password-field__toggle"
        aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
        aria-pressed={visible}
        aria-controls={id}
        onClick={() => setVisible((v) => !v)}
      >
        <Icon name={visible ? "eye.slash" : "eye"} />
      </button>
    </div>
  );
}
