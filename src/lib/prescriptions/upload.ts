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

/** Returns a Turkish error message, or null when the file can be uploaded. */
export function validatePrescriptionFile(file: Pick<File, "type" | "size">): string | null {
  if (file.type !== PRESCRIPTION_MIME) return "Lütfen PDF formatında bir reçete seçin.";
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
  const { error } = await supabase.storage
    .from(PRESCRIPTION_BUCKET)
    .upload(path, file, { contentType: PRESCRIPTION_MIME, upsert: false });
  if (error) throw new PrescriptionUploadError("Reçete yüklenemedi. Lütfen tekrar deneyin.");
  return path;
}
