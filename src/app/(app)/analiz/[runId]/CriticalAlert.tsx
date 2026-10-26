"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/ui/Alert";

/** Shown once, right after an analysis with requiresAlert = true. */
export function CriticalAlert({ title, message }: { title: string; message: string }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const dismiss = () => {
    setOpen(false);
    // Drop ?uyari=1 so the alert does not come back on refresh.
    router.replace(pathname, { scroll: false });
  };

  return (
    <Alert
      open={open}
      icon="xmark.octagon.fill"
      title={title}
      message={message}
      actions={[
        {
          label: "Ayrıntıları gör",
          role: "default",
          onSelect: () => {
            dismiss();
            document.getElementById("step-drug_food")?.scrollIntoView({ block: "start" });
          },
        },
        { label: "Vazgeç", role: "cancel", onSelect: dismiss },
      ]}
    />
  );
}
