/**
 * Parallel Negotiation Execution Tests
 *
 * Tests for concurrent supplier negotiations and callback integration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runSupplierNegotiation,
  type SupplierNegotiationContext,
} from "../../mastra/workflows/negotiation-workflow";
import {
  createNoOpCallbacks,
  type NegotiationCallbacks,
} from "../../mastra/storage/message-persister";

// Mock the agent generation functions to avoid actual LLM calls
// Agents return proper tool calls with offers so impasse detection sees progress
vi.mock("../../mastra/agents/brand-agent", () => ({
  createBrandAgentWithContext: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue({
      text: "We are interested in sourcing your products. Here is our offer.",
      toolCalls: [
        {
          toolName: "propose-offer",
          toolCallId: "brand-call-123",
          args: {
            supplierId: 1,
            offer: { unitPrice: 24, leadTimeDays: 30, paymentTerms: "30/70" },
            message: "Initial offer",
          },
          result: {
            success: true,
            offerId: "brand-offer-123",
            offer: { unitPrice: 24, leadTimeDays: 30, paymentTerms: "30/70" },
          },
        },
      ],
    }),
  })),
  buildBrandAgentInstructions: vi.fn(() => "Mock instructions"),
  SUPPLIER_CHARACTERISTICS: {
    1: { name: "Supplier 1", qualityRating: 4.0, pricingStrategy: "Cheapest" },
    2: { name: "Supplier 2", qualityRating: 4.7, pricingStrategy: "Premium" },
    3: { name: "Supplier 3", qualityRating: 4.0, pricingStrategy: "Expensive" },
  },
}));

vi.mock("../../mastra/agents/supplier-agent", () => ({
  createSupplierAgent: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue({
      text: "Thank you for your inquiry. We accept your terms.",
      toolCalls: [
        {
          toolName: "accept-offer",
          toolCallId: "supplier-accept-123",
          args: {
            offerId: "brand-offer-123",
            acceptedTerms: { unitPrice: 24, leadTimeDays: 30, paymentTerms: "30/70" },
            confirmationMessage: "Deal accepted!",
          },
          result: {
            success: true,
            offerId: "brand-offer-123",
            acceptedTerms: { unitPrice: 24, leadTimeDays: 30, paymentTerms: "30/70" },
            status: "accepted",
            message: "Deal accepted!",
          },
        },
      ],
    }),
  })),
  SUPPLIER_CHARACTERISTICS: {
    1: {
      name: "Supplier 1",
      qualityRating: 4.0,
      pricingStrategy: "Cheapest",
      basePriceMultiplier: 1.0,
      leadTimeDays: 45,
      paymentTerms: "33/33/33",
      negotiationFlexibility: { priceFlexibility: 0.1, leadTimeFlexibility: 0.15, paymentFlexibility: true },
      strengths: ["Lowest prices"],
      limitations: ["Slower delivery"],
    },
    2: {
      name: "Supplier 2",
      qualityRating: 4.7,
      pricingStrategy: "Premium",
      basePriceMultiplier: 1.35,
      leadTimeDays: 25,
      paymentTerms: "30/70",
      negotiationFlexibility: { priceFlexibility: 0.08, leadTimeFlexibility: 0.2, paymentFlexibility: false },
      strengths: ["Highest quality"],
      limitations: ["Higher prices"],
    },
    3: {
      name: "Supplier 3",
      qualityRating: 4.0,
      pricingStrategy: "Expensive",
      basePriceMultiplier: 1.25,
      leadTimeDays: 15,
      paymentTerms: "30/70",
      negotiationFlexibility: { priceFlexibility: 0.12, leadTimeFlexibility: 0.1, paymentFlexibility: true },
      strengths: ["Fastest delivery"],
      limitations: ["Higher prices for speed"],
    },
  },
}));

describe("Parallel Negotiation Execution", () => {
  const mockContext: SupplierNegotiationContext = {
    supplierId: 1,
    requestedProducts: [
      { productId: "FSH013", quantity: 5000 },
      { productId: "FSH014", quantity: 3000 },
    ],
    priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
    totalQuantity: 8000,
    productSummary: "Pulse Pro High-Top (5,000 units), Drift Aero High-Top (3,000 units)",
    userConstraints: "",
    volumeDiscount: { percent: 0, description: "Standard pricing" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runSupplierNegotiation", () => {
    it("should complete a negotiation and return results", async () => {
      const callbacks = createNoOpCallbacks();

      const result = await runSupplierNegotiation(mockContext, callbacks);

      expect(result).toBeDefined();
      expect(result.supplierId).toBe(1);
      expect(result.status).toBe("completed");
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.finalOffer).toBeDefined();
      // Round count depends on when agreement is reached
      // With mocked accept-offer response, negotiation completes after 1 round
      expect(result.roundCount).toBeGreaterThanOrEqual(1);
    });

    it("should generate at least 2 messages per round (brand + supplier)", async () => {
      const callbacks = createNoOpCallbacks();

      const result = await runSupplierNegotiation(mockContext, callbacks);

      // At least 2 messages per round (brand + supplier)
      expect(result.messages.length).toBeGreaterThanOrEqual(result.roundCount * 2);
    });

    it("should have alternating brand and supplier messages", async () => {
      const callbacks = createNoOpCallbacks();

      const result = await runSupplierNegotiation(mockContext, callbacks);

      for (let i = 0; i < result.messages.length; i++) {
        const expectedSender = i % 2 === 0 ? "brand" : "supplier";
        expect(result.messages[i].sender).toBe(expectedSender);
      }
    });

    it("should calculate final offer with correct structure", async () => {
      const callbacks = createNoOpCallbacks();

      const result = await runSupplierNegotiation(mockContext, callbacks);

      expect(result.finalOffer).toMatchObject({
        products: expect.any(Array),
        subtotal: expect.any(Number),
        volumeDiscount: expect.any(Number),
        volumeDiscountPercent: expect.any(Number),
        unitPrice: expect.any(Number),
        leadTimeDays: expect.any(Number),
        paymentTerms: expect.any(String),
      });
    });
  });

  describe("Callback Integration", () => {
    it("should call onMessage callback for each message when negotiationId is provided", async () => {
      const onMessageMock = vi.fn();
      const callbacks: NegotiationCallbacks = {
        onMessage: onMessageMock,
        onStatusChange: vi.fn(),
        onOfferReceived: vi.fn(),
      };

      const contextWithId = {
        ...mockContext,
        negotiationId: "test-negotiation-123",
      };

      await runSupplierNegotiation(contextWithId, callbacks);

      // Should be called for each message in each round
      // With mocked immediate acceptance, at least 1 message (brand) is persisted before acceptance
      expect(onMessageMock).toHaveBeenCalled();
      expect(onMessageMock.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it("should call onStatusChange callback when negotiation completes", async () => {
      const onStatusChangeMock = vi.fn();
      const callbacks: NegotiationCallbacks = {
        onMessage: vi.fn(),
        onStatusChange: onStatusChangeMock,
        onOfferReceived: vi.fn(),
      };

      const contextWithId = {
        ...mockContext,
        negotiationId: "test-negotiation-123",
      };

      await runSupplierNegotiation(contextWithId, callbacks);

      expect(onStatusChangeMock).toHaveBeenCalledWith(
        "test-negotiation-123",
        "completed",
        expect.any(Number), // roundCount
        expect.any(Object) // finalOffer
      );
    });

    it("should call onOfferReceived callback for each round", async () => {
      const onOfferReceivedMock = vi.fn();
      const callbacks: NegotiationCallbacks = {
        onMessage: vi.fn(),
        onStatusChange: vi.fn(),
        onOfferReceived: onOfferReceivedMock,
      };

      const contextWithId = {
        ...mockContext,
        negotiationId: "test-negotiation-123",
      };

      const result = await runSupplierNegotiation(contextWithId, callbacks);

      // Should be called once per round
      expect(onOfferReceivedMock).toHaveBeenCalledTimes(result.roundCount);
    });

    it("should not call callbacks when negotiationId is not provided", async () => {
      const onMessageMock = vi.fn();
      const onStatusChangeMock = vi.fn();
      const callbacks: NegotiationCallbacks = {
        onMessage: onMessageMock,
        onStatusChange: onStatusChangeMock,
      };

      // Context without negotiationId
      await runSupplierNegotiation(mockContext, callbacks);

      expect(onMessageMock).not.toHaveBeenCalled();
      expect(onStatusChangeMock).not.toHaveBeenCalled();
    });
  });

  describe("Parallel Execution", () => {
    it("should run all three supplier negotiations concurrently", async () => {
      const contexts: SupplierNegotiationContext[] = [
        { ...mockContext, supplierId: 1 as const },
        { ...mockContext, supplierId: 2 as const },
        { ...mockContext, supplierId: 3 as const },
      ];

      const callbacks = createNoOpCallbacks();
      const startTime = Date.now();

      const results = await Promise.all(
        contexts.map((ctx) => runSupplierNegotiation(ctx, callbacks))
      );

      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results[0].supplierId).toBe(1);
      expect(results[1].supplierId).toBe(2);
      expect(results[2].supplierId).toBe(3);

      // All should complete successfully
      results.forEach((result) => {
        expect(result.status).toBe("completed");
        expect(result.finalOffer).toBeDefined();
      });
    });

    it("should isolate negotiations - each has its own message history", async () => {
      const contexts: SupplierNegotiationContext[] = [
        { ...mockContext, supplierId: 1 as const },
        { ...mockContext, supplierId: 2 as const },
      ];

      const callbacks = createNoOpCallbacks();

      const results = await Promise.all(
        contexts.map((ctx) => runSupplierNegotiation(ctx, callbacks))
      );

      // Each negotiation should have its own message history
      expect(results[0].messages).not.toBe(results[1].messages);
      expect(results[0].messages.length).toBeGreaterThan(0);
      expect(results[1].messages.length).toBeGreaterThan(0);
    });

    it("should handle individual negotiation failures gracefully", async () => {
      const contexts: SupplierNegotiationContext[] = [
        { ...mockContext, supplierId: 1 as const },
        { ...mockContext, supplierId: 2 as const },
        { ...mockContext, supplierId: 3 as const },
      ];

      const callbacks = createNoOpCallbacks();

      // Use Promise.allSettled to handle potential failures
      const results = await Promise.allSettled(
        contexts.map((ctx) => runSupplierNegotiation(ctx, callbacks))
      );

      // Should have results for all three
      expect(results).toHaveLength(3);

      // In normal operation, all should be fulfilled
      results.forEach((result) => {
        expect(result.status).toBe("fulfilled");
      });
    });
  });
});

