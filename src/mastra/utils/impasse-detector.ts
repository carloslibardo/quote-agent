import type { OfferTracker } from "./offer-tracker";

/**
 * Conditions that can trigger an impasse detection
 */
export interface ImpasseConditions {
  /** Maximum negotiation rounds exceeded without agreement */
  maxRoundsReached: boolean;
  /** One party explicitly rejected and ended negotiation */
  explicitRejection: boolean;
  /** No price improvement in recent rounds */
  noProgressInRounds: boolean;
  /** Price gap between parties exceeds threshold */
  priceGapTooLarge: boolean;
  /** Lead time exceeds maximum acceptable limit */
  leadTimeUnacceptable: boolean;
}

/**
 * Result of impasse detection analysis
 */
export interface ImpasseResult {
  /** Whether an impasse condition was detected */
  isImpasse: boolean;
  /** Individual condition evaluations */
  conditions: ImpasseConditions;
  /** Primary reason for impasse (most significant) */
  primaryReason: string | null;
  /** Detailed explanation of all impasse conditions */
  details: string;
}

/**
 * Configuration for impasse detection thresholds
 */
export interface ImpasseDetectorConfig {
  /** Maximum rounds before forced impasse (default: 10) */
  maxRounds: number;
  /** Number of rounds to check for price progress (default: 3) */
  progressWindowSize: number;
  /** Price gap percentage threshold (e.g., 0.25 = 25%) */
  priceGapThreshold: number;
  /** Maximum acceptable lead time in days */
  maxAcceptableLeadTime: number;
}

const DEFAULT_CONFIG: ImpasseDetectorConfig = {
  maxRounds: 10,
  progressWindowSize: 3,
  priceGapThreshold: 0.25, // 25% gap = impasse
  maxAcceptableLeadTime: 60, // 60 days
};

/**
 * Multi-condition impasse detector for negotiation workflows.
 * Evaluates various conditions to determine if a negotiation has reached
 * an unresolvable state.
 */
export class ImpasseDetector {
  private config: ImpasseDetectorConfig;

  constructor(config: Partial<ImpasseDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Detect impasse conditions based on current negotiation state
   */
  detect(
    currentRound: number,
    offerTracker: OfferTracker,
    explicitRejection: boolean,
    targetPrice?: number
  ): ImpasseResult {
    const conditions = this.evaluateConditions(
      currentRound,
      offerTracker,
      explicitRejection,
      targetPrice
    );

    const isImpasse = Object.values(conditions).some(Boolean);
    const primaryReason = this.getPrimaryReason(conditions);
    const details = this.buildDetailsMessage(conditions, offerTracker);

    return {
      isImpasse,
      conditions,
      primaryReason,
      details,
    };
  }

  /**
   * Evaluate all impasse conditions
   */
  private evaluateConditions(
    currentRound: number,
    offerTracker: OfferTracker,
    explicitRejection: boolean,
    targetPrice?: number
  ): ImpasseConditions {
    const latestOffer = offerTracker.getLatestOffer();
    const priceGap = this.calculatePriceGapPercent(offerTracker, targetPrice);

    return {
      maxRoundsReached: currentRound >= this.config.maxRounds,
      explicitRejection,
      noProgressInRounds: !offerTracker.hasPriceImproved(
        this.config.progressWindowSize
      ),
      priceGapTooLarge:
        priceGap !== null && priceGap > this.config.priceGapThreshold,
      leadTimeUnacceptable:
        latestOffer !== null &&
        latestOffer.offer.leadTimeDays > this.config.maxAcceptableLeadTime,
    };
  }

  /**
   * Calculate price gap as a percentage of the reference price
   */
  private calculatePriceGapPercent(
    offerTracker: OfferTracker,
    targetPrice?: number
  ): number | null {
    const latestOffer = offerTracker.getLatestOffer();
    if (!latestOffer) return null;

    // Use brand's latest offer or target price as reference
    const brandOffer = offerTracker.getOfferBySource("brand");
    const referencePrice = brandOffer?.offer.unitPrice ?? targetPrice;

    if (!referencePrice) return null;

    const gap = Math.abs(latestOffer.offer.unitPrice - referencePrice);
    return gap / referencePrice;
  }

  /**
   * Determine the primary (most significant) impasse reason
   * Priority: explicit rejection > price gap > no progress > max rounds > lead time
   */
  private getPrimaryReason(conditions: ImpasseConditions): string | null {
    if (conditions.explicitRejection) return "Explicit rejection by party";
    if (conditions.priceGapTooLarge) return "Price gap exceeds threshold";
    if (conditions.noProgressInRounds) return "No progress in recent rounds";
    if (conditions.maxRoundsReached) return "Maximum rounds reached";
    if (conditions.leadTimeUnacceptable) return "Lead time exceeds maximum";
    return null;
  }

  /**
   * Build a detailed message explaining all triggered impasse conditions
   */
  private buildDetailsMessage(
    conditions: ImpasseConditions,
    offerTracker: OfferTracker
  ): string {
    const parts: string[] = [];

    if (conditions.explicitRejection) {
      parts.push("Negotiation explicitly ended by one party.");
    }
    if (conditions.priceGapTooLarge) {
      const gap = offerTracker.calculatePriceGap();
      if (gap !== null) {
        parts.push(
          `Price gap of $${gap.toFixed(2)} exceeds acceptable threshold.`
        );
      } else {
        parts.push("Price gap exceeds acceptable threshold.");
      }
    }
    if (conditions.noProgressInRounds) {
      parts.push(
        `No price improvement in last ${this.config.progressWindowSize} rounds.`
      );
    }
    if (conditions.maxRoundsReached) {
      parts.push(
        `Maximum ${this.config.maxRounds} rounds reached without agreement.`
      );
    }
    if (conditions.leadTimeUnacceptable) {
      const offer = offerTracker.getLatestOffer();
      if (offer) {
        parts.push(
          `Lead time of ${offer.offer.leadTimeDays} days exceeds ${this.config.maxAcceptableLeadTime}-day limit.`
        );
      }
    }

    return parts.join(" ");
  }

  /**
   * Get the current configuration
   */
  getConfig(): ImpasseDetectorConfig {
    return { ...this.config };
  }
}

/**
 * Quick check for impasse conditions (convenience function)
 */
export function checkForImpasse(
  round: number,
  offerTracker: OfferTracker,
  explicitRejection: boolean = false,
  config?: Partial<ImpasseDetectorConfig>
): ImpasseResult {
  const detector = new ImpasseDetector(config);
  return detector.detect(round, offerTracker, explicitRejection);
}

/**
 * Determine if a negotiation should continue or terminate
 */
export function shouldContinueNegotiation(
  currentRound: number,
  maxRounds: number,
  offerTracker: OfferTracker,
  explicitOutcome?: "accepted" | "rejected" | "impasse"
): { continue: boolean; reason?: string } {
  // Check explicit outcomes first
  if (explicitOutcome === "accepted") {
    return { continue: false, reason: "Agreement reached" };
  }
  if (explicitOutcome === "impasse" || explicitOutcome === "rejected") {
    return { continue: false, reason: "Negotiation ended by party" };
  }

  // Check round limit
  if (currentRound >= maxRounds) {
    return { continue: false, reason: "Maximum rounds reached" };
  }

  // Check for stagnation (no progress)
  if (offerTracker.getHistory().length >= 3) {
    if (!offerTracker.hasPriceImproved(3)) {
      return { continue: false, reason: "No price improvement detected" };
    }
  }

  return { continue: true };
}

