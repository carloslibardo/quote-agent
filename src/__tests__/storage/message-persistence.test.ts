/**
 * Message Persistence Tests
 *
 * Tests for the callback creation and no-op callbacks.
 * MessagePersister class tests are skipped as they require actual Convex client.
 */

import { describe, it, expect, vi } from "vitest";
import {
  createNoOpCallbacks,
  type NegotiationCallbacks,
  type MessageMetadata,
  type FinalOffer,
  type NegotiationStatus,
} from "../../mastra/storage/message-persister";

describe("createNoOpCallbacks", () => {
  it("should create callbacks that do nothing", () => {
    const callbacks = createNoOpCallbacks();

    expect(callbacks).toBeDefined();
    expect(typeof callbacks.onMessage).toBe("function");
    expect(typeof callbacks.onStatusChange).toBe("function");
    expect(typeof callbacks.onOfferReceived).toBe("function");
  });

  it("should have onMessage that resolves without error", async () => {
    const callbacks = createNoOpCallbacks();

    await expect(
      callbacks.onMessage("any-id", {
        sender: "brand",
        content: "Test",
        timestamp: Date.now(),
      })
    ).resolves.not.toThrow();
  });

  it("should have onStatusChange that resolves without error", async () => {
    const callbacks = createNoOpCallbacks();

    await expect(
      callbacks.onStatusChange("any-id", "completed", 3)
    ).resolves.not.toThrow();
  });

  it("should have onOfferReceived that resolves without error", async () => {
    const callbacks = createNoOpCallbacks();

    await expect(
      callbacks.onOfferReceived?.("any-id", {
        supplierId: 1,
        avgPrice: 25.0,
        leadTime: 45,
        paymentTerms: "33/33/33",
      })
    ).resolves.not.toThrow();
  });
});

describe("NegotiationCallbacks Interface", () => {
  it("should allow custom callback implementations", async () => {
    const messageLog: string[] = [];
    const statusLog: NegotiationStatus[] = [];

    const customCallbacks: NegotiationCallbacks = {
      onMessage: async (_nId, message) => {
        messageLog.push(`${message.sender}: ${message.content}`);
      },
      onStatusChange: async (_nId, status) => {
        statusLog.push(status);
      },
      onOfferReceived: async () => {
        // Custom offer handling
      },
    };

    await customCallbacks.onMessage("test", {
      sender: "brand",
      content: "Hello",
      timestamp: Date.now(),
    });

    await customCallbacks.onStatusChange("test", "completed", 3);

    expect(messageLog).toContain("brand: Hello");
    expect(statusLog).toContain("completed");
  });

  it("should track multiple messages in order", async () => {
    const messages: Array<{ sender: string; content: string }> = [];

    const trackingCallbacks: NegotiationCallbacks = {
      onMessage: async (_nId, message) => {
        messages.push({ sender: message.sender, content: message.content });
      },
      onStatusChange: async () => {},
    };

    await trackingCallbacks.onMessage("test", {
      sender: "brand",
      content: "First message",
      timestamp: 1000,
    });

    await trackingCallbacks.onMessage("test", {
      sender: "supplier",
      content: "Second message",
      timestamp: 2000,
    });

    await trackingCallbacks.onMessage("test", {
      sender: "brand",
      content: "Third message",
      timestamp: 3000,
    });

    expect(messages).toHaveLength(3);
    expect(messages[0].sender).toBe("brand");
    expect(messages[1].sender).toBe("supplier");
    expect(messages[2].sender).toBe("brand");
  });

  it("should track status changes", async () => {
    const statusChanges: Array<{
      negotiationId: string;
      status: NegotiationStatus;
      roundCount?: number;
    }> = [];

    const statusCallbacks: NegotiationCallbacks = {
      onMessage: async () => {},
      onStatusChange: async (nId, status, roundCount) => {
        statusChanges.push({
          negotiationId: nId,
          status,
          roundCount,
        });
      },
    };

    await statusCallbacks.onStatusChange("neg-1", "active");
    await statusCallbacks.onStatusChange("neg-1", "completed", 3);
    await statusCallbacks.onStatusChange("neg-2", "impasse", 5);

    expect(statusChanges).toHaveLength(3);
    expect(statusChanges[0].status).toBe("active");
    expect(statusChanges[1].status).toBe("completed");
    expect(statusChanges[1].roundCount).toBe(3);
    expect(statusChanges[2].status).toBe("impasse");
  });

  it("should track offer updates", async () => {
    const offers: Array<{
      negotiationId: string;
      supplierId: number;
      avgPrice: number;
    }> = [];

    const offerCallbacks: NegotiationCallbacks = {
      onMessage: async () => {},
      onStatusChange: async () => {},
      onOfferReceived: async (nId, offer) => {
        offers.push({
          negotiationId: nId,
          supplierId: offer.supplierId,
          avgPrice: offer.avgPrice,
        });
      },
    };

    await offerCallbacks.onOfferReceived?.("neg-1", {
      supplierId: 1,
      avgPrice: 25.0,
      leadTime: 45,
      paymentTerms: "33/33/33",
    });

    await offerCallbacks.onOfferReceived?.("neg-1", {
      supplierId: 1,
      avgPrice: 23.5,
      leadTime: 42,
      paymentTerms: "33/33/33",
    });

    expect(offers).toHaveLength(2);
    expect(offers[0].avgPrice).toBe(25.0);
    expect(offers[1].avgPrice).toBe(23.5);
  });

  it("should handle message metadata", async () => {
    const messagesWithMeta: Array<{
      content: string;
      metadata?: MessageMetadata;
    }> = [];

    const metaCallbacks: NegotiationCallbacks = {
      onMessage: async (_nId, message) => {
        messagesWithMeta.push({
          content: message.content,
          metadata: message.metadata,
        });
      },
      onStatusChange: async () => {},
    };

    await metaCallbacks.onMessage("test", {
      sender: "brand",
      content: "Using propose tool",
      timestamp: Date.now(),
      metadata: {
        model: "gpt-4o",
        toolCalls: ["propose-offer"],
      },
    });

    await metaCallbacks.onMessage("test", {
      sender: "supplier",
      content: "Counter offer",
      timestamp: Date.now(),
      metadata: {
        toolCalls: ["counter-offer"],
      },
    });

    expect(messagesWithMeta).toHaveLength(2);
    expect(messagesWithMeta[0].metadata?.model).toBe("gpt-4o");
    expect(messagesWithMeta[0].metadata?.toolCalls).toContain("propose-offer");
    expect(messagesWithMeta[1].metadata?.toolCalls).toContain("counter-offer");
  });

  it("should handle final offer in status change", async () => {
    const completions: Array<{
      negotiationId: string;
      finalOffer?: FinalOffer;
    }> = [];

    const completionCallbacks: NegotiationCallbacks = {
      onMessage: async () => {},
      onStatusChange: async (nId, _status, _roundCount, finalOffer) => {
        completions.push({
          negotiationId: nId,
          finalOffer,
        });
      },
    };

    const finalOffer: FinalOffer = {
      products: [
        {
          productId: "FSH013",
          productName: "Pulse Pro High-Top",
          quantity: 5000,
          unitPrice: 25.0,
          lineTotal: 125000,
        },
      ],
      subtotal: 125000,
      volumeDiscount: 6250,
      volumeDiscountPercent: 5,
      unitPrice: 23.75,
      leadTimeDays: 45,
      paymentTerms: "33/33/33",
    };

    await completionCallbacks.onStatusChange("neg-1", "completed", 3, finalOffer);

    expect(completions).toHaveLength(1);
    expect(completions[0].finalOffer?.unitPrice).toBe(23.75);
    expect(completions[0].finalOffer?.products).toHaveLength(1);
  });
});

describe("Callback Error Handling", () => {
  it("should allow callbacks to throw errors", async () => {
    const errorCallbacks: NegotiationCallbacks = {
      onMessage: async () => {
        throw new Error("Message error");
      },
      onStatusChange: async () => {},
    };

    await expect(
      errorCallbacks.onMessage("test", {
        sender: "brand",
        content: "Test",
        timestamp: Date.now(),
      })
    ).rejects.toThrow("Message error");
  });

  it("should allow status change callbacks to throw errors", async () => {
    const errorCallbacks: NegotiationCallbacks = {
      onMessage: async () => {},
      onStatusChange: async () => {
        throw new Error("Status error");
      },
    };

    await expect(
      errorCallbacks.onStatusChange("test", "completed", 3)
    ).rejects.toThrow("Status error");
  });
});

describe("Types", () => {
  it("should export MessageMetadata type", () => {
    const metadata: MessageMetadata = {
      model: "gpt-4o",
      tokenUsage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
      toolCalls: ["propose-offer"],
    };

    expect(metadata.model).toBe("gpt-4o");
    expect(metadata.tokenUsage?.totalTokens).toBe(150);
    expect(metadata.toolCalls).toContain("propose-offer");
  });

  it("should export FinalOffer type", () => {
    const offer: FinalOffer = {
      products: [],
      subtotal: 0,
      volumeDiscount: 0,
      volumeDiscountPercent: 0,
      unitPrice: 0,
      leadTimeDays: 0,
      paymentTerms: "",
    };

    expect(offer).toBeDefined();
  });

  it("should export NegotiationStatus type", () => {
    const status1: NegotiationStatus = "active";
    const status2: NegotiationStatus = "completed";
    const status3: NegotiationStatus = "impasse";

    expect([status1, status2, status3]).toEqual([
      "active",
      "completed",
      "impasse",
    ]);
  });
});
