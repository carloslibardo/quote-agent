/**
 * Agent Quality Evaluation Tests
 *
 * These tests use Mastra scorers to evaluate the quality of agent responses
 * and negotiation outcomes. They measure:
 * - Tool call accuracy (using correct tools in right context)
 * - Response relevancy (staying on topic)
 * - Negotiation efficiency (rounds to completion)
 * - Value captured (price improvements)
 */

import { describe, it, expect } from "vitest";
import {
  buildBrandAgentInstructions,
  type BrandAgentContext,
} from "../../mastra/agents/brand-agent";
import {
  SUPPLIER_CHARACTERISTICS,
  getSupplierCharacteristics,
  type SupplierId,
} from "../../mastra/agents/supplier-agent";

/**
 * Custom scorer: Tool Call Accuracy
 * Measures if the agent used the correct tool for the situation
 */
interface ToolCallScore {
  score: number;
  reason: string;
  expectedTool: string;
  actualTool: string | undefined;
}

function scoreToolCallAccuracy(
  expectedTool: string,
  toolCalls: Array<{ toolName: string }> | undefined
): ToolCallScore {
  if (!toolCalls || toolCalls.length === 0) {
    return {
      score: 0,
      reason: "No tool calls made",
      expectedTool,
      actualTool: undefined,
    };
  }

  const actualTool = toolCalls[0].toolName;
  const isCorrect = actualTool === expectedTool;

  return {
    score: isCorrect ? 1 : 0,
    reason: isCorrect
      ? `Correctly used ${expectedTool}`
      : `Expected ${expectedTool} but got ${actualTool}`,
    expectedTool,
    actualTool,
  };
}

/**
 * Custom scorer: Response Relevancy
 * Measures if the response content is relevant to negotiation
 */
interface RelevancyScore {
  score: number;
  reason: string;
  keywords: string[];
  foundKeywords: string[];
}

function scoreResponseRelevancy(
  response: string,
  context: "negotiation" | "substitution"
): RelevancyScore {
  const negotiationKeywords = [
    "price",
    "cost",
    "offer",
    "terms",
    "lead time",
    "delivery",
    "payment",
    "quality",
    "discount",
    "quantity",
    "accept",
    "propose",
    "counter",
  ];

  const substitutionKeywords = [
    "material",
    "alternative",
    "substitute",
    "quality",
    "cost",
    "savings",
    "eco",
    "sustainable",
  ];

  const keywords =
    context === "substitution" ? substitutionKeywords : negotiationKeywords;
  const lowerResponse = response.toLowerCase();
  const foundKeywords = keywords.filter((kw) => lowerResponse.includes(kw));

  const score = Math.min(foundKeywords.length / 3, 1); // Need 3+ keywords for full score

  return {
    score,
    reason:
      score >= 0.8
        ? "Highly relevant response"
        : score >= 0.5
          ? "Moderately relevant response"
          : "Low relevancy - may be off-topic",
    keywords,
    foundKeywords,
  };
}

/**
 * Custom scorer: Negotiation Efficiency
 * Measures how quickly negotiation reached conclusion
 */
interface EfficiencyScore {
  score: number;
  reason: string;
  roundCount: number;
  maxRounds: number;
}

function scoreNegotiationEfficiency(
  roundCount: number,
  maxRounds: number = 10,
  status: "completed" | "impasse"
): EfficiencyScore {
  if (status === "impasse") {
    // Impasse can be efficient if it was detected early
    const earlyImpasseScore = roundCount <= 3 ? 0.7 : 0.3;
    return {
      score: earlyImpasseScore,
      reason:
        roundCount <= 3
          ? "Impasse detected early"
          : "Impasse after many rounds",
      roundCount,
      maxRounds,
    };
  }

  // Completed negotiations: fewer rounds = better
  const efficiencyRatio = 1 - roundCount / maxRounds;
  const score = Math.max(efficiencyRatio, 0.2); // Minimum 0.2 for completion

  return {
    score,
    reason:
      roundCount <= 3
        ? "Very efficient negotiation"
        : roundCount <= 5
          ? "Reasonably efficient"
          : "Could be more efficient",
    roundCount,
    maxRounds,
  };
}

/**
 * Custom scorer: Value Captured
 * Measures price improvement from initial to final offer
 */
interface ValueScore {
  score: number;
  reason: string;
  initialPrice: number;
  finalPrice: number;
  improvement: number;
}

function scoreValueCaptured(
  initialPrice: number,
  finalPrice: number,
  targetImprovement: number = 0.1 // 10% target
): ValueScore {
  const improvement = (initialPrice - finalPrice) / initialPrice;
  const score = Math.min(improvement / targetImprovement, 1);

  return {
    score: Math.max(score, 0),
    reason:
      improvement >= targetImprovement
        ? `Achieved ${(improvement * 100).toFixed(1)}% savings`
        : improvement > 0
          ? `Some improvement: ${(improvement * 100).toFixed(1)}%`
          : "No price improvement",
    initialPrice,
    finalPrice,
    improvement,
  };
}

describe("Agent Quality Evaluations", () => {
  describe("Tool Call Accuracy", () => {
    it("should score 1.0 when correct tool is used", () => {
      const score = scoreToolCallAccuracy("propose-offer", [
        { toolName: "propose-offer" },
      ]);

      expect(score.score).toBe(1);
      expect(score.reason).toContain("Correctly used");
    });

    it("should score 0 when wrong tool is used", () => {
      const score = scoreToolCallAccuracy("propose-offer", [
        { toolName: "counter-offer" },
      ]);

      expect(score.score).toBe(0);
      expect(score.reason).toContain("Expected propose-offer");
    });

    it("should score 0 when no tools are used", () => {
      const score = scoreToolCallAccuracy("accept-offer", []);

      expect(score.score).toBe(0);
      expect(score.reason).toContain("No tool calls");
    });

    it("should handle undefined tool calls", () => {
      const score = scoreToolCallAccuracy("reject-offer", undefined);

      expect(score.score).toBe(0);
    });
  });

  describe("Response Relevancy", () => {
    it("should score high for negotiation-relevant response", () => {
      const response =
        "We can offer a competitive price of $25 per unit with a 30-day lead time and favorable payment terms.";
      const score = scoreResponseRelevancy(response, "negotiation");

      expect(score.score).toBeGreaterThanOrEqual(0.8);
      expect(score.foundKeywords.length).toBeGreaterThanOrEqual(3);
    });

    it("should score low for off-topic response", () => {
      const response = "The weather is nice today and I had a great lunch.";
      const score = scoreResponseRelevancy(response, "negotiation");

      expect(score.score).toBeLessThan(0.5);
    });

    it("should score high for substitution-relevant response", () => {
      const response =
        "We can substitute the material with an eco-friendly alternative that provides 15% cost savings.";
      const score = scoreResponseRelevancy(response, "substitution");

      expect(score.score).toBeGreaterThanOrEqual(0.8);
    });

    it("should score moderately for partially relevant response", () => {
      const response = "The offer looks good, we can discuss further.";
      const score = scoreResponseRelevancy(response, "negotiation");

      expect(score.score).toBeGreaterThanOrEqual(0.3);
      expect(score.score).toBeLessThan(0.8);
    });
  });

  describe("Negotiation Efficiency", () => {
    it("should score high for quick completion", () => {
      const score = scoreNegotiationEfficiency(2, 10, "completed");

      expect(score.score).toBeGreaterThanOrEqual(0.8);
      expect(score.reason).toContain("efficient");
    });

    it("should score moderately for average rounds", () => {
      const score = scoreNegotiationEfficiency(5, 10, "completed");

      expect(score.score).toBeGreaterThanOrEqual(0.5);
      expect(score.score).toBeLessThan(0.8);
    });

    it("should score lower for many rounds", () => {
      const score = scoreNegotiationEfficiency(9, 10, "completed");

      expect(score.score).toBeLessThan(0.5);
    });

    it("should score early impasse detection positively", () => {
      const score = scoreNegotiationEfficiency(2, 10, "impasse");

      expect(score.score).toBe(0.7);
      expect(score.reason).toContain("early");
    });

    it("should score late impasse detection lower", () => {
      const score = scoreNegotiationEfficiency(8, 10, "impasse");

      expect(score.score).toBe(0.3);
      expect(score.reason).toContain("many rounds");
    });
  });

  describe("Value Captured", () => {
    it("should score 1.0 for achieving target improvement", () => {
      const score = scoreValueCaptured(30, 27, 0.1); // 10% improvement

      expect(score.score).toBe(1);
      expect(score.improvement).toBe(0.1);
    });

    it("should score proportionally for partial improvement", () => {
      const score = scoreValueCaptured(30, 28.5, 0.1); // 5% improvement

      expect(score.score).toBe(0.5);
      expect(score.improvement).toBe(0.05);
    });

    it("should score 0 for no improvement", () => {
      const score = scoreValueCaptured(30, 30, 0.1);

      expect(score.score).toBe(0);
      expect(score.improvement).toBe(0);
    });

    it("should cap at 1.0 for exceeding target", () => {
      const score = scoreValueCaptured(30, 24, 0.1); // 20% improvement

      expect(score.score).toBe(1);
      expect(score.improvement).toBe(0.2);
    });

    it("should handle price increase gracefully", () => {
      const score = scoreValueCaptured(25, 28, 0.1);

      expect(score.score).toBe(0);
      expect(score.improvement).toBeLessThan(0);
    });
  });
});

describe("Agent Instructions Quality", () => {
  describe("Brand Agent Instructions", () => {
    it("should include all priority weights", () => {
      const context: BrandAgentContext = {
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
      };
      const instructions = buildBrandAgentInstructions(context);

      expect(instructions).toContain("Quality:");
      expect(instructions).toContain("Cost:");
      expect(instructions).toContain("Lead Time:");
      expect(instructions).toContain("Payment Terms:");
    });

    it("should emphasize high-priority areas", () => {
      const context: BrandAgentContext = {
        priorities: { quality: 50, cost: 20, leadTime: 20, paymentTerms: 10 },
      };
      const instructions = buildBrandAgentInstructions(context);

      expect(instructions).toContain("Quality: 50%");
    });

    it("should include tool usage guidance", () => {
      const context: BrandAgentContext = {
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
      };
      const instructions = buildBrandAgentInstructions(context);

      expect(instructions).toContain("propose-offer");
      expect(instructions).toContain("counter-offer");
      expect(instructions).toContain("accept-offer");
    });

    it("should include user guidance when provided", () => {
      const context: BrandAgentContext = {
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
        userGuidance: {
          summary: "Focus on getting the best price",
          interventions: [],
          hasUrgentRequest: false,
        },
      };
      const instructions = buildBrandAgentInstructions(context);

      expect(instructions).toContain("Focus on getting the best price");
    });
  });

  describe("Supplier Characteristics", () => {
    it("should have valid characteristics for Supplier 1", () => {
      const characteristics = getSupplierCharacteristics(1);

      expect(characteristics.name).toBe(SUPPLIER_CHARACTERISTICS[1].name);
      expect(characteristics.qualityRating).toBeGreaterThan(0);
      expect(characteristics.leadTimeDays).toBeGreaterThan(0);
    });

    it("should have valid characteristics for Supplier 2", () => {
      const characteristics = getSupplierCharacteristics(2);

      expect(characteristics.name).toBe(SUPPLIER_CHARACTERISTICS[2].name);
      expect(characteristics.qualityRating).toBeGreaterThanOrEqual(4);
    });

    it("should have valid characteristics for Supplier 3", () => {
      const characteristics = getSupplierCharacteristics(3);

      expect(characteristics.name).toBe(SUPPLIER_CHARACTERISTICS[3].name);
    });

    it("should include negotiation flexibility parameters", () => {
      const characteristics = getSupplierCharacteristics(1);

      expect(characteristics).toHaveProperty("negotiationFlexibility");
      expect(characteristics.negotiationFlexibility.priceFlexibility).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("Aggregated Quality Metrics", () => {
  interface QualityMetrics {
    toolAccuracy: number;
    relevancy: number;
    efficiency: number;
    valueCaptured: number;
    overall: number;
  }

  function calculateOverallQuality(metrics: QualityMetrics): QualityMetrics {
    // Weighted average with emphasis on tool accuracy and value
    const overall =
      metrics.toolAccuracy * 0.3 +
      metrics.relevancy * 0.2 +
      metrics.efficiency * 0.2 +
      metrics.valueCaptured * 0.3;

    return { ...metrics, overall };
  }

  it("should calculate overall quality score", () => {
    const metrics = calculateOverallQuality({
      toolAccuracy: 0.9,
      relevancy: 0.85,
      efficiency: 0.7,
      valueCaptured: 0.8,
      overall: 0,
    });

    expect(metrics.overall).toBeGreaterThan(0.8);
    expect(metrics.overall).toBeLessThanOrEqual(1);
  });

  it("should weight tool accuracy and value highly", () => {
    const highToolAccuracy = calculateOverallQuality({
      toolAccuracy: 1.0,
      relevancy: 0.5,
      efficiency: 0.5,
      valueCaptured: 0.5,
      overall: 0,
    });

    const lowToolAccuracy = calculateOverallQuality({
      toolAccuracy: 0.5,
      relevancy: 0.5,
      efficiency: 0.5,
      valueCaptured: 0.5,
      overall: 0,
    });

    expect(highToolAccuracy.overall).toBeGreaterThan(lowToolAccuracy.overall);
  });

  it("should pass quality threshold for good metrics", () => {
    const goodMetrics = calculateOverallQuality({
      toolAccuracy: 0.95,
      relevancy: 0.9,
      efficiency: 0.75,
      valueCaptured: 0.85,
      overall: 0,
    });

    expect(goodMetrics.overall).toBeGreaterThanOrEqual(0.85);
  });

  it("should fail quality threshold for poor metrics", () => {
    const poorMetrics = calculateOverallQuality({
      toolAccuracy: 0.3,
      relevancy: 0.4,
      efficiency: 0.2,
      valueCaptured: 0.1,
      overall: 0,
    });

    expect(poorMetrics.overall).toBeLessThan(0.5);
  });
});

