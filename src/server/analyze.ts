import type { SupabaseClient } from "@supabase/supabase-js";
import { creatorFor, InvalidInputError, SafetyPipeline, StrategyResolver, type Finding } from "@/domain";
import { SupabaseCatalogRepository } from "@/infra/SupabaseCatalogRepository";
import { SupabasePdfTextExtractor, type PdfParse } from "@/infra/SupabasePdfTextExtractor";
import { SupabaseUserRepository } from "@/infra/SupabaseUserRepository";
import type { AnalyzeRequest, AnalyzeResponse, FindingDto } from "@/lib/api/analyze";
import type { Database } from "@/lib/supabase/types";
import { MESSAGES, UserFacingError } from "./errors";
import type { Logger } from "./log";

export const RATE_LIMIT_PER_MINUTE = 30;

export interface AnalyzeDeps {
  supabase: SupabaseClient<Database>;
  userId: string;
  logger: Logger;
  parsePdf?: PdfParse;
}

function toDto(finding: Finding): FindingDto {
  return {
    step: finding.step,
    status: finding.status,
    severity: finding.severity ?? null,
    title: finding.title,
    detail: finding.detail ?? null,
    message: finding.message ?? finding.title,
    interactionId: finding.interactionId ?? null,
  };
}

/**
 * session → rate limit → Creator (input) → StrategyResolver (profile) → SafetyPipeline → save run.
 * Runs entirely as the signed-in user; RLS protects every read and write.
 */
export async function analyze(deps: AnalyzeDeps, request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const { supabase, userId, logger } = deps;

  const { data: allowed, error: quotaError } = await supabase.rpc("consume_analysis_quota", {
    p_limit: RATE_LIMIT_PER_MINUTE,
    p_window_seconds: 60,
  });
  if (quotaError) throw quotaError;
  if (!allowed) throw new UserFacingError(MESSAGES.rateLimited, 429);

  const catalog = new SupabaseCatalogRepository(supabase);
  const profile = await new SupabaseUserRepository(supabase).getProfile(userId);

  const creator = creatorFor(request.inputKind, {
    catalog,
    pdfText: new SupabasePdfTextExtractor(supabase, userId, deps.parsePdf),
  });
  const input = await creator.toInput(request.payload);

  const strategy = StrategyResolver.fromConditions(profile.conditions);
  const result = await SafetyPipeline.build(strategy, {
    catalog,
    onError: (step, error) => logger.error("analysis step failed", { step, error }),
  }).run(input, profile);

  const findings = result.findings.map(toDto);
  const { data: runId, error: saveError } = await supabase.rpc("save_analysis_run", {
    p_input_kind: request.inputKind,
    p_strategy_codes: result.strategyCodes,
    p_findings: findings.map((f) => ({
      step: f.step,
      status: f.status,
      severity: f.severity,
      title: f.title,
      detail: f.detail,
      message: f.message,
      interaction_id: f.interactionId,
    })),
    p_requires_alert: result.requiresAlert,
    p_meal_id: request.mealId,
    p_meal_items: input.items.map((item) => ({ product_id: item.productId ?? null, raw_text: item.rawText })),
  });
  if (saveError) {
    // Composite FK (meal_id, user_id): unknown meal or someone else's meal.
    if (saveError.code === "23503" && request.mealId) throw new UserFacingError(MESSAGES.mealNotFound, 404);
    throw saveError;
  }

  logger.info("analysis completed", {
    runId,
    inputKind: request.inputKind,
    findings: findings.length,
    requiresAlert: result.requiresAlert,
  });
  return { runId, findings, requiresAlert: result.requiresAlert };
}

/** Maps any error to a status and a Turkish message. Unexpected errors are logged, never shown. */
export function toErrorResult(error: unknown, logger: Logger): { status: number; message: string } {
  if (error instanceof UserFacingError) {
    if (error.status >= 500 || error.cause) logger.error("request failed", { error, cause: error.cause });
    return { status: error.status, message: error.message };
  }
  if (error instanceof InvalidInputError) return { status: 400, message: error.message };
  logger.error("unexpected error", { error });
  return { status: 500, message: MESSAGES.unexpected };
}
