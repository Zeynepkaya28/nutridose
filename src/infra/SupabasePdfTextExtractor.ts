import type { SupabaseClient } from "@supabase/supabase-js";
import type { PdfTextExtractor } from "@/domain";
import { MAX_PRESCRIPTION_BYTES, PRESCRIPTION_BUCKET, PRESCRIPTION_MIME } from "@/lib/prescriptions/constants";
import type { Database } from "@/lib/supabase/types";
import { MESSAGES, UserFacingError } from "@/server/errors";

export type PdfParse = (data: Uint8Array) => Promise<string>;

/** Default parser. Loaded lazily so the PDF library is only pulled in for prescription analyses. */
export const parsePdfText: PdfParse = async (data) => {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
};

export function looksLikePdf(bytes: Uint8Array): boolean {
  // "%PDF-"
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

/** Downloads the user's own prescription (RLS-protected storage) and extracts its text. */
export class SupabasePdfTextExtractor implements PdfTextExtractor {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly userId: string,
    private readonly parse: PdfParse = parsePdfText,
  ) {}

  async extractText(storagePath: string): Promise<string> {
    if (storagePath.split("/")[0] !== this.userId) {
      throw new UserFacingError(MESSAGES.prescriptionNotFound, 404);
    }
    const { data, error } = await this.supabase.storage.from(PRESCRIPTION_BUCKET).download(storagePath);
    if (error || !data) throw new UserFacingError(MESSAGES.prescriptionNotFound, 404, { cause: error });
    if (data.size > MAX_PRESCRIPTION_BYTES) throw new UserFacingError(MESSAGES.prescriptionTooLarge, 413);
    if (data.type && data.type !== PRESCRIPTION_MIME) throw new UserFacingError(MESSAGES.prescriptionNotPdf, 415);

    const bytes = new Uint8Array(await data.arrayBuffer());
    if (!looksLikePdf(bytes)) throw new UserFacingError(MESSAGES.prescriptionNotPdf, 415);
    try {
      return await this.parse(bytes);
    } catch (cause) {
      throw new UserFacingError(MESSAGES.prescriptionUnreadable, 422, { cause });
    }
  }
}
