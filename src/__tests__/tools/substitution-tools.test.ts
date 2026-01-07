import { describe, it, expect } from "vitest";
import {
  suggestSubstitutionTool,
  acceptSubstitutionTool,
  rejectSubstitutionTool,
  type SubstitutionProposal,
} from "../../mastra/tools/material-substitution-tool";

/**
 * Material Substitution Tools Tests
 *
 * Verify that substitution negotiation tools work correctly:
 * 1. suggestSubstitutionTool creates proposals with unique IDs
 * 2. acceptSubstitutionTool confirms acceptance with conditions
 * 3. rejectSubstitutionTool records rejection with categorized reason
 */

describe("Material Substitution Tools", () => {
  const mockProposal: SubstitutionProposal = {
    productId: "FSH013",
    originalMaterial: "Premium Cotton",
    suggestedMaterial: "Organic Cotton Blend",
    costReductionPercent: 12,
    qualityImpact: "minor",
    qualityJustification: "Similar thread count and durability",
    leadTimeChange: -2,
  };

  describe("suggestSubstitutionTool", () => {
    it("should create substitution proposal with unique ID", async () => {
      const input = {
        proposal: mockProposal,
        message: "We can offer a more cost-effective alternative.",
      };

      const result = await suggestSubstitutionTool.execute?.(input);

      expect(result?.success).toBe(true);
      expect(result?.substitutionId).toMatch(/^sub-\d+-FSH013$/);
      expect(result?.proposal.costReductionPercent).toBe(12);
      expect(result?.proposal.qualityImpact).toBe("minor");
      expect(result?.message).toBe("We can offer a more cost-effective alternative.");
    });

    it("should include all proposal fields in response", async () => {
      const input = {
        proposal: mockProposal,
        message: "Proposed alternative material.",
      };

      const result = await suggestSubstitutionTool.execute?.(input);

      expect(result?.proposal).toEqual(mockProposal);
    });

    it("should generate unique IDs for different proposals", async () => {
      const input1 = {
        proposal: { ...mockProposal, productId: "FSH001" },
        message: "First proposal",
      };
      const input2 = {
        proposal: { ...mockProposal, productId: "FSH002" },
        message: "Second proposal",
      };

      const result1 = await suggestSubstitutionTool.execute?.(input1);
      const result2 = await suggestSubstitutionTool.execute?.(input2);

      expect(result1?.substitutionId).not.toBe(result2?.substitutionId);
      expect(result1?.substitutionId).toContain("FSH001");
      expect(result2?.substitutionId).toContain("FSH002");
    });

    it("should handle proposal with zero lead time change", async () => {
      const input = {
        proposal: { ...mockProposal, leadTimeChange: 0 },
        message: "No impact on lead time.",
      };

      const result = await suggestSubstitutionTool.execute?.(input);

      expect(result?.success).toBe(true);
      expect(result?.proposal.leadTimeChange).toBe(0);
    });

    it("should handle proposal with no lead time change specified", async () => {
      const proposalWithoutLeadTime: SubstitutionProposal = {
        productId: "FSH013",
        originalMaterial: "Premium Cotton",
        suggestedMaterial: "Standard Cotton",
        costReductionPercent: 8,
        qualityImpact: "none",
        qualityJustification: "Equivalent quality",
      };

      const input = {
        proposal: proposalWithoutLeadTime,
        message: "Same quality, lower cost.",
      };

      const result = await suggestSubstitutionTool.execute?.(input);

      expect(result?.success).toBe(true);
      expect(result?.proposal.leadTimeChange).toBeUndefined();
    });
  });

  describe("acceptSubstitutionTool", () => {
    it("should accept substitution with conditions", async () => {
      const input = {
        substitutionId: "sub-123-FSH013",
        conditions: "Requires sample approval before production",
        message: "We accept this substitution pending quality verification.",
      };

      const result = await acceptSubstitutionTool.execute?.(input);

      expect(result?.success).toBe(true);
      expect(result?.status).toBe("accepted");
      expect(result?.substitutionId).toBe("sub-123-FSH013");
      expect(result?.conditions).toBe("Requires sample approval before production");
      expect(result?.message).toBe("We accept this substitution pending quality verification.");
    });

    it("should accept substitution without conditions", async () => {
      const input = {
        substitutionId: "sub-456-FSH014",
        message: "Accepted as proposed.",
      };

      const result = await acceptSubstitutionTool.execute?.(input);

      expect(result?.success).toBe(true);
      expect(result?.status).toBe("accepted");
      expect(result?.conditions).toBeUndefined();
    });

    it("should preserve substitution ID in response", async () => {
      const substitutionId = "sub-789-FSH015";
      const input = {
        substitutionId,
        message: "Confirmed.",
      };

      const result = await acceptSubstitutionTool.execute?.(input);

      expect(result?.substitutionId).toBe(substitutionId);
    });
  });

  describe("rejectSubstitutionTool", () => {
    it("should reject with quality_concerns reason", async () => {
      const input = {
        substitutionId: "sub-123-FSH013",
        reason: "quality_concerns" as const,
        explanation: "The alternative material does not meet our quality standards.",
        message: "Unable to accept this substitution due to quality requirements.",
      };

      const result = await rejectSubstitutionTool.execute?.(input);

      expect(result?.success).toBe(true);
      expect(result?.status).toBe("rejected");
      expect(result?.reason).toBe("quality_concerns");
      expect(result?.explanation).toBe("The alternative material does not meet our quality standards.");
    });

    it("should reject with customer_requirements reason", async () => {
      const input = {
        substitutionId: "sub-456-FSH014",
        reason: "customer_requirements" as const,
        explanation: "Our customer specifically requires the original material.",
        message: "Unable to accept this substitution.",
      };

      const result = await rejectSubstitutionTool.execute?.(input);

      expect(result?.status).toBe("rejected");
      expect(result?.reason).toBe("customer_requirements");
    });

    it("should reject with certification_issues reason", async () => {
      const input = {
        substitutionId: "sub-789-FSH015",
        reason: "certification_issues" as const,
        explanation: "The alternative material lacks required certifications.",
        message: "Certification requirements not met.",
      };

      const result = await rejectSubstitutionTool.execute?.(input);

      expect(result?.status).toBe("rejected");
      expect(result?.reason).toBe("certification_issues");
    });

    it("should reject with insufficient_savings reason", async () => {
      const input = {
        substitutionId: "sub-012-FSH016",
        reason: "insufficient_savings" as const,
        explanation: "The 3% savings does not justify the quality trade-off.",
        message: "Cost savings insufficient.",
      };

      const result = await rejectSubstitutionTool.execute?.(input);

      expect(result?.status).toBe("rejected");
      expect(result?.reason).toBe("insufficient_savings");
    });

    it("should reject with other reason", async () => {
      const input = {
        substitutionId: "sub-345-FSH017",
        reason: "other" as const,
        explanation: "Internal policy prevents material changes at this time.",
        message: "Cannot proceed with substitution.",
      };

      const result = await rejectSubstitutionTool.execute?.(input);

      expect(result?.status).toBe("rejected");
      expect(result?.reason).toBe("other");
      expect(result?.explanation).toContain("Internal policy");
    });
  });
});

