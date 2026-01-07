/**
 * Tool Accuracy Evaluation Tests
 *
 * Evaluate the accuracy and appropriateness of tool usage by agents.
 * These tests verify:
 * - Correct tool selection for different negotiation phases
 * - Proper argument structure in tool calls
 * - Reasonable tool usage patterns
 */

import { describe, it, expect } from "vitest";
import type { ParsedOffer } from "../../mastra/utils/tool-parser";

// ============================================================================
// Types for Evaluation
// ============================================================================

interface ToolCallRecord {
  toolName: string;
  args: Record<string, unknown>;
  context: "initial" | "response" | "final";
}

interface ToolUsagePattern {
  calls: ToolCallRecord[];
  negotiationPhase: "opening" | "negotiating" | "closing";
  roundNumber: number;
}

// ============================================================================
// Tool Usage Scorers
// ============================================================================

/**
 * Score tool selection appropriateness
 */
function scoreToolSelection(
  call: ToolCallRecord,
  expectedTools: string[]
): { score: number; reason: string } {
  if (expectedTools.includes(call.toolName)) {
    return {
      score: 1,
      reason: `Correctly used ${call.toolName} for ${call.context} context`,
    };
  }

  // Partial credit for related tools
  const toolCategories = {
    offer: ["propose-offer", "counter-offer"],
    decision: ["accept-offer", "reject-offer"],
    substitution: ["suggest-substitution", "accept-substitution", "reject-substitution"],
  };

  for (const [category, tools] of Object.entries(toolCategories)) {
    if (
      tools.includes(call.toolName) &&
      tools.some((t) => expectedTools.includes(t))
    ) {
      return {
        score: 0.5,
        reason: `Used ${call.toolName} instead of expected ${expectedTools.join(" or ")} (same category: ${category})`,
      };
    }
  }

  return {
    score: 0,
    reason: `Unexpected tool: ${call.toolName}`,
  };
}

/**
 * Score argument completeness
 */
function scoreArgumentCompleteness(
  args: Record<string, unknown>,
  requiredFields: string[]
): { score: number; missingFields: string[] } {
  const missingFields = requiredFields.filter(
    (field) => args[field] === undefined || args[field] === null
  );

  const score = (requiredFields.length - missingFields.length) / requiredFields.length;

  return { score, missingFields };
}

/**
 * Score offer argument validity
 */
function scoreOfferValidity(offer: ParsedOffer): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];

  if (offer.unitPrice <= 0) {
    issues.push("Unit price must be positive");
  }
  if (offer.unitPrice > 1000) {
    issues.push("Unit price seems unreasonably high");
  }

  if (offer.leadTimeDays <= 0) {
    issues.push("Lead time must be positive");
  }
  if (offer.leadTimeDays > 180) {
    issues.push("Lead time exceeds 6 months");
  }

  if (!offer.paymentTerms || offer.paymentTerms.length < 3) {
    issues.push("Payment terms not specified properly");
  }

  const score = Math.max(1 - issues.length * 0.25, 0);

  return { score, issues };
}

/**
 * Score tool usage pattern for a negotiation
 */
function scoreUsagePattern(pattern: ToolUsagePattern): {
  score: number;
  details: string;
} {
  const { calls, negotiationPhase, roundNumber } = pattern;

  // Opening phase should use propose-offer
  if (negotiationPhase === "opening") {
    const hasPropose = calls.some((c) => c.toolName === "propose-offer");
    if (!hasPropose) {
      return {
        score: 0.3,
        details: "Opening phase should include propose-offer",
      };
    }
    return { score: 1, details: "Correct opening with propose-offer" };
  }

  // Negotiating phase should use counter-offer primarily
  if (negotiationPhase === "negotiating") {
    const hasCounter = calls.some((c) => c.toolName === "counter-offer");
    const hasSubstitution = calls.some((c) => c.toolName === "suggest-substitution");

    if (hasCounter || hasSubstitution) {
      return { score: 1, details: "Appropriate negotiation tools used" };
    }

    const hasDecision = calls.some(
      (c) => c.toolName === "accept-offer" || c.toolName === "reject-offer"
    );
    if (hasDecision && roundNumber > 2) {
      return { score: 0.8, details: "Early decision made during negotiation" };
    }

    return { score: 0.5, details: "Expected counter-offer or substitution" };
  }

  // Closing phase should use accept or reject
  if (negotiationPhase === "closing") {
    const hasDecision = calls.some(
      (c) => c.toolName === "accept-offer" || c.toolName === "reject-offer"
    );
    if (hasDecision) {
      return { score: 1, details: "Correct closing with decision tool" };
    }
    return { score: 0.5, details: "Closing phase should include accept or reject" };
  }

  return { score: 0.5, details: "Unknown negotiation phase" };
}

// ============================================================================
// Tests
// ============================================================================

describe("Tool Selection Scoring", () => {
  describe("Correct Tool Usage", () => {
    it("should score 1.0 for propose-offer in initial context", () => {
      const call: ToolCallRecord = {
        toolName: "propose-offer",
        args: {},
        context: "initial",
      };

      const score = scoreToolSelection(call, ["propose-offer"]);

      expect(score.score).toBe(1);
      expect(score.reason).toContain("Correctly used");
    });

    it("should score 1.0 for counter-offer in response context", () => {
      const call: ToolCallRecord = {
        toolName: "counter-offer",
        args: {},
        context: "response",
      };

      const score = scoreToolSelection(call, ["counter-offer", "accept-offer"]);

      expect(score.score).toBe(1);
    });

    it("should score 1.0 for accept-offer in final context", () => {
      const call: ToolCallRecord = {
        toolName: "accept-offer",
        args: {},
        context: "final",
      };

      const score = scoreToolSelection(call, ["accept-offer", "reject-offer"]);

      expect(score.score).toBe(1);
    });
  });

  describe("Partial Credit", () => {
    it("should score 0.5 for related tool in same category", () => {
      const call: ToolCallRecord = {
        toolName: "counter-offer",
        args: {},
        context: "initial",
      };

      const score = scoreToolSelection(call, ["propose-offer"]);

      expect(score.score).toBe(0.5);
      expect(score.reason).toContain("same category");
    });

    it("should score 0.5 for accept instead of reject", () => {
      const call: ToolCallRecord = {
        toolName: "accept-offer",
        args: {},
        context: "final",
      };

      const score = scoreToolSelection(call, ["reject-offer"]);

      expect(score.score).toBe(0.5);
    });
  });

  describe("Wrong Tool Usage", () => {
    it("should score 0 for completely wrong tool", () => {
      const call: ToolCallRecord = {
        toolName: "suggest-substitution",
        args: {},
        context: "initial",
      };

      const score = scoreToolSelection(call, ["propose-offer"]);

      expect(score.score).toBe(0);
      expect(score.reason).toContain("Unexpected");
    });
  });
});

describe("Argument Completeness Scoring", () => {
  it("should score 1.0 for all required fields present", () => {
    const args = {
      supplierId: 1,
      offer: { unitPrice: 25, leadTimeDays: 30, paymentTerms: "50/50" },
      message: "Initial offer",
    };

    const score = scoreArgumentCompleteness(args, [
      "supplierId",
      "offer",
      "message",
    ]);

    expect(score.score).toBe(1);
    expect(score.missingFields).toHaveLength(0);
  });

  it("should score 0.67 for one missing field", () => {
    const args = {
      supplierId: 1,
      offer: { unitPrice: 25, leadTimeDays: 30, paymentTerms: "50/50" },
    };

    const score = scoreArgumentCompleteness(args, [
      "supplierId",
      "offer",
      "message",
    ]);

    expect(score.score).toBeCloseTo(0.67, 1);
    expect(score.missingFields).toContain("message");
  });

  it("should score 0.5 for half fields missing", () => {
    const args = {
      supplierId: 1,
    };

    const score = scoreArgumentCompleteness(args, [
      "supplierId",
      "offer",
      "message",
      "notes",
    ]);

    expect(score.score).toBe(0.25); // Only supplierId present
    expect(score.missingFields).toHaveLength(3);
  });

  it("should handle null values as missing", () => {
    const args = {
      supplierId: 1,
      offer: null,
      message: "Test",
    };

    const score = scoreArgumentCompleteness(args, [
      "supplierId",
      "offer",
      "message",
    ]);

    expect(score.score).toBeCloseTo(0.67, 1);
    expect(score.missingFields).toContain("offer");
  });
});

describe("Offer Validity Scoring", () => {
  it("should score 1.0 for valid offer", () => {
    const offer: ParsedOffer = {
      unitPrice: 25,
      leadTimeDays: 30,
      paymentTerms: "50/50",
    };

    const result = scoreOfferValidity(offer);

    expect(result.score).toBe(1);
    expect(result.issues).toHaveLength(0);
  });

  it("should penalize negative unit price", () => {
    const offer: ParsedOffer = {
      unitPrice: -10,
      leadTimeDays: 30,
      paymentTerms: "50/50",
    };

    const result = scoreOfferValidity(offer);

    expect(result.score).toBeLessThan(1);
    expect(result.issues).toContain("Unit price must be positive");
  });

  it("should penalize zero lead time", () => {
    const offer: ParsedOffer = {
      unitPrice: 25,
      leadTimeDays: 0,
      paymentTerms: "50/50",
    };

    const result = scoreOfferValidity(offer);

    expect(result.score).toBeLessThan(1);
    expect(result.issues).toContain("Lead time must be positive");
  });

  it("should penalize unreasonably high price", () => {
    const offer: ParsedOffer = {
      unitPrice: 5000,
      leadTimeDays: 30,
      paymentTerms: "50/50",
    };

    const result = scoreOfferValidity(offer);

    expect(result.score).toBeLessThan(1);
    expect(result.issues).toContain("Unit price seems unreasonably high");
  });

  it("should penalize very long lead time", () => {
    const offer: ParsedOffer = {
      unitPrice: 25,
      leadTimeDays: 365,
      paymentTerms: "50/50",
    };

    const result = scoreOfferValidity(offer);

    expect(result.score).toBeLessThan(1);
    expect(result.issues).toContain("Lead time exceeds 6 months");
  });

  it("should penalize invalid payment terms", () => {
    const offer: ParsedOffer = {
      unitPrice: 25,
      leadTimeDays: 30,
      paymentTerms: "",
    };

    const result = scoreOfferValidity(offer);

    expect(result.score).toBeLessThan(1);
    expect(result.issues).toContain("Payment terms not specified properly");
  });

  it("should accumulate multiple issues", () => {
    const offer: ParsedOffer = {
      unitPrice: -10,
      leadTimeDays: 0,
      paymentTerms: "",
    };

    const result = scoreOfferValidity(offer);

    expect(result.score).toBe(0.25); // 3 issues = 0.75 deduction
    expect(result.issues).toHaveLength(3);
  });
});

describe("Usage Pattern Scoring", () => {
  describe("Opening Phase", () => {
    it("should score 1.0 for propose-offer in opening", () => {
      const pattern: ToolUsagePattern = {
        calls: [{ toolName: "propose-offer", args: {}, context: "initial" }],
        negotiationPhase: "opening",
        roundNumber: 0,
      };

      const result = scoreUsagePattern(pattern);

      expect(result.score).toBe(1);
      expect(result.details).toContain("propose-offer");
    });

    it("should score lower for missing propose-offer in opening", () => {
      const pattern: ToolUsagePattern = {
        calls: [],
        negotiationPhase: "opening",
        roundNumber: 0,
      };

      const result = scoreUsagePattern(pattern);

      expect(result.score).toBeLessThan(1);
    });
  });

  describe("Negotiating Phase", () => {
    it("should score 1.0 for counter-offer in negotiating", () => {
      const pattern: ToolUsagePattern = {
        calls: [{ toolName: "counter-offer", args: {}, context: "response" }],
        negotiationPhase: "negotiating",
        roundNumber: 2,
      };

      const result = scoreUsagePattern(pattern);

      expect(result.score).toBe(1);
    });

    it("should score 1.0 for substitution in negotiating", () => {
      const pattern: ToolUsagePattern = {
        calls: [
          { toolName: "suggest-substitution", args: {}, context: "response" },
        ],
        negotiationPhase: "negotiating",
        roundNumber: 3,
      };

      const result = scoreUsagePattern(pattern);

      expect(result.score).toBe(1);
    });

    it("should score 0.8 for early decision during negotiating", () => {
      const pattern: ToolUsagePattern = {
        calls: [{ toolName: "accept-offer", args: {}, context: "response" }],
        negotiationPhase: "negotiating",
        roundNumber: 4,
      };

      const result = scoreUsagePattern(pattern);

      expect(result.score).toBe(0.8);
    });
  });

  describe("Closing Phase", () => {
    it("should score 1.0 for accept-offer in closing", () => {
      const pattern: ToolUsagePattern = {
        calls: [{ toolName: "accept-offer", args: {}, context: "final" }],
        negotiationPhase: "closing",
        roundNumber: 5,
      };

      const result = scoreUsagePattern(pattern);

      expect(result.score).toBe(1);
    });

    it("should score 1.0 for reject-offer in closing", () => {
      const pattern: ToolUsagePattern = {
        calls: [{ toolName: "reject-offer", args: {}, context: "final" }],
        negotiationPhase: "closing",
        roundNumber: 6,
      };

      const result = scoreUsagePattern(pattern);

      expect(result.score).toBe(1);
    });

    it("should score lower for no decision in closing", () => {
      const pattern: ToolUsagePattern = {
        calls: [{ toolName: "counter-offer", args: {}, context: "final" }],
        negotiationPhase: "closing",
        roundNumber: 7,
      };

      const result = scoreUsagePattern(pattern);

      expect(result.score).toBeLessThan(1);
    });
  });
});

describe("Aggregate Tool Accuracy", () => {
  it("should calculate overall tool accuracy for negotiation", () => {
    const calls: ToolCallRecord[] = [
      { toolName: "propose-offer", args: {}, context: "initial" },
      { toolName: "counter-offer", args: {}, context: "response" },
      { toolName: "counter-offer", args: {}, context: "response" },
      { toolName: "accept-offer", args: {}, context: "final" },
    ];

    const expectedToolsByContext: Record<string, string[]> = {
      initial: ["propose-offer"],
      response: ["counter-offer", "suggest-substitution"],
      final: ["accept-offer", "reject-offer"],
    };

    const scores = calls.map((call) =>
      scoreToolSelection(call, expectedToolsByContext[call.context])
    );

    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

    expect(avgScore).toBe(1); // All correct
    expect(scores.every((s) => s.score >= 0.5)).toBe(true);
  });

  it("should detect poor tool usage pattern", () => {
    const calls: ToolCallRecord[] = [
      { toolName: "accept-offer", args: {}, context: "initial" }, // Wrong
      { toolName: "propose-offer", args: {}, context: "response" }, // Wrong
      { toolName: "counter-offer", args: {}, context: "final" }, // Wrong
    ];

    const expectedToolsByContext: Record<string, string[]> = {
      initial: ["propose-offer"],
      response: ["counter-offer"],
      final: ["accept-offer", "reject-offer"],
    };

    const scores = calls.map((call) =>
      scoreToolSelection(call, expectedToolsByContext[call.context])
    );

    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

    expect(avgScore).toBeLessThan(1);
    expect(scores.some((s) => s.score < 1)).toBe(true);
  });
});

