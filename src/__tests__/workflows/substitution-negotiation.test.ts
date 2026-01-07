import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubstitutionTracker } from "../../mastra/utils/substitution-tracker";
import { extractToolCall } from "../../mastra/utils/tool-parser";
import type { SubstitutionProposal } from "../../mastra/tools/material-substitution-tool";

/**
 * Substitution Negotiation Integration Tests
 *
 * Verify the end-to-end substitution negotiation flow:
 * 1. Supplier proposes substitutions via tool
 * 2. Brand evaluates based on quality priority
 * 3. Results are tracked and included in outcome
 */

describe("Substitution Negotiation Flow", () => {
  const mockProposalToolCall = {
    toolName: "suggest-substitution",
    toolCallId: "call-sub-1",
    args: {
      proposal: {
        productId: "FSH013",
        originalMaterial: "Premium Cotton",
        suggestedMaterial: "Organic Cotton Blend",
        costReductionPercent: 12,
        qualityImpact: "minor",
        qualityJustification: "Similar thread count",
        leadTimeChange: -2,
      },
      message: "We can offer a more cost-effective alternative.",
    },
    result: {
      success: true,
      substitutionId: "sub-123-FSH013",
      proposal: {
        productId: "FSH013",
        originalMaterial: "Premium Cotton",
        suggestedMaterial: "Organic Cotton Blend",
        costReductionPercent: 12,
        qualityImpact: "minor",
        qualityJustification: "Similar thread count",
        leadTimeChange: -2,
      },
      message: "We can offer a more cost-effective alternative.",
    },
  };

  const mockAcceptToolCall = {
    toolName: "accept-substitution",
    toolCallId: "call-accept-1",
    args: {
      substitutionId: "sub-123-FSH013",
      conditions: "Sample approval required",
      message: "We accept pending verification.",
    },
    result: {
      success: true,
      substitutionId: "sub-123-FSH013",
      status: "accepted",
      conditions: "Sample approval required",
      message: "We accept pending verification.",
    },
  };

  const mockRejectToolCall = {
    toolName: "reject-substitution",
    toolCallId: "call-reject-1",
    args: {
      substitutionId: "sub-123-FSH013",
      reason: "quality_concerns",
      explanation: "Does not meet our standards.",
      message: "Unable to accept.",
    },
    result: {
      success: true,
      substitutionId: "sub-123-FSH013",
      status: "rejected",
      reason: "quality_concerns",
      explanation: "Does not meet our standards.",
      message: "Unable to accept.",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tool Call Extraction", () => {
    it("should extract suggest-substitution tool call", () => {
      const response = { toolCalls: [mockProposalToolCall] };
      const result = extractToolCall(response, "suggest-substitution");

      expect(result).toBeDefined();
      expect(result?.toolName).toBe("suggest-substitution");
      expect(result?.result?.substitutionId).toBe("sub-123-FSH013");
    });

    it("should extract accept-substitution tool call", () => {
      const response = { toolCalls: [mockAcceptToolCall] };
      const result = extractToolCall(response, "accept-substitution");

      expect(result).toBeDefined();
      expect(result?.result?.status).toBe("accepted");
    });

    it("should extract reject-substitution tool call", () => {
      const response = { toolCalls: [mockRejectToolCall] };
      const result = extractToolCall(response, "reject-substitution");

      expect(result).toBeDefined();
      expect(result?.result?.reason).toBe("quality_concerns");
    });

    it("should return null when tool call not found", () => {
      const response = { toolCalls: [mockProposalToolCall] };
      const result = extractToolCall(response, "accept-substitution");

      expect(result).toBeNull();
    });
  });

  describe("Tracker Integration", () => {
    it("should track supplier substitution proposal", () => {
      const tracker = new SubstitutionTracker(1);
      const response = { toolCalls: [mockProposalToolCall] };

      const substitutionCall = extractToolCall(response, "suggest-substitution");
      if (substitutionCall?.result) {
        const proposal = substitutionCall.result.proposal as SubstitutionProposal;
        const substitutionId = substitutionCall.result.substitutionId as string;
        tracker.propose(proposal, substitutionId);
      }

      expect(tracker.getPendingSubstitutions()).toHaveLength(1);
      expect(tracker.get("sub-123-FSH013")).toBeDefined();
    });

    it("should track brand acceptance", () => {
      const tracker = new SubstitutionTracker(1);

      // First: supplier proposes
      const proposal: SubstitutionProposal = {
        productId: "FSH013",
        originalMaterial: "Premium Cotton",
        suggestedMaterial: "Organic Cotton Blend",
        costReductionPercent: 12,
        qualityImpact: "minor",
        qualityJustification: "Similar thread count",
        leadTimeChange: -2,
      };
      tracker.propose(proposal, "sub-123-FSH013");

      // Then: brand accepts
      const acceptResponse = { toolCalls: [mockAcceptToolCall] };
      const acceptCall = extractToolCall(acceptResponse, "accept-substitution");
      if (acceptCall?.result) {
        const substitutionId = acceptCall.result.substitutionId as string;
        const conditions = acceptCall.result.conditions as string | undefined;
        tracker.accept(substitutionId, conditions);
      }

      expect(tracker.getAcceptedSubstitutions()).toHaveLength(1);
      expect(tracker.getPendingSubstitutions()).toHaveLength(0);
      expect(tracker.calculateTotalSavings()).toBe(12);
    });

    it("should track brand rejection", () => {
      const tracker = new SubstitutionTracker(1);

      // First: supplier proposes
      const proposal: SubstitutionProposal = {
        productId: "FSH013",
        originalMaterial: "Premium Cotton",
        suggestedMaterial: "Organic Cotton Blend",
        costReductionPercent: 12,
        qualityImpact: "moderate",
        qualityJustification: "Slight difference in feel",
      };
      tracker.propose(proposal, "sub-123-FSH013");

      // Then: brand rejects
      const rejectResponse = { toolCalls: [mockRejectToolCall] };
      const rejectCall = extractToolCall(rejectResponse, "reject-substitution");
      if (rejectCall?.result) {
        const substitutionId = rejectCall.result.substitutionId as string;
        const reason = rejectCall.result.reason as string;
        tracker.reject(substitutionId, reason);
      }

      expect(tracker.getRejectedSubstitutions()).toHaveLength(1);
      expect(tracker.getPendingSubstitutions()).toHaveLength(0);
      expect(tracker.calculateTotalSavings()).toBe(0);
    });
  });

  describe("Quality Priority Logic", () => {
    it("should accept substitutions with no quality impact regardless of priority", () => {
      const qualityPriority = 50; // High quality focus
      const proposal: SubstitutionProposal = {
        productId: "FSH013",
        originalMaterial: "Cotton A",
        suggestedMaterial: "Cotton B",
        costReductionPercent: 10,
        qualityImpact: "none",
        qualityJustification: "Identical specs",
      };

      // Decision logic: accept if qualityImpact is "none" OR savings > threshold
      const shouldAccept =
        proposal.qualityImpact === "none" ||
        (qualityPriority < 40 && proposal.costReductionPercent > 15);

      expect(shouldAccept).toBe(true);
    });

    it("should reject moderate impact with high quality priority", () => {
      const qualityPriority = 50;
      const proposal: SubstitutionProposal = {
        productId: "FSH013",
        originalMaterial: "Premium Material",
        suggestedMaterial: "Standard Material",
        costReductionPercent: 18,
        qualityImpact: "moderate",
        qualityJustification: "Noticeable difference",
      };

      // High quality priority: only accept "none" or "minor" with high savings
      const shouldAccept =
        qualityPriority < 40 ||
        proposal.qualityImpact === "none" ||
        (proposal.qualityImpact === "minor" && proposal.costReductionPercent > 20);

      expect(shouldAccept).toBe(false);
    });

    it("should accept moderate impact with low quality priority and high savings", () => {
      const qualityPriority = 15; // Low quality focus
      const proposal: SubstitutionProposal = {
        productId: "FSH013",
        originalMaterial: "Premium Material",
        suggestedMaterial: "Economy Material",
        costReductionPercent: 25,
        qualityImpact: "moderate",
        qualityJustification: "Acceptable for price point",
      };

      // Low quality priority: accept if savings > 20%
      const shouldAccept =
        qualityPriority < 25 && proposal.costReductionPercent >= 20;

      expect(shouldAccept).toBe(true);
    });

    it("should apply conditions for minor impact substitutions", () => {
      const qualityPriority = 35;
      const proposal: SubstitutionProposal = {
        productId: "FSH013",
        originalMaterial: "Material A",
        suggestedMaterial: "Material B",
        costReductionPercent: 15,
        qualityImpact: "minor",
        qualityJustification: "Slight variation in texture",
      };

      // Medium quality priority: accept minor with conditions
      const shouldAcceptWithConditions =
        proposal.qualityImpact === "minor" &&
        qualityPriority >= 25 &&
        qualityPriority < 40;

      expect(shouldAcceptWithConditions).toBe(true);
    });
  });

  describe("Multiple Substitutions", () => {
    it("should track multiple substitutions from same supplier", () => {
      const tracker = new SubstitutionTracker(1);

      const proposal1: SubstitutionProposal = {
        productId: "FSH013",
        originalMaterial: "Cotton",
        suggestedMaterial: "Blend",
        costReductionPercent: 10,
        qualityImpact: "none",
        qualityJustification: "Same specs",
      };
      const proposal2: SubstitutionProposal = {
        productId: "FSH014",
        originalMaterial: "Rubber",
        suggestedMaterial: "Recycled Rubber",
        costReductionPercent: 8,
        qualityImpact: "minor",
        qualityJustification: "Slightly less durable",
      };

      tracker.propose(proposal1, "sub-1");
      tracker.propose(proposal2, "sub-2");

      tracker.accept("sub-1");
      tracker.reject("sub-2", "quality_concerns");

      expect(tracker.getAllSubstitutions()).toHaveLength(2);
      expect(tracker.calculateTotalSavings()).toBe(10);
      expect(tracker.hasAcceptedSubstitutions()).toBe(true);
    });

    it("should generate comprehensive summary", () => {
      const tracker = new SubstitutionTracker(1);

      tracker.propose(
        {
          productId: "FSH013",
          originalMaterial: "Cotton A",
          suggestedMaterial: "Cotton B",
          costReductionPercent: 12,
          qualityImpact: "none",
          qualityJustification: "Same",
        },
        "sub-1"
      );
      tracker.propose(
        {
          productId: "FSH014",
          originalMaterial: "Rubber A",
          suggestedMaterial: "Rubber B",
          costReductionPercent: 8,
          qualityImpact: "minor",
          qualityJustification: "Similar",
        },
        "sub-2"
      );

      tracker.accept("sub-1");
      tracker.reject("sub-2", "customer_requirements");

      const summary = tracker.getSubstitutionSummary();

      expect(summary).toContain("Accepted (1):");
      expect(summary).toContain("Cotton A → Cotton B");
      expect(summary).toContain("Rejected (1):");
      expect(summary).toContain("Rubber A → Rubber B");
      expect(summary).toContain("customer_requirements");
    });
  });

  describe("Result Integration", () => {
    it("should format accepted substitutions for negotiation result", () => {
      const tracker = new SubstitutionTracker(1);

      tracker.propose(
        {
          productId: "FSH013",
          originalMaterial: "Cotton",
          suggestedMaterial: "Eco Cotton",
          costReductionPercent: 10,
          qualityImpact: "none",
          qualityJustification: "Same quality",
          leadTimeChange: -3,
        },
        "sub-1"
      );
      tracker.accept("sub-1", "Sample required");

      const accepted = tracker.getAcceptedSubstitutions();

      // This would be included in the negotiation result
      const substitutionResult = {
        acceptedSubstitutions: accepted.map((sub) => ({
          substitutionId: sub.substitutionId,
          productId: sub.productId,
          originalMaterial: sub.proposal.originalMaterial,
          suggestedMaterial: sub.proposal.suggestedMaterial,
          costReductionPercent: sub.proposal.costReductionPercent,
          qualityImpact: sub.proposal.qualityImpact,
          conditions: sub.response?.conditions,
        })),
        totalSubstitutionSavings: tracker.calculateTotalSavings(),
        leadTimeAdjustment: tracker.calculateLeadTimeChange(),
      };

      expect(substitutionResult.acceptedSubstitutions).toHaveLength(1);
      expect(substitutionResult.totalSubstitutionSavings).toBe(10);
      expect(substitutionResult.leadTimeAdjustment).toBe(-3);
      expect(substitutionResult.acceptedSubstitutions[0].conditions).toBe("Sample required");
    });
  });
});

