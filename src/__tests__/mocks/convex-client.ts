/**
 * Mocked Convex Client
 *
 * Mock implementations for Convex database operations in tests.
 */

import { vi } from "vitest";

/**
 * Mock negotiation data
 */
export interface MockNegotiation {
  _id: string;
  quoteId: string;
  supplierId: 1 | 2 | 3;
  status: "active" | "completed" | "impasse";
  roundCount: number;
  finalOffer?: {
    unitPrice: number;
    leadTimeDays: number;
    paymentTerms: string;
    notes?: string;
    products?: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    subtotal?: number;
    volumeDiscount?: number;
    volumeDiscountPercent?: number;
  };
  createdAt: number;
  completedAt?: number;
}

/**
 * Mock message data
 */
export interface MockMessage {
  _id: string;
  negotiationId: string;
  sender: "brand" | "supplier" | "user";
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    toolCalls?: string[];
  };
}

/**
 * In-memory store for mock data
 */
class MockConvexStore {
  private negotiations: Map<string, MockNegotiation> = new Map();
  private messages: Map<string, MockMessage[]> = new Map();
  private messageIdCounter = 0;

  reset() {
    this.negotiations.clear();
    this.messages.clear();
    this.messageIdCounter = 0;
  }

  // Negotiation operations
  createNegotiation(
    quoteId: string,
    supplierId: 1 | 2 | 3
  ): MockNegotiation {
    const id = `negotiation-${Date.now()}-${supplierId}`;
    const negotiation: MockNegotiation = {
      _id: id,
      quoteId,
      supplierId,
      status: "active",
      roundCount: 0,
      createdAt: Date.now(),
    };
    this.negotiations.set(id, negotiation);
    this.messages.set(id, []);
    return negotiation;
  }

  getNegotiation(id: string): MockNegotiation | undefined {
    return this.negotiations.get(id);
  }

  updateNegotiation(
    id: string,
    updates: Partial<MockNegotiation>
  ): MockNegotiation | undefined {
    const negotiation = this.negotiations.get(id);
    if (!negotiation) return undefined;

    const updated = { ...negotiation, ...updates };
    this.negotiations.set(id, updated);
    return updated;
  }

  getNegotiationsByQuote(quoteId: string): MockNegotiation[] {
    return Array.from(this.negotiations.values()).filter(
      (n) => n.quoteId === quoteId
    );
  }

  // Message operations
  createMessage(
    negotiationId: string,
    sender: "brand" | "supplier" | "user",
    content: string,
    metadata?: MockMessage["metadata"]
  ): MockMessage {
    const id = `message-${++this.messageIdCounter}`;
    const message: MockMessage = {
      _id: id,
      negotiationId,
      sender,
      content,
      timestamp: Date.now(),
      metadata,
    };

    const messages = this.messages.get(negotiationId) ?? [];
    messages.push(message);
    this.messages.set(negotiationId, messages);

    return message;
  }

  getMessages(negotiationId: string): MockMessage[] {
    return this.messages.get(negotiationId) ?? [];
  }

  getMessagesSince(
    negotiationId: string,
    sinceTimestamp: number
  ): MockMessage[] {
    const messages = this.messages.get(negotiationId) ?? [];
    return messages.filter((m) => m.timestamp > sinceTimestamp);
  }

  getUserMessages(negotiationId: string): MockMessage[] {
    const messages = this.messages.get(negotiationId) ?? [];
    return messages.filter((m) => m.sender === "user");
  }
}

// Global mock store instance
export const mockConvexStore = new MockConvexStore();

/**
 * Create mock Convex mutation functions
 */
export function createMockConvexMutations() {
  return {
    "negotiations.addMessage": vi.fn().mockImplementation(
      async (args: {
        negotiationId: string;
        sender: "brand" | "supplier" | "user";
        content: string;
        metadata?: MockMessage["metadata"];
      }) => {
        return mockConvexStore.createMessage(
          args.negotiationId,
          args.sender,
          args.content,
          args.metadata
        )._id;
      }
    ),

    "negotiations.updateNegotiationStatus": vi.fn().mockImplementation(
      async (args: {
        negotiationId: string;
        status: "active" | "completed" | "impasse";
        roundCount?: number;
        finalOffer?: MockNegotiation["finalOffer"];
      }) => {
        const updates: Partial<MockNegotiation> = { status: args.status };
        if (args.roundCount !== undefined) updates.roundCount = args.roundCount;
        if (args.finalOffer) updates.finalOffer = args.finalOffer;
        if (args.status !== "active") updates.completedAt = Date.now();

        mockConvexStore.updateNegotiation(args.negotiationId, updates);
        return { success: true };
      }
    ),

    "negotiations.incrementRound": vi.fn().mockImplementation(
      async (args: { negotiationId: string }) => {
        const negotiation = mockConvexStore.getNegotiation(args.negotiationId);
        if (!negotiation) throw new Error("Negotiation not found");

        const newRoundCount = negotiation.roundCount + 1;
        mockConvexStore.updateNegotiation(args.negotiationId, {
          roundCount: newRoundCount,
        });
        return { roundCount: newRoundCount };
      }
    ),

    "quotes.createNegotiations": vi.fn().mockImplementation(
      async (args: { quoteId: string }) => {
        const negotiations = [1, 2, 3].map((supplierId) =>
          mockConvexStore.createNegotiation(args.quoteId, supplierId as 1 | 2 | 3)
        );
        return {
          quoteId: args.quoteId,
          negotiationIds: negotiations.map((n) => n._id),
        };
      }
    ),
  };
}

/**
 * Create mock Convex query functions
 */
export function createMockConvexQueries() {
  return {
    "negotiations.getNegotiation": vi.fn().mockImplementation(
      async (args: { negotiationId: string }) => {
        return mockConvexStore.getNegotiation(args.negotiationId) ?? null;
      }
    ),

    "negotiations.getNegotiationMessages": vi.fn().mockImplementation(
      async (args: { negotiationId: string }) => {
        return mockConvexStore.getMessages(args.negotiationId);
      }
    ),

    "negotiations.getQuoteNegotiationsWithMessages": vi.fn().mockImplementation(
      async (args: { quoteId: string }) => {
        const negotiations = mockConvexStore.getNegotiationsByQuote(args.quoteId);
        return negotiations.map((n) => ({
          ...n,
          messages: mockConvexStore.getMessages(n._id),
        }));
      }
    ),

    "messages.getByNegotiation": vi.fn().mockImplementation(
      async (args: { negotiationId: string }) => {
        return mockConvexStore.getMessages(args.negotiationId);
      }
    ),
  };
}

/**
 * Reset mock store between tests
 */
export function resetMockConvexStore() {
  mockConvexStore.reset();
}

