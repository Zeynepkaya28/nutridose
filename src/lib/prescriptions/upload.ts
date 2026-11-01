// Browser-side prescription upload: the file goes straight to the private bucket; the API only gets the path.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { MAX_PRESCRIPTION_BYTES, PRESCRIPTION_BUCKET, PRESCRIPTION_MIME } from "./constants";

export class PrescriptionUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrescriptionUploadError";
  }
}

/**
 * True for a PDF. Some phones (Android file pickers, iOS Files) report an empty or generic type,
 * so a ".pdf" name is accepted too; the server still checks the file's "%PDF-" signature.
 */
export function isPdfFile(file: { type: string; name?: string }): boolean {
  if (file.type === PRESCRIPTION_MIME) return true;
  const generic = file.type === "" || file.type === "application/octet-stream" || file.type === "binary/octet-stream";
  return generic && /.pdf$/i.test(file.name ?? "");
}

/** Returns a Turkish error message, or null when the file can be uploaded. */
export function validatePrescriptionFile(file: { type: string; size: number; name?: string }): string | null {
  if (file.type.startsWith("image/")) {
    return "Fotoğraf yüklenemiyor. e-Nabız veya eczaneden aldığınız PDF reçeteyi seçin ya da ilaç adlarını “Elle yaz” ile girin.";
  }
  if (!isPdfFile(file)) return "Lütfen PDF formatında bir reçete seçin.";
  if (file.size === 0) return "Seçilen dosya boş.";
  if (file.size > MAX_PRESCRIPTION_BYTES) return "Reçete dosyası 5 MB'tan büyük olamaz.";
  return null;
}

/** {user_id}/{uuid}.pdf — the same shape the storage policy enforces. */
export function prescriptionPath(userId: string, id: string = crypto.randomUUID()): string {
  return `${userId}/${id}.pdf`;
}

export async function uploadPrescription(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<string> {
  const problem = validatePrescriptionFile(file);
  if (problem) throw new PrescriptionUploadError(problem);
  const path = prescriptionPath(userId);
  // Storage takes the type from the Blob itself, not from `contentType`. Phones often report "" or
  // application/octet-stream for PDFs, which the PDF-only bucket rejects, so re-label it explicitly.
  const body = file.type === PRESCRIPTION_MIME ? file : new Blob([file], { type: PRESCRIPTION_MIME });
  const { error } = await supabase.storage
    .from(PRESCRIPTION_BUCKET)
    .upload(path, body, { contentType: PRESCRIPTION_MIME, upsert: false });
  if (error) {
    reportUploadFailure(error.message);
    throw new PrescriptionUploadError("Reçete yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.");
  }
  return path;
}

/** Sends the storage error text (never the file or its contents) to the server log. */
function reportUploadFailure(message: string) {
  if (typeof fetch === "undefined" || typeof window === "undefined") return;
  void fetch("/api/client-error", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: `prescription upload: ${message}`.slice(0, 500), path: window.location.pathname }),
  }).catch(() => undefined);
}
