/**
 * Negotiation Tools Unit Tests
 *
 * Tests for the negotiation tools: propose, counter, accept, reject.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptOfferTool,
  counterOfferTool,
  proposeTool,
  rejectOfferTool,
} from "../../mastra/tools/negotiation-tools";

describe("Negotiation Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("proposeTool", () => {
    it("should create a proposal with valid offer data", async () => {
      const input = {
        supplierId: 1,
        offer: {
          unitPrice: 25.0,
          leadTimeDays: 30,
          paymentTerms: "30/70",
        },
        message: "Initial offer for your consideration.",
      };

      const result = await proposeTool.execute?.(input);

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.offerId).toMatch(/^offer-1-/);
      expect(result?.offer.unitPrice).toBe(25.0);
      expect(result?.offer.leadTimeDays).toBe(30);
      expect(result?.offer.paymentTerms).toBe("30/70");
      expect(result?.message).toBe("Initial offer for your consideration.");
    });

    it("should include notes when provided", async () => {
      const input = {
        supplierId: 2,
        offer: {
          unitPrice: 30.0,
          leadTimeDays: 25,
          paymentTerms: "33/33/33",
          notes: "Volume discount available for orders over 10k units",
        },
        message: "Premium quality offer.",
      };

      const result = await proposeTool.execute?.(input);

      expect(result?.offer.notes).toBe(
        "Volume discount available for orders over 10k units"
      );
    });

    it("should generate unique offer IDs", async () => {
      const input1 = {
        supplierId: 1,
        offer: { unitPrice: 25.0, leadTimeDays: 30, paymentTerms: "30/70" },
        message: "First offer",
      };
      const input2 = {
        supplierId: 1,
        offer: { unitPrice: 26.0, leadTimeDays: 28, paymentTerms: "30/70" },
        message: "Second offer",
      };

      const result1 = await proposeTool.execute?.(input1);
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 5));
      const result2 = await proposeTool.execute?.(input2);

      expect(result1?.offerId).not.toBe(result2?.offerId);
    });
  });

  describe("counterOfferTool", () => {
    it("should create a counter offer referencing previous offer", async () => {
      const input = {
        previousOfferId: "offer-1-12345",
        counterOffer: {
          unitPrice: 22.0,
          leadTimeDays: 28,
          paymentTerms: "30/70",
        },
        changesExplanation: "Reduced price by 12% based on volume commitment",
        message: "Counter proposal with improved pricing.",
      };

      const result = await counterOfferTool.execute?.(input);

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.offerId).toMatch(/^counter-/);
      expect(result?.previousOfferId).toBe("offer-1-12345");
      expect(result?.counterOffer.unitPrice).toBe(22.0);
      expect(result?.changesExplanation).toBe(
        "Reduced price by 12% based on volume commitment"
      );
    });

    it("should preserve all counter offer terms", async () => {
      const input = {
        previousOfferId: "offer-2-99999",
        counterOffer: {
          unitPrice: 18.5,
          leadTimeDays: 35,
          paymentTerms: "33/33/33",
          notes: "Rush fee waived for this order",
        },
        changesExplanation: "Extended lead time for better pricing",
        message: "Improved terms.",
      };

      const result = await counterOfferTool.execute?.(input);

      expect(result?.counterOffer.unitPrice).toBe(18.5);
      expect(result?.counterOffer.leadTimeDays).toBe(35);
      expect(result?.counterOffer.paymentTerms).toBe("33/33/33");
      expect(result?.counterOffer.notes).toBe("Rush fee waived for this order");
    });
  });

  describe("acceptOfferTool", () => {
    it("should accept offer and return accepted status", async () => {
      const input = {
        offerId: "counter-67890",
        acceptedTerms: {
          unitPrice: 23.5,
          leadTimeDays: 28,
          paymentTerms: "30/70",
        },
        confirmationMessage: "We accept these terms.",
      };

      const result = await acceptOfferTool.execute?.(input);

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.status).toBe("accepted");
      expect(result?.offerId).toBe("counter-67890");
      expect(result?.acceptedTerms.unitPrice).toBe(23.5);
    });

    it("should return the confirmation message", async () => {
      const input = {
        offerId: "offer-3-55555",
        acceptedTerms: {
          unitPrice: 20.0,
          leadTimeDays: 15,
          paymentTerms: "30/70",
        },
        confirmationMessage:
          "Deal confirmed. Looking forward to the partnership.",
      };

      const result = await acceptOfferTool.execute?.(input);

      expect(result?.message).toBe(
        "Deal confirmed. Looking forward to the partnership."
      );
    });
  });

  describe("rejectOfferTool", () => {
    it("should reject offer without ending negotiation", async () => {
      const input = {
        offerId: "offer-2-11111",
        reason: "Price exceeds our budget by 20%",
        isNegotiationEnded: false,
        message: "We need a lower price to proceed.",
      };

      const result = await rejectOfferTool.execute?.(input);

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.status).toBe("rejected");
      expect(result?.reason).toBe("Price exceeds our budget by 20%");
    });

    it("should end negotiation as impasse when specified", async () => {
      const input = {
        offerId: "counter-22222",
        reason: "Cannot meet minimum quality requirements",
        isNegotiationEnded: true,
        message: "Unable to reach agreement.",
      };

      const result = await rejectOfferTool.execute?.(input);

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.status).toBe("impasse");
    });

    it("should include rejection message", async () => {
      const input = {
        offerId: "offer-1-33333",
        reason: "Lead time too long",
        isNegotiationEnded: false,
        message: "Please consider faster delivery options.",
      };

      const result = await rejectOfferTool.execute?.(input);

      expect(result?.message).toBe("Please consider faster delivery options.");
    });
  });
});

describe("Tool Schema Validation", () => {
  it("proposeTool has correct id and description", () => {
    expect(proposeTool.id).toBe("propose-offer");
    expect(proposeTool.description).toContain("initial offer");
  });

  it("counterOfferTool has correct id and description", () => {
    expect(counterOfferTool.id).toBe("counter-offer");
    expect(counterOfferTool.description).toContain("Counter");
  });

  it("acceptOfferTool has correct id and description", () => {
    expect(acceptOfferTool.id).toBe("accept-offer");
    expect(acceptOfferTool.description).toContain("Accept");
  });

  it("rejectOfferTool has correct id and description", () => {
    expect(rejectOfferTool.id).toBe("reject-offer");
    expect(rejectOfferTool.description).toContain("Reject");
  });
});
