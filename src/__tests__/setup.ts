/**
 * Vitest Setup File
 *
 * Global test configuration and mocks for the negotiation agent tests.
 */

import { vi, beforeEach, afterEach } from "vitest";

// Mock environment variables for tests
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.VITE_OPENAI_API_KEY = "test-vite-openai-key";

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Global test utilities
export const createMockAgentResponse = (content: string, toolCalls?: unknown[]) => ({
  text: content,
  toolCalls: toolCalls ?? [],
  messages: [
    {
      role: "assistant" as const,
      content,
    },
  ],
});

export const createMockOffer = (overrides?: Partial<{
  unitPrice: number;
  leadTimeDays: number;
  paymentTerms: string;
  notes?: string;
}>) => ({
  unitPrice: 25.00,
  leadTimeDays: 30,
  paymentTerms: "30/70",
  notes: undefined,
  ...overrides,
});

export const createMockMessage = (
  sender: "brand" | "supplier" | "user",
  content: string,
  timestamp?: number
) => ({
  sender,
  content,
  timestamp: timestamp ?? Date.now(),
});

export const createMockNegotiationContext = (overrides?: Partial<{
  quoteId: string;
  userId: string;
  priorities: {
    quality: number;
    cost: number;
    leadTime: number;
    paymentTerms: number;
  };
  products: Array<{ productId: string; quantity: number }>;
  userNotes?: string;
}>) => ({
  quoteId: "test-quote-123",
  userId: "test-user-456",
  priorities: {
    quality: 25,
    cost: 35,
    leadTime: 25,
    paymentTerms: 15,
  },
  products: [
    { productId: "FSH013", quantity: 5000 },
    { productId: "FSH014", quantity: 3000 },
  ],
  userNotes: undefined,
  ...overrides,
});

