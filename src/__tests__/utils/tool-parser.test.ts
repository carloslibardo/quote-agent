/**
 * Tool Parser Tests
 *
 * Tests for extracting and parsing tool calls from agent responses.
 */

import { describe, it, expect } from "vitest";
import {
  extractToolCall,
  extractAllToolCalls,
  extractOfferFromToolCall,
  extractOfferFromArgs,
  extractNegotiationOutcome,
  validateOffer,
  hasNegotiationToolCall,
  getPrimaryNegotiationAction,
  type ToolCallResult,
  type ParsedOffer,
  type ResponseWithToolCalls,
} from "../../mastra/utils/tool-parser";

const mockOffer: ParsedOffer = {
  unitPrice: 25.0,
  leadTimeDays: 30,
  paymentTerms: "30/70",
  notes: "Volume discount available",
};

const mockProposeToolCall: ToolCallResult = {
  toolName: "propose-offer",
  toolCallId: "call-123",
  args: {
    supplierId: 1,
    offer: mockOffer,
    message: "Here is our offer",
  },
  result: {
    success: true,
    offerId: "offer-1-123",
    offer: mockOffer,
  },
};

const mockCounterToolCall: ToolCallResult = {
  toolName: "counter-offer",
  toolCallId: "call-456",
  args: {
    previousOfferId: "offer-1-123",
    counterOffer: { ...mockOffer, unitPrice: 23.0 },
    changesExplanation: "Reduced price by 8%",
  },
  result: {
    success: true,
    offerId: "offer-1-456",
    counterOffer: { ...mockOffer, unitPrice: 23.0 },
  },
};

const mockAcceptToolCall: ToolCallResult = {
  toolName: "accept-offer",
  toolCallId: "call-789",
  args: {
    offerId: "offer-1-456",
    acceptedTerms: mockOffer,
    confirmationMessage: "We accept these terms",
  },
  result: {
    status: "accepted",
    offerId: "offer-1-456",
    acceptedTerms: mockOffer,
  },
};

const mockRejectToolCall: ToolCallResult = {
  toolName: "reject-offer",
  toolCallId: "call-999",
  args: {
    offerId: "offer-1-123",
    reason: "Terms are not acceptable",
    isNegotiationEnded: false,
  },
  result: {
    status: "rejected",
    reason: "Terms are not acceptable",
    isNegotiationEnded: false,
  },
};

describe("Tool Parser", () => {
  describe("extractToolCall", () => {
    it("should extract propose-offer tool call", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockProposeToolCall],
      };

      const result = extractToolCall(response, "propose-offer");

      expect(result).toBeDefined();
      expect(result?.toolName).toBe("propose-offer");
      expect(result?.toolCallId).toBe("call-123");
    });

    it("should extract counter-offer tool call", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockCounterToolCall],
      };

      const result = extractToolCall(response, "counter-offer");

      expect(result).toBeDefined();
      expect(result?.toolName).toBe("counter-offer");
    });

    it("should return null for missing tool call", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockProposeToolCall],
      };

      const result = extractToolCall(response, "accept-offer");

      expect(result).toBeNull();
    });

    it("should return null for empty tool calls array", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [],
      };

      const result = extractToolCall(response, "propose-offer");

      expect(result).toBeNull();
    });

    it("should return null for undefined tool calls", () => {
      const response: ResponseWithToolCalls = {};

      const result = extractToolCall(response, "propose-offer");

      expect(result).toBeNull();
    });
  });

  describe("extractAllToolCalls", () => {
    it("should return all tool calls", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockProposeToolCall, mockCounterToolCall],
      };

      const result = extractAllToolCalls(response);

      expect(result).toHaveLength(2);
    });

    it("should return empty array for no tool calls", () => {
      const response: ResponseWithToolCalls = {};

      const result = extractAllToolCalls(response);

      expect(result).toHaveLength(0);
    });
  });

  describe("extractOfferFromToolCall", () => {
    it("should extract offer from propose-offer result", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockProposeToolCall],
      };

      const result = extractOfferFromToolCall(response);

      expect(result).toBeDefined();
      expect(result?.unitPrice).toBe(25.0);
      expect(result?.leadTimeDays).toBe(30);
      expect(result?.paymentTerms).toBe("30/70");
    });

    it("should extract offer from counter-offer result", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockCounterToolCall],
      };

      const result = extractOfferFromToolCall(response);

      expect(result).toBeDefined();
      expect(result?.unitPrice).toBe(23.0);
    });

    it("should return null when no offer tool call present", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockAcceptToolCall],
      };

      const result = extractOfferFromToolCall(response);

      expect(result).toBeNull();
    });

    it("should return null for empty response", () => {
      const response: ResponseWithToolCalls = {};

      const result = extractOfferFromToolCall(response);

      expect(result).toBeNull();
    });
  });

  describe("extractOfferFromArgs", () => {
    it("should extract offer from propose-offer args", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockProposeToolCall],
      };

      const result = extractOfferFromArgs(response);

      expect(result).toBeDefined();
      expect(result?.unitPrice).toBe(25.0);
    });

    it("should extract offer from counter-offer args", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockCounterToolCall],
      };

      const result = extractOfferFromArgs(response);

      expect(result).toBeDefined();
      expect(result?.unitPrice).toBe(23.0);
    });
  });

  describe("extractNegotiationOutcome", () => {
    it("should detect accepted status", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockAcceptToolCall],
      };

      const result = extractNegotiationOutcome(response);

      expect(result.status).toBe("accepted");
      expect(result.offer).toBeDefined();
    });

    it("should detect rejected status", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockRejectToolCall],
      };

      const result = extractNegotiationOutcome(response);

      expect(result.status).toBe("rejected");
      expect(result.reason).toBe("Terms are not acceptable");
    });

    it("should detect impasse status", () => {
      const impasseToolCall: ToolCallResult = {
        ...mockRejectToolCall,
        args: { ...mockRejectToolCall.args, isNegotiationEnded: true },
        result: { ...mockRejectToolCall.result, isNegotiationEnded: true },
      };

      const response: ResponseWithToolCalls = {
        toolCalls: [impasseToolCall],
      };

      const result = extractNegotiationOutcome(response);

      expect(result.status).toBe("impasse");
    });

    it("should return ongoing for propose-offer", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockProposeToolCall],
      };

      const result = extractNegotiationOutcome(response);

      expect(result.status).toBe("ongoing");
    });

    it("should return ongoing for counter-offer", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockCounterToolCall],
      };

      const result = extractNegotiationOutcome(response);

      expect(result.status).toBe("ongoing");
    });

    it("should return ongoing for empty response", () => {
      const response: ResponseWithToolCalls = {};

      const result = extractNegotiationOutcome(response);

      expect(result.status).toBe("ongoing");
    });
  });

  describe("validateOffer", () => {
    it("should validate offer within bounds", () => {
      const offer: ParsedOffer = {
        unitPrice: 25,
        leadTimeDays: 30,
        paymentTerms: "30/70",
      };

      const result = validateOffer(offer, { minPrice: 20, maxPrice: 50 });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject offer below minimum price", () => {
      const offer: ParsedOffer = {
        unitPrice: 10,
        leadTimeDays: 30,
        paymentTerms: "30/70",
      };

      const result = validateOffer(offer, { minPrice: 20 });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("below minimum");
    });

    it("should reject offer above maximum price", () => {
      const offer: ParsedOffer = {
        unitPrice: 100,
        leadTimeDays: 30,
        paymentTerms: "30/70",
      };

      const result = validateOffer(offer, { maxPrice: 50 });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("above maximum");
    });

    it("should reject offer exceeding max lead time", () => {
      const offer: ParsedOffer = {
        unitPrice: 25,
        leadTimeDays: 60,
        paymentTerms: "30/70",
      };

      const result = validateOffer(offer, { maxLeadTime: 45 });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("exceeds maximum");
    });

    it("should reject offer with disallowed payment terms", () => {
      const offer: ParsedOffer = {
        unitPrice: 25,
        leadTimeDays: 30,
        paymentTerms: "50/50",
      };

      const result = validateOffer(offer, {
        allowedPaymentTerms: ["30/70", "33/33/33"],
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("not in allowed list");
    });

    it("should collect multiple validation errors", () => {
      const offer: ParsedOffer = {
        unitPrice: 10,
        leadTimeDays: 60,
        paymentTerms: "50/50",
      };

      const result = validateOffer(offer, {
        minPrice: 20,
        maxLeadTime: 45,
        allowedPaymentTerms: ["30/70"],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
    });
  });

  describe("hasNegotiationToolCall", () => {
    it("should return true for propose-offer", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockProposeToolCall],
      };

      expect(hasNegotiationToolCall(response)).toBe(true);
    });

    it("should return true for counter-offer", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockCounterToolCall],
      };

      expect(hasNegotiationToolCall(response)).toBe(true);
    });

    it("should return true for accept-offer", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockAcceptToolCall],
      };

      expect(hasNegotiationToolCall(response)).toBe(true);
    });

    it("should return false for no tool calls", () => {
      const response: ResponseWithToolCalls = {};

      expect(hasNegotiationToolCall(response)).toBe(false);
    });

    it("should return false for other tool calls", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [
          {
            toolName: "some-other-tool",
            toolCallId: "call-xyz",
            args: {},
          },
        ],
      };

      expect(hasNegotiationToolCall(response)).toBe(false);
    });
  });

  describe("getPrimaryNegotiationAction", () => {
    it("should return 'accept' for accept-offer", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockAcceptToolCall],
      };

      expect(getPrimaryNegotiationAction(response)).toBe("accept");
    });

    it("should return 'reject' for reject-offer", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockRejectToolCall],
      };

      expect(getPrimaryNegotiationAction(response)).toBe("reject");
    });

    it("should return 'counter' for counter-offer", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockCounterToolCall],
      };

      expect(getPrimaryNegotiationAction(response)).toBe("counter");
    });

    it("should return 'propose' for propose-offer", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockProposeToolCall],
      };

      expect(getPrimaryNegotiationAction(response)).toBe("propose");
    });

    it("should return null for no negotiation tool calls", () => {
      const response: ResponseWithToolCalls = {};

      expect(getPrimaryNegotiationAction(response)).toBeNull();
    });

    it("should prioritize accept over other actions", () => {
      const response: ResponseWithToolCalls = {
        toolCalls: [mockProposeToolCall, mockAcceptToolCall],
      };

      expect(getPrimaryNegotiationAction(response)).toBe("accept");
    });
  });
});

