import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SubstitutionTracker,
  createSubstitutionTracker,
  mergeSubstitutionRecords,
  calculateCombinedSavings,
} from "../../mastra/utils/substitution-tracker";
import type { SubstitutionProposal } from "../../mastra/tools/material-substitution-tool";

/**
 * Substitution Tracker Tests
 *
 * Verify substitution tracking functionality:
 * 1. Proposal tracking and status management
 * 2. Savings calculations
 * 3. Quality impact aggregation
 * 4. Summary generation
 */

describe("Substitution Tracker", () => {
  const mockProposal1: SubstitutionProposal = {
    productId: "FSH013",
    originalMaterial: "Premium Cotton",
    suggestedMaterial: "Organic Cotton Blend",
    costReductionPercent: 12,
    qualityImpact: "minor",
    qualityJustification: "Similar thread count",
    leadTimeChange: -2,
  };

  const mockProposal2: SubstitutionProposal = {
    productId: "FSH014",
    originalMaterial: "Natural Rubber",
    suggestedMaterial: "Recycled Rubber Blend",
    costReductionPercent: 8,
    qualityImpact: "none",
    qualityJustification: "Equivalent durability",
    leadTimeChange: 0,
  };

  const mockProposal3: SubstitutionProposal = {
    productId: "FSH015",
    originalMaterial: "Premium Leather",
    suggestedMaterial: "Synthetic Leather",
    costReductionPercent: 25,
    qualityImpact: "moderate",
    qualityJustification: "Different feel but acceptable",
    leadTimeChange: -5,
  };

  let tracker: SubstitutionTracker;

  beforeEach(() => {
    tracker = new SubstitutionTracker(1);
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));
  });

  describe("Constructor", () => {
    it("should create tracker with supplier ID", () => {
      const tracker = new SubstitutionTracker(2);
      expect(tracker.getSupplierId()).toBe(2);
    });

    it("should initialize with empty substitutions", () => {
      expect(tracker.hasSubstitutions()).toBe(false);
      expect(tracker.getAllSubstitutions()).toHaveLength(0);
    });
  });

  describe("propose", () => {
    it("should track proposed substitution", () => {
      const record = tracker.propose(mockProposal1, "sub-1");

      expect(record.substitutionId).toBe("sub-1");
      expect(record.productId).toBe("FSH013");
      expect(record.status).toBe("pending");
      expect(record.proposal).toEqual(mockProposal1);
    });

    it("should add substitution to pending list", () => {
      tracker.propose(mockProposal1, "sub-1");

      expect(tracker.getPendingSubstitutions()).toHaveLength(1);
      expect(tracker.hasSubstitutions()).toBe(true);
    });

    it("should track multiple proposals", () => {
      tracker.propose(mockProposal1, "sub-1");
      tracker.propose(mockProposal2, "sub-2");

      expect(tracker.getAllSubstitutions()).toHaveLength(2);
      expect(tracker.getPendingSubstitutions()).toHaveLength(2);
    });

    it("should allow retrieval by ID", () => {
      tracker.propose(mockProposal1, "sub-1");

      const record = tracker.get("sub-1");
      expect(record?.proposal.originalMaterial).toBe("Premium Cotton");
    });
  });

  describe("accept", () => {
    it("should accept pending substitution", () => {
      tracker.propose(mockProposal1, "sub-1");
      const record = tracker.accept("sub-1");

      expect(record?.status).toBe("accepted");
      expect(record?.response?.timestamp).toBe(new Date("2024-01-15T10:00:00Z").getTime());
    });

    it("should accept with conditions", () => {
      tracker.propose(mockProposal1, "sub-1");
      const record = tracker.accept("sub-1", "Requires sample approval");

      expect(record?.response?.conditions).toBe("Requires sample approval");
    });

    it("should move from pending to accepted list", () => {
      tracker.propose(mockProposal1, "sub-1");
      tracker.accept("sub-1");

      expect(tracker.getPendingSubstitutions()).toHaveLength(0);
      expect(tracker.getAcceptedSubstitutions()).toHaveLength(1);
    });

    it("should return null for unknown substitution", () => {
      const result = tracker.accept("unknown-id");
      expect(result).toBeNull();
    });
  });

  describe("reject", () => {
    it("should reject pending substitution", () => {
      tracker.propose(mockProposal1, "sub-1");
      const record = tracker.reject("sub-1", "quality_concerns");

      expect(record?.status).toBe("rejected");
      expect(record?.response?.reason).toBe("quality_concerns");
    });

    it("should move from pending to rejected list", () => {
      tracker.propose(mockProposal1, "sub-1");
      tracker.reject("sub-1", "insufficient_savings");

      expect(tracker.getPendingSubstitutions()).toHaveLength(0);
      expect(tracker.getRejectedSubstitutions()).toHaveLength(1);
    });

    it("should return null for unknown substitution", () => {
      const result = tracker.reject("unknown-id", "other");
      expect(result).toBeNull();
    });
  });

  describe("calculateTotalSavings", () => {
    it("should calculate savings from accepted substitutions", () => {
      tracker.propose(mockProposal1, "sub-1"); // 12%
      tracker.propose(mockProposal2, "sub-2"); // 8%

      tracker.accept("sub-1");
      tracker.accept("sub-2");

      expect(tracker.calculateTotalSavings()).toBe(20);
    });

    it("should not include rejected substitutions in savings", () => {
      tracker.propose(mockProposal1, "sub-1"); // 12%
      tracker.propose(mockProposal2, "sub-2"); // 8%

      tracker.accept("sub-1");
      tracker.reject("sub-2", "quality_concerns");

      expect(tracker.calculateTotalSavings()).toBe(12);
    });

    it("should not include pending substitutions in savings", () => {
      tracker.propose(mockProposal1, "sub-1"); // 12%
      tracker.propose(mockProposal2, "sub-2"); // 8%

      tracker.accept("sub-1");
      // sub-2 remains pending

      expect(tracker.calculateTotalSavings()).toBe(12);
    });

    it("should return 0 when no accepted substitutions", () => {
      tracker.propose(mockProposal1, "sub-1");
      tracker.reject("sub-1", "quality_concerns");

      expect(tracker.calculateTotalSavings()).toBe(0);
    });
  });

  describe("calculateQualityImpact", () => {
    it("should return 'none' when no accepted substitutions", () => {
      expect(tracker.calculateQualityImpact()).toBe("none");
    });

    it("should return 'none' for substitutions with no impact", () => {
      tracker.propose(mockProposal2, "sub-1"); // none impact
      tracker.accept("sub-1");

      expect(tracker.calculateQualityImpact()).toBe("none");
    });

    it("should return 'minor' for minor impact substitutions", () => {
      tracker.propose(mockProposal1, "sub-1"); // minor impact
      tracker.accept("sub-1");

      expect(tracker.calculateQualityImpact()).toBe("minor");
    });

    it("should calculate average impact level", () => {
      // none (0) + moderate (2) = avg 1 = minor
      tracker.propose(mockProposal2, "sub-1"); // none
      tracker.propose(mockProposal3, "sub-2"); // moderate
      tracker.accept("sub-1");
      tracker.accept("sub-2");

      expect(tracker.calculateQualityImpact()).toBe("minor");
    });
  });

  describe("calculateLeadTimeChange", () => {
    it("should calculate total lead time change", () => {
      tracker.propose(mockProposal1, "sub-1"); // -2 days
      tracker.propose(mockProposal3, "sub-2"); // -5 days
      tracker.accept("sub-1");
      tracker.accept("sub-2");

      expect(tracker.calculateLeadTimeChange()).toBe(-7);
    });

    it("should only include accepted substitutions", () => {
      tracker.propose(mockProposal1, "sub-1"); // -2 days
      tracker.propose(mockProposal3, "sub-2"); // -5 days
      tracker.accept("sub-1");
      // sub-2 not accepted

      expect(tracker.calculateLeadTimeChange()).toBe(-2);
    });

    it("should handle undefined lead time changes", () => {
      const proposalNoLeadTime: SubstitutionProposal = {
        ...mockProposal2,
        leadTimeChange: undefined,
      };
      tracker.propose(proposalNoLeadTime, "sub-1");
      tracker.accept("sub-1");

      expect(tracker.calculateLeadTimeChange()).toBe(0);
    });
  });

  describe("getSubstitutionSummary", () => {
    it("should return message when no substitutions", () => {
      expect(tracker.getSubstitutionSummary()).toBe("No material substitutions proposed.");
    });

    it("should format accepted substitutions", () => {
      tracker.propose(mockProposal1, "sub-1");
      tracker.accept("sub-1");

      const summary = tracker.getSubstitutionSummary();
      expect(summary).toContain("Accepted (1):");
      expect(summary).toContain("Premium Cotton → Organic Cotton Blend");
      expect(summary).toContain("12% savings");
      expect(summary).toContain("minor quality impact");
    });

    it("should format rejected substitutions", () => {
      tracker.propose(mockProposal1, "sub-1");
      tracker.reject("sub-1", "quality_concerns");

      const summary = tracker.getSubstitutionSummary();
      expect(summary).toContain("Rejected (1):");
      expect(summary).toContain("Reason: quality_concerns");
    });

    it("should format pending substitutions", () => {
      tracker.propose(mockProposal1, "sub-1");

      const summary = tracker.getSubstitutionSummary();
      expect(summary).toContain("Pending (1):");
      expect(summary).toContain("Premium Cotton → Organic Cotton Blend");
    });

    it("should show all categories when mixed", () => {
      tracker.propose(mockProposal1, "sub-1");
      tracker.propose(mockProposal2, "sub-2");
      tracker.propose(mockProposal3, "sub-3");
      tracker.accept("sub-1");
      tracker.reject("sub-2", "insufficient_savings");
      // sub-3 remains pending

      const summary = tracker.getSubstitutionSummary();
      expect(summary).toContain("Accepted (1):");
      expect(summary).toContain("Rejected (1):");
      expect(summary).toContain("Pending (1):");
    });
  });

  describe("hasAcceptedSubstitutions", () => {
    it("should return false when no substitutions", () => {
      expect(tracker.hasAcceptedSubstitutions()).toBe(false);
    });

    it("should return false when only pending/rejected", () => {
      tracker.propose(mockProposal1, "sub-1");
      tracker.reject("sub-1", "other");

      expect(tracker.hasAcceptedSubstitutions()).toBe(false);
    });

    it("should return true when has accepted", () => {
      tracker.propose(mockProposal1, "sub-1");
      tracker.accept("sub-1");

      expect(tracker.hasAcceptedSubstitutions()).toBe(true);
    });
  });
});

describe("Utility Functions", () => {
  const mockProposal: SubstitutionProposal = {
    productId: "FSH013",
    originalMaterial: "Cotton",
    suggestedMaterial: "Blend",
    costReductionPercent: 10,
    qualityImpact: "none",
    qualityJustification: "Same quality",
  };

  describe("createSubstitutionTracker", () => {
    it("should create tracker with supplier ID", () => {
      const tracker = createSubstitutionTracker(3);
      expect(tracker.getSupplierId()).toBe(3);
    });
  });

  describe("mergeSubstitutionRecords", () => {
    it("should merge records from multiple trackers", () => {
      const tracker1 = new SubstitutionTracker(1);
      const tracker2 = new SubstitutionTracker(2);

      tracker1.propose({ ...mockProposal, productId: "FSH001" }, "sub-1");
      tracker2.propose({ ...mockProposal, productId: "FSH002" }, "sub-2");

      const merged = mergeSubstitutionRecords([tracker1, tracker2]);

      expect(merged).toHaveLength(2);
      expect(merged.map((r) => r.productId)).toContain("FSH001");
      expect(merged.map((r) => r.productId)).toContain("FSH002");
    });

    it("should return empty array for empty trackers", () => {
      const merged = mergeSubstitutionRecords([]);
      expect(merged).toHaveLength(0);
    });
  });

  describe("calculateCombinedSavings", () => {
    it("should sum savings from multiple trackers", () => {
      const tracker1 = new SubstitutionTracker(1);
      const tracker2 = new SubstitutionTracker(2);

      tracker1.propose({ ...mockProposal, costReductionPercent: 10 }, "sub-1");
      tracker2.propose({ ...mockProposal, costReductionPercent: 15 }, "sub-2");

      tracker1.accept("sub-1");
      tracker2.accept("sub-2");

      const total = calculateCombinedSavings([tracker1, tracker2]);

      expect(total).toBe(25);
    });

    it("should return 0 for no accepted substitutions", () => {
      const tracker1 = new SubstitutionTracker(1);
      const tracker2 = new SubstitutionTracker(2);

      tracker1.propose(mockProposal, "sub-1");
      // Not accepted

      const total = calculateCombinedSavings([tracker1, tracker2]);

      expect(total).toBe(0);
    });
  });
});

