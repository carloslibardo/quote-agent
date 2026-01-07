import { describe, it, expect, beforeEach } from "vitest";
import {
  ImpasseDetector,
  checkForImpasse,
  shouldContinueNegotiation,
  type ImpasseDetectorConfig,
} from "../../mastra/utils/impasse-detector";
import { OfferTracker } from "../../mastra/utils/offer-tracker";
import type { ParsedOffer } from "../../mastra/utils/tool-parser";

const createTestOffer = (overrides: Partial<ParsedOffer> = {}): ParsedOffer => ({
  unitPrice: 25,
  leadTimeDays: 30,
  paymentTerms: "30/70",
  ...overrides,
});

describe("ImpasseDetector", () => {
  let detector: ImpasseDetector;
  let tracker: OfferTracker;

  beforeEach(() => {
    detector = new ImpasseDetector();
    tracker = new OfferTracker(1);
  });

  describe("constructor", () => {
    it("should use default config when none provided", () => {
      const config = detector.getConfig();
      expect(config.maxRounds).toBe(10);
      expect(config.progressWindowSize).toBe(3);
      expect(config.priceGapThreshold).toBe(0.25);
      expect(config.maxAcceptableLeadTime).toBe(60);
    });

    it("should merge custom config with defaults", () => {
      const customDetector = new ImpasseDetector({
        maxRounds: 5,
        priceGapThreshold: 0.1,
      });
      const config = customDetector.getConfig();
      expect(config.maxRounds).toBe(5);
      expect(config.priceGapThreshold).toBe(0.1);
      expect(config.progressWindowSize).toBe(3); // default
      expect(config.maxAcceptableLeadTime).toBe(60); // default
    });
  });

  describe("maxRoundsReached condition", () => {
    it("should detect impasse when max rounds exceeded", () => {
      const customDetector = new ImpasseDetector({ maxRounds: 5 });
      const result = customDetector.detect(6, tracker, false);

      expect(result.isImpasse).toBe(true);
      expect(result.conditions.maxRoundsReached).toBe(true);
      expect(result.primaryReason).toBe("Maximum rounds reached");
    });

    it("should not trigger impasse when rounds are within limit", () => {
      const customDetector = new ImpasseDetector({ maxRounds: 5 });
      const result = customDetector.detect(3, tracker, false);

      expect(result.conditions.maxRoundsReached).toBe(false);
    });

    it("should trigger at exactly max rounds", () => {
      const customDetector = new ImpasseDetector({ maxRounds: 5 });
      const result = customDetector.detect(5, tracker, false);

      expect(result.conditions.maxRoundsReached).toBe(true);
    });
  });

  describe("explicitRejection condition", () => {
    it("should detect impasse on explicit rejection", () => {
      const result = detector.detect(2, tracker, true);

      expect(result.isImpasse).toBe(true);
      expect(result.conditions.explicitRejection).toBe(true);
      expect(result.primaryReason).toBe("Explicit rejection by party");
    });

    it("should include explicit rejection in details", () => {
      const result = detector.detect(2, tracker, true);

      expect(result.details).toContain("explicitly ended");
    });

    it("should not flag impasse when no explicit rejection", () => {
      const result = detector.detect(2, tracker, false);

      expect(result.conditions.explicitRejection).toBe(false);
    });
  });

  describe("noProgressInRounds condition", () => {
    it("should detect impasse when prices stagnate", () => {
      const customDetector = new ImpasseDetector({ progressWindowSize: 3 });
      
      // Add stagnant offers (same price)
      tracker.addOffer({ round: 0, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });
      tracker.addOffer({ round: 1, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });
      tracker.addOffer({ round: 2, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });

      const result = customDetector.detect(3, tracker, false);

      expect(result.conditions.noProgressInRounds).toBe(true);
    });

    it("should not flag impasse when prices improve", () => {
      const customDetector = new ImpasseDetector({ progressWindowSize: 3 });

      // Add improving offers (decreasing price)
      tracker.addOffer({ round: 0, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });
      tracker.addOffer({ round: 1, source: "supplier", offer: createTestOffer({ unitPrice: 28 }) });
      tracker.addOffer({ round: 2, source: "supplier", offer: createTestOffer({ unitPrice: 26 }) });

      const result = customDetector.detect(3, tracker, false);

      expect(result.conditions.noProgressInRounds).toBe(false);
    });

    it("should not flag impasse with insufficient history", () => {
      const customDetector = new ImpasseDetector({ progressWindowSize: 3 });

      // Only 1 offer - less than window size
      tracker.addOffer({ round: 0, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });

      const result = customDetector.detect(1, tracker, false);

      expect(result.conditions.noProgressInRounds).toBe(false);
    });
  });

  describe("priceGapTooLarge condition", () => {
    it("should detect impasse when price gap exceeds threshold", () => {
      const customDetector = new ImpasseDetector({ priceGapThreshold: 0.2 }); // 20%

      // Brand offers $20, supplier offers $30 = 50% gap
      tracker.addOffer({ round: 0, source: "brand", offer: createTestOffer({ unitPrice: 20 }) });
      tracker.addOffer({ round: 0, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });

      const result = customDetector.detect(1, tracker, false);

      expect(result.conditions.priceGapTooLarge).toBe(true);
      expect(result.details).toContain("Price gap");
    });

    it("should not flag impasse when price gap is within threshold", () => {
      const customDetector = new ImpasseDetector({ priceGapThreshold: 0.2 }); // 20%

      // Brand offers $24, supplier offers $26 = ~8% gap
      tracker.addOffer({ round: 0, source: "brand", offer: createTestOffer({ unitPrice: 24 }) });
      tracker.addOffer({ round: 0, source: "supplier", offer: createTestOffer({ unitPrice: 26 }) });

      const result = customDetector.detect(1, tracker, false);

      expect(result.conditions.priceGapTooLarge).toBe(false);
    });

    it("should use target price if no brand offer available", () => {
      const customDetector = new ImpasseDetector({ priceGapThreshold: 0.2 }); // 20%

      // Only supplier offer, but provide target price
      tracker.addOffer({ round: 0, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });

      // Target price of $20 -> 50% gap
      const result = customDetector.detect(1, tracker, false, 20);

      expect(result.conditions.priceGapTooLarge).toBe(true);
    });

    it("should handle missing offers gracefully", () => {
      const result = detector.detect(1, tracker, false);

      // No offers = null price gap = not triggered
      expect(result.conditions.priceGapTooLarge).toBe(false);
    });
  });

  describe("leadTimeUnacceptable condition", () => {
    it("should detect impasse when lead time exceeds limit", () => {
      const customDetector = new ImpasseDetector({ maxAcceptableLeadTime: 45 });

      tracker.addOffer({
        round: 0,
        source: "supplier",
        offer: createTestOffer({ leadTimeDays: 60 }),
      });

      const result = customDetector.detect(1, tracker, false);

      expect(result.conditions.leadTimeUnacceptable).toBe(true);
      expect(result.details).toContain("Lead time of 60 days");
    });

    it("should not flag impasse when lead time is acceptable", () => {
      const customDetector = new ImpasseDetector({ maxAcceptableLeadTime: 45 });

      tracker.addOffer({
        round: 0,
        source: "supplier",
        offer: createTestOffer({ leadTimeDays: 30 }),
      });

      const result = customDetector.detect(1, tracker, false);

      expect(result.conditions.leadTimeUnacceptable).toBe(false);
    });

    it("should trigger at exactly max lead time + 1", () => {
      const customDetector = new ImpasseDetector({ maxAcceptableLeadTime: 45 });

      tracker.addOffer({
        round: 0,
        source: "supplier",
        offer: createTestOffer({ leadTimeDays: 46 }),
      });

      const result = customDetector.detect(1, tracker, false);

      expect(result.conditions.leadTimeUnacceptable).toBe(true);
    });
  });

  describe("combined conditions", () => {
    it("should report multiple impasse reasons", () => {
      const customDetector = new ImpasseDetector({
        maxRounds: 5,
        priceGapThreshold: 0.1,
      });

      tracker.addOffer({ round: 0, source: "brand", offer: createTestOffer({ unitPrice: 20 }) });
      tracker.addOffer({ round: 0, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });

      const result = customDetector.detect(6, tracker, false);

      expect(result.isImpasse).toBe(true);
      expect(result.conditions.maxRoundsReached).toBe(true);
      expect(result.conditions.priceGapTooLarge).toBe(true);
    });

    it("should prioritize explicit rejection as primary reason", () => {
      const customDetector = new ImpasseDetector({ maxRounds: 5 });

      const result = customDetector.detect(6, tracker, true);

      expect(result.primaryReason).toBe("Explicit rejection by party");
    });

    it("should build comprehensive details message", () => {
      const customDetector = new ImpasseDetector({
        maxRounds: 5,
        priceGapThreshold: 0.1,
        maxAcceptableLeadTime: 30,
      });

      tracker.addOffer({
        round: 0,
        source: "brand",
        offer: createTestOffer({ unitPrice: 20 }),
      });
      tracker.addOffer({
        round: 0,
        source: "supplier",
        offer: createTestOffer({ unitPrice: 30, leadTimeDays: 45 }),
      });

      const result = customDetector.detect(6, tracker, true);

      expect(result.details).toContain("explicitly ended");
      expect(result.details).toContain("Price gap");
      expect(result.details).toContain("Maximum 5 rounds");
      expect(result.details).toContain("Lead time");
    });
  });

  describe("no impasse scenario", () => {
    it("should return isImpasse=false when all conditions are fine", () => {
      // Good scenario: improving prices, within rounds, acceptable terms
      tracker.addOffer({ round: 0, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });
      tracker.addOffer({ round: 1, source: "supplier", offer: createTestOffer({ unitPrice: 28 }) });
      tracker.addOffer({ round: 2, source: "supplier", offer: createTestOffer({ unitPrice: 25 }) });

      const result = detector.detect(3, tracker, false);

      expect(result.isImpasse).toBe(false);
      expect(result.primaryReason).toBeNull();
      expect(result.details).toBe("");
    });
  });
});

describe("checkForImpasse helper", () => {
  it("should work as a convenience function", () => {
    const tracker = new OfferTracker(1);
    tracker.addOffer({ round: 0, source: "supplier", offer: createTestOffer({ unitPrice: 25 }) });

    const result = checkForImpasse(5, tracker, false, { maxRounds: 4 });

    expect(result.isImpasse).toBe(true);
    expect(result.conditions.maxRoundsReached).toBe(true);
  });

  it("should use defaults when no config provided", () => {
    const tracker = new OfferTracker(1);
    const result = checkForImpasse(2, tracker, true);

    expect(result.isImpasse).toBe(true);
    expect(result.conditions.explicitRejection).toBe(true);
  });
});

describe("shouldContinueNegotiation helper", () => {
  let tracker: OfferTracker;

  beforeEach(() => {
    tracker = new OfferTracker(1);
  });

  it("should stop on accepted outcome", () => {
    const result = shouldContinueNegotiation(2, 10, tracker, "accepted");

    expect(result.continue).toBe(false);
    expect(result.reason).toBe("Agreement reached");
  });

  it("should stop on rejected outcome", () => {
    const result = shouldContinueNegotiation(2, 10, tracker, "rejected");

    expect(result.continue).toBe(false);
    expect(result.reason).toBe("Negotiation ended by party");
  });

  it("should stop on impasse outcome", () => {
    const result = shouldContinueNegotiation(2, 10, tracker, "impasse");

    expect(result.continue).toBe(false);
    expect(result.reason).toBe("Negotiation ended by party");
  });

  it("should stop at max rounds", () => {
    const result = shouldContinueNegotiation(10, 10, tracker);

    expect(result.continue).toBe(false);
    expect(result.reason).toBe("Maximum rounds reached");
  });

  it("should stop on stagnation", () => {
    // Add 3 stagnant offers
    tracker.addOffer({ round: 0, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });
    tracker.addOffer({ round: 1, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });
    tracker.addOffer({ round: 2, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });

    const result = shouldContinueNegotiation(3, 10, tracker);

    expect(result.continue).toBe(false);
    expect(result.reason).toBe("No price improvement detected");
  });

  it("should continue when conditions are favorable", () => {
    // Add improving offers
    tracker.addOffer({ round: 0, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });
    tracker.addOffer({ round: 1, source: "supplier", offer: createTestOffer({ unitPrice: 28 }) });
    tracker.addOffer({ round: 2, source: "supplier", offer: createTestOffer({ unitPrice: 26 }) });

    const result = shouldContinueNegotiation(3, 10, tracker);

    expect(result.continue).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should continue with insufficient history for stagnation check", () => {
    // Only 2 offers - not enough for stagnation check
    tracker.addOffer({ round: 0, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });
    tracker.addOffer({ round: 1, source: "supplier", offer: createTestOffer({ unitPrice: 30 }) });

    const result = shouldContinueNegotiation(2, 10, tracker);

    expect(result.continue).toBe(true);
  });
});

