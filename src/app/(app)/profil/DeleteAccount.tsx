"use client";

import { useState, useTransition } from "react";
import { ActionSheet } from "@/ui/ActionSheet";
import { ListRow } from "@/ui/List";
import { deleteMyAccount } from "../actions";

export function DeleteAccountRow() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <ListRow
        icon="trash"
        iconColor="var(--system-red)"
        title={pending ? "Siliniyor…" : "Hesabı ve verileri sil"}
        tone="destructive"
        onClick={() => setOpen(true)}
        buttonProps={{ disabled: pending }}
      />
      {error ? (
        <li>
          <p className="error-text" role="alert">
            {error}
          </p>
        </li>
      ) : null}
      <ActionSheet
        open={open}
        title="Hesabınız kalıcı olarak silinsin mi?"
        message="Profiliniz, ilaçlarınız, öğünleriniz, analizleriniz ve yüklediğiniz reçeteler silinir. Bu işlem geri alınamaz."
        onCancel={() => setOpen(false)}
        actions={[
          {
            label: "Hesabımı ve verilerimi sil",
            role: "destructive",
            onSelect: () => {
              setOpen(false);
              setError(null);
              startTransition(async () => {
                const result = await deleteMyAccount();
                // On success the action redirects; we only get here on failure.
                if (result && !result.ok) setError(result.error);
              });
            },
          },
        ]}
      />
    </>
  );
}
