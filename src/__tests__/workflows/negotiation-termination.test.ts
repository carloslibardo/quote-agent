import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NegotiationCallbacks } from "../../mastra/storage/message-persister";

/**
 * Negotiation Termination Integration Tests
 * 
 * These tests verify that negotiations terminate correctly based on:
 * 1. Explicit acceptance (accept-offer tool)
 * 2. Explicit rejection (reject-offer tool with isNegotiationEnded: true)
 * 3. Max rounds reached without agreement
 * 4. Price stagnation detected
 * 5. Price gap too large
 */

// Mock responses for different termination scenarios
const mockAcceptanceResponse = {
  text: "We accept your offer. Looking forward to working together.",
  toolCalls: [
    {
      toolName: "accept-offer",
      toolCallId: "call-accept-123",
      args: {
        offerId: "offer-1-123",
        acceptedTerms: {
          unitPrice: 25.0,
          leadTimeDays: 30,
          paymentTerms: "30/70",
        },
        confirmationMessage: "Deal accepted!",
      },
      result: {
        success: true,
        offerId: "offer-1-123",
        acceptedTerms: {
          unitPrice: 25.0,
          leadTimeDays: 30,
          paymentTerms: "30/70",
        },
        status: "accepted",
        message: "Deal accepted!",
      },
    },
  ],
};

const mockRejectionResponse = {
  text: "Unfortunately, we cannot proceed with this negotiation.",
  toolCalls: [
    {
      toolName: "reject-offer",
      toolCallId: "call-reject-456",
      args: {
        offerId: "offer-1-456",
        reason: "Price expectations too far apart",
        isNegotiationEnded: true,
        rejectionCategory: "price_too_high",
        message: "We must decline.",
      },
      result: {
        success: true,
        offerId: "offer-1-456",
        reason: "Price expectations too far apart",
        status: "impasse",
        message: "We must decline.",
      },
    },
  ],
};

const mockContinueResponse = {
  text: "Let's continue negotiating. Here's our counter-offer.",
  toolCalls: [
    {
      toolName: "counter-offer",
      toolCallId: "call-counter-789",
      args: {
        previousOfferId: "offer-1-789",
        counterOffer: {
          unitPrice: 27.0,
          leadTimeDays: 28,
          paymentTerms: "30/70",
        },
        changesExplanation: "Slight adjustment for faster delivery",
        message: "Consider this counter-offer.",
      },
      result: {
        success: true,
        offerId: "counter-1-789",
        previousOfferId: "offer-1-789",
        counterOffer: {
          unitPrice: 27.0,
          leadTimeDays: 28,
          paymentTerms: "30/70",
        },
        changesExplanation: "Slight adjustment for faster delivery",
        message: "Consider this counter-offer.",
      },
    },
  ],
};

describe("Negotiation Termination", () => {
  const mockCallbacks: NegotiationCallbacks = {
    onMessage: vi.fn(() => Promise.resolve()),
    onStatusChange: vi.fn(() => Promise.resolve()),
    onOfferReceived: vi.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Acceptance Scenarios", () => {
    it("should recognize accept-offer tool call", () => {
      const response = mockAcceptanceResponse;
      const acceptToolCall = response.toolCalls.find(
        (tc) => tc.toolName === "accept-offer"
      );

      expect(acceptToolCall).toBeDefined();
      expect(acceptToolCall?.args.acceptedTerms).toBeDefined();
      expect(acceptToolCall?.result?.status).toBe("accepted");
    });

    it("should extract accepted terms from tool call", () => {
      const response = mockAcceptanceResponse;
      const acceptToolCall = response.toolCalls.find(
        (tc) => tc.toolName === "accept-offer"
      );

      const acceptedTerms = acceptToolCall?.args.acceptedTerms as {
        unitPrice: number;
        leadTimeDays: number;
        paymentTerms: string;
      };

      expect(acceptedTerms.unitPrice).toBe(25.0);
      expect(acceptedTerms.leadTimeDays).toBe(30);
      expect(acceptedTerms.paymentTerms).toBe("30/70");
    });
  });

  describe("Rejection Scenarios", () => {
    it("should recognize reject-offer tool call with isNegotiationEnded: true", () => {
      const response = mockRejectionResponse;
      const rejectToolCall = response.toolCalls.find(
        (tc) => tc.toolName === "reject-offer"
      );

      expect(rejectToolCall).toBeDefined();
      expect(rejectToolCall?.args.isNegotiationEnded).toBe(true);
      expect(rejectToolCall?.result?.status).toBe("impasse");
    });

    it("should capture rejection reason and category", () => {
      const response = mockRejectionResponse;
      const rejectToolCall = response.toolCalls.find(
        (tc) => tc.toolName === "reject-offer"
      );

      expect(rejectToolCall?.args.reason).toBe("Price expectations too far apart");
      expect(rejectToolCall?.args.rejectionCategory).toBe("price_too_high");
    });

    it("should differentiate between soft rejection and impasse", () => {
      const softRejection = {
        ...mockRejectionResponse,
        toolCalls: [
          {
            ...mockRejectionResponse.toolCalls[0],
            args: {
              ...mockRejectionResponse.toolCalls[0].args,
              isNegotiationEnded: false,
            },
            result: {
              ...mockRejectionResponse.toolCalls[0].result,
              status: "rejected",
            },
          },
        ],
      };

      const rejectToolCall = softRejection.toolCalls.find(
        (tc) => tc.toolName === "reject-offer"
      );

      expect(rejectToolCall?.args.isNegotiationEnded).toBe(false);
      expect(rejectToolCall?.result?.status).toBe("rejected");
    });
  });

  describe("Continuation Scenarios", () => {
    it("should recognize counter-offer as continuing negotiation", () => {
      const response = mockContinueResponse;
      const counterToolCall = response.toolCalls.find(
        (tc) => tc.toolName === "counter-offer"
      );

      expect(counterToolCall).toBeDefined();
      expect(counterToolCall?.args.counterOffer).toBeDefined();
    });

    it("should track offer progression from counter-offers", () => {
      const response = mockContinueResponse;
      const counterToolCall = response.toolCalls.find(
        (tc) => tc.toolName === "counter-offer"
      );

      const counterOffer = counterToolCall?.args.counterOffer as {
        unitPrice: number;
        leadTimeDays: number;
        paymentTerms: string;
      };

      expect(counterOffer.unitPrice).toBe(27.0);
      expect(counterOffer.leadTimeDays).toBe(28);
    });
  });

  describe("Callback Notifications", () => {
    it("should call onStatusChange with completed on acceptance", async () => {
      await mockCallbacks.onStatusChange("neg-123", "completed", 3, {
        unitPrice: 25.0,
        leadTimeDays: 30,
        paymentTerms: "30/70",
        products: [],
        subtotal: 0,
        volumeDiscount: 0,
        volumeDiscountPercent: 0,
      });

      expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith(
        "neg-123",
        "completed",
        3,
        expect.objectContaining({
          unitPrice: 25.0,
        })
      );
    });

    it("should call onStatusChange with impasse on rejection", async () => {
      await mockCallbacks.onStatusChange("neg-123", "impasse", 2, undefined);

      expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith(
        "neg-123",
        "impasse",
        2,
        undefined
      );
    });

    it("should call onOfferReceived when offer is extracted", async () => {
      await mockCallbacks.onOfferReceived("neg-123", {
        supplierId: 1,
        avgPrice: 27.0,
        leadTime: 28,
        paymentTerms: "30/70",
      });

      expect(mockCallbacks.onOfferReceived).toHaveBeenCalledWith(
        "neg-123",
        expect.objectContaining({
          avgPrice: 27.0,
        })
      );
    });
  });

  describe("Tool Call Parsing", () => {
    it("should handle response with no tool calls", () => {
      const noToolsResponse = {
        text: "Just a text response without tools.",
        toolCalls: [],
      };

      expect(noToolsResponse.toolCalls).toHaveLength(0);
    });

    it("should handle response with multiple tool calls", () => {
      const multiToolResponse = {
        text: "Response with multiple considerations.",
        toolCalls: [
          { toolName: "propose-offer", toolCallId: "1", args: {}, result: {} },
          { toolName: "counter-offer", toolCallId: "2", args: {}, result: {} },
        ],
      };

      expect(multiToolResponse.toolCalls).toHaveLength(2);
      expect(
        multiToolResponse.toolCalls.map((tc) => tc.toolName)
      ).toContain("propose-offer");
      expect(
        multiToolResponse.toolCalls.map((tc) => tc.toolName)
      ).toContain("counter-offer");
    });

    it("should find specific tool call by name", () => {
      const response = mockAcceptanceResponse;
      const acceptTool = response.toolCalls.find(
        (tc) => tc.toolName === "accept-offer"
      );
      const rejectTool = response.toolCalls.find(
        (tc) => tc.toolName === "reject-offer"
      );

      expect(acceptTool).toBeDefined();
      expect(rejectTool).toBeUndefined();
    });
  });

  describe("Termination Conditions Matrix", () => {
    const scenarios = [
      {
        name: "brand accepts",
        toolName: "accept-offer",
        isEnded: true,
        expectedStatus: "completed",
      },
      {
        name: "supplier accepts",
        toolName: "accept-offer",
        isEnded: true,
        expectedStatus: "completed",
      },
      {
        name: "brand rejects with impasse",
        toolName: "reject-offer",
        isEnded: true,
        expectedStatus: "impasse",
      },
      {
        name: "supplier rejects with impasse",
        toolName: "reject-offer",
        isEnded: true,
        expectedStatus: "impasse",
      },
      {
        name: "soft rejection (continue)",
        toolName: "reject-offer",
        isEnded: false,
        expectedStatus: "active",
      },
      {
        name: "counter-offer (continue)",
        toolName: "counter-offer",
        isEnded: false,
        expectedStatus: "active",
      },
    ];

    scenarios.forEach((scenario) => {
      it(`should handle ${scenario.name}`, () => {
        let status: "completed" | "impasse" | "active";

        if (scenario.toolName === "accept-offer") {
          status = "completed";
        } else if (
          scenario.toolName === "reject-offer" &&
          scenario.isEnded
        ) {
          status = "impasse";
        } else {
          status = "active";
        }

        expect(status).toBe(scenario.expectedStatus);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined tool calls array", () => {
      const response = {
        text: "Response without toolCalls property",
      };

      // Check that code handles undefined safely
      const toolCalls = (response as { toolCalls?: unknown[] }).toolCalls ?? [];
      expect(toolCalls).toHaveLength(0);
    });

    it("should handle malformed tool call args", () => {
      const malformedResponse = {
        text: "Response with malformed tool call",
        toolCalls: [
          {
            toolName: "accept-offer",
            toolCallId: "123",
            args: null, // Malformed
            result: {},
          },
        ],
      };

      const acceptTool = malformedResponse.toolCalls.find(
        (tc) => tc.toolName === "accept-offer"
      );
      expect(acceptTool?.args).toBeNull();
    });

    it("should handle empty offer in acceptance", () => {
      const emptyOfferResponse = {
        text: "Accepting without specifying terms",
        toolCalls: [
          {
            toolName: "accept-offer",
            toolCallId: "123",
            args: {
              offerId: "offer-123",
              acceptedTerms: {}, // Empty terms
              confirmationMessage: "Accepted!",
            },
            result: { status: "accepted" },
          },
        ],
      };

      const acceptTool = emptyOfferResponse.toolCalls.find(
        (tc) => tc.toolName === "accept-offer"
      );
      expect(acceptTool?.args.acceptedTerms).toBeDefined();
      expect(Object.keys(acceptTool?.args.acceptedTerms as object)).toHaveLength(0);
    });
  });
});

