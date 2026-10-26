import type { CatalogRepository } from "../repositories";
import type { AnalysisStep, Finding } from "../types";
import type { AnalysisContext } from "./AnalysisContext";

export interface HandlerDeps {
  catalog: CatalogRepository;
  /** Called when a step fails. The chain keeps going; the step reports an "error" finding. */
  onError?: (step: AnalysisStep, error: unknown) => void;
}

export interface StepOutcome {
  findings: Finding[];
  requiresAlert?: boolean;
}

/** Chain of Responsibility link. Each link adds its findings and passes the context on. */
export abstract class SafetyHandler {
  abstract readonly step: AnalysisStep;
  private next: SafetyHandler | null = null;

  constructor(protected readonly deps: HandlerDeps) {}

  /** Returns the handler passed in, so links can be chained: a.setNext(b).setNext(c). */
  setNext(handler: SafetyHandler): SafetyHandler {
    this.next = handler;
    return handler;
  }

  async handle(ctx: AnalysisContext): Promise<AnalysisContext> {
    let outcome: StepOutcome;
    try {
      outcome = await this.process(ctx);
    } catch (error) {
      this.deps.onError?.(this.step, error);
      outcome = {
        findings: [
          {
            step: this.step,
            status: "error",
            title: "Bu kontrol tamamlanamadı",
            detail: "Lütfen daha sonra tekrar deneyin. Diğer kontroller çalıştırıldı.",
          },
        ],
      };
    }
    const result: AnalysisContext = {
      ...ctx,
      findings: [...ctx.findings, ...outcome.findings],
      requiresAlert: ctx.requiresAlert || outcome.requiresAlert === true,
    };
    return this.next ? this.next.handle(result) : result;
  }

  protected abstract process(ctx: AnalysisContext): Promise<StepOutcome>;
}
