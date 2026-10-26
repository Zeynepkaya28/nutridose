import { hasPublicSupabaseEnv } from "@/lib/supabase/env";

export default function Home() {
  const connected = hasPublicSupabaseEnv();
  return (
    <main style={{ padding: "max(1rem, env(safe-area-inset-top)) 1rem 1rem" }}>
      <h1 style={{ fontSize: "2.125rem", lineHeight: "2.5625rem", fontWeight: 700, margin: 0 }}>
        NutriDose
      </h1>
      <p style={{ color: "var(--secondary-label)", fontSize: "1.0625rem" }}>
        İskelet hazır. Supabase yapılandırması: {connected ? "tanımlı" : "eksik (.env.local)"}
      </p>
    </main>
  );
}
