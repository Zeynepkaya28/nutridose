// Request/response contract of POST /api/analyze. Shared by the route, the web client and tests.
import { z } from "zod";
import type { AnalysisStep, FindingStatus, Severity } from "@/domain/types";

const mealId = z.uuid().optional();

export const AnalyzeRequestSchema = z.discriminatedUnion("inputKind", [
  z.object({
    inputKind: z.literal("barcode"),
    payload: z.object({ barcode: z.string().trim().min(1).max(32) }),
    mealId,
  }),
  z.object({
    inputKind: z.literal("manual"),
    payload: z.object({ text: z.string().trim().min(1).max(2000) }),
    mealId,
  }),
  z.object({
    inputKind: z.literal("prescription_pdf"),
    payload: z.object({ storagePath: z.string().trim().min(1).max(200) }),
    mealId,
  }),
]);

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export interface FindingDto {
  step: AnalysisStep;
  status: FindingStatus;
  severity: Severity | null;
  title: string;
  detail: string | null;
  /** Sentence written for the user's treatment profile. */
  message: string;
  interactionId: string | null;
}

export interface AnalyzeResponse {
  runId: string;
  findings: FindingDto[];
  requiresAlert: boolean;
}

export interface AnalyzeErrorResponse {
  error: string;
}

/** Browser helper. Throws an Error with the Turkish message from the API. */
export async function requestAnalysis(body: AnalyzeRequest, init: RequestInit = {}): Promise<AnalyzeResponse> {
  const response = await fetch("/api/analyze", {
    ...init,
    method: "POST",
    headers: { "content-type": "application/json", ...init.headers },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as AnalyzeResponse | AnalyzeErrorResponse | null;
  if (!response.ok || !json || "error" in json) {
    throw new Error(json && "error" in json ? json.error : "Analiz şu anda yapılamadı. Lütfen tekrar deneyin.");
  }
  return json;
}
