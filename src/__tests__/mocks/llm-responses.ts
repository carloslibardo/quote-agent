/**
 * Mocked LLM Responses
 *
 * Deterministic agent responses for unit testing.
 * These mock the AI SDK's generateText and agent.generate outputs.
 */

import { vi } from "vitest";

/**
 * Mock tool call structure matching Mastra's tool output format
 */
export interface MockToolCall {
  toolName: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
}

/**
 * Mock agent response structure
 */
export interface MockAgentResponse {
  text: string;
  toolCalls: MockToolCall[];
  messages: Array<{
    role: "assistant" | "user" | "system";
    content: string;
  }>;
}

/**
 * Create a mock propose-offer tool call
 */
export function createMockProposeToolCall(
  supplierId: number,
  offer: {
    unitPrice: number;
    leadTimeDays: number;
    paymentTerms: string;
    notes?: string;
  },
  message: string
): MockToolCall {
  return {
    toolName: "propose-offer",
    args: {
      supplierId,
      offer,
      message,
    },
    result: {
      success: true,
      offerId: `offer-${supplierId}-${Date.now()}`,
      offer,
      message,
    },
  };
}

/**
 * Create a mock counter-offer tool call
 */
export function createMockCounterOfferToolCall(
  previousOfferId: string,
  counterOffer: {
    unitPrice: number;
    leadTimeDays: number;
    paymentTerms: string;
    notes?: string;
  },
  changesExplanation: string,
  message: string
): MockToolCall {
  return {
    toolName: "counter-offer",
    args: {
      previousOfferId,
      counterOffer,
      changesExplanation,
      message,
    },
    result: {
      success: true,
      offerId: `counter-${Date.now()}`,
      previousOfferId,
      counterOffer,
      changesExplanation,
      message,
    },
  };
}

/**
 * Create a mock accept-offer tool call
 */
export function createMockAcceptToolCall(
  offerId: string,
  acceptedTerms: {
    unitPrice: number;
    leadTimeDays: number;
    paymentTerms: string;
    notes?: string;
  },
  confirmationMessage: string
): MockToolCall {
  return {
    toolName: "accept-offer",
    args: {
      offerId,
      acceptedTerms,
      confirmationMessage,
    },
    result: {
      success: true,
      offerId,
      acceptedTerms,
      status: "accepted",
      message: confirmationMessage,
    },
  };
}

/**
 * Create a mock reject-offer tool call
 */
export function createMockRejectToolCall(
  offerId: string,
  reason: string,
  isNegotiationEnded: boolean,
  message: string
): MockToolCall {
  return {
    toolName: "reject-offer",
    args: {
      offerId,
      reason,
      isNegotiationEnded,
      message,
    },
    result: {
      success: true,
      offerId,
      reason,
      status: isNegotiationEnded ? "impasse" : "rejected",
      message,
    },
  };
}

/**
 * Brand agent mock responses for different scenarios
 */
export const brandAgentMockResponses = {
  openingMessage: (supplierName: string, productSummary: string): MockAgentResponse => ({
    text: `Good day! I'm reaching out on behalf of our brand to discuss a potential order for ${productSummary}. We're looking for competitive pricing and reliable delivery. Could you please provide your best offer?`,
    toolCalls: [],
    messages: [
      {
        role: "assistant",
        content: `Good day! I'm reaching out on behalf of our brand to discuss a potential order for ${productSummary}. We're looking for competitive pricing and reliable delivery. Could you please provide your best offer?`,
      },
    ],
  }),

  counterOffer: (
    previousOfferId: string,
    newPrice: number,
    leadTime: number
  ): MockAgentResponse => ({
    text: `Thank you for your offer. Based on our requirements, we'd like to propose a counter-offer.`,
    toolCalls: [
      createMockCounterOfferToolCall(
        previousOfferId,
        {
          unitPrice: newPrice,
          leadTimeDays: leadTime,
          paymentTerms: "30/70",
        },
        `Reduced unit price to $${newPrice} and requested ${leadTime}-day delivery`,
        "We appreciate your proposal but need better terms to proceed."
      ),
    ],
    messages: [
      {
        role: "assistant",
        content: `Thank you for your offer. Based on our requirements, we'd like to propose a counter-offer.`,
      },
    ],
  }),

  acceptOffer: (offerId: string, finalTerms: {
    unitPrice: number;
    leadTimeDays: number;
    paymentTerms: string;
  }): MockAgentResponse => ({
    text: `We're pleased to accept your offer. The terms are agreeable to us.`,
    toolCalls: [
      createMockAcceptToolCall(
        offerId,
        finalTerms,
        "We accept these terms and look forward to working together."
      ),
    ],
    messages: [
      {
        role: "assistant",
        content: `We're pleased to accept your offer. The terms are agreeable to us.`,
      },
    ],
  }),

  rejectAndEndNegotiation: (offerId: string, reason: string): MockAgentResponse => ({
    text: `Unfortunately, we cannot proceed with the current terms.`,
    toolCalls: [
      createMockRejectToolCall(
        offerId,
        reason,
        true,
        "We've reached an impasse and will need to explore other options."
      ),
    ],
    messages: [
      {
        role: "assistant",
        content: `Unfortunately, we cannot proceed with the current terms.`,
      },
    ],
  }),
};

/**
 * Supplier agent mock responses for different scenarios
 */
export const supplierAgentMockResponses = {
  initialOffer: (
    supplierId: number,
    basePrice: number,
    leadTime: number,
    paymentTerms: string
  ): MockAgentResponse => ({
    text: `Thank you for your interest! We're pleased to offer our products.`,
    toolCalls: [
      createMockProposeToolCall(
        supplierId,
        {
          unitPrice: basePrice,
          leadTimeDays: leadTime,
          paymentTerms,
        },
        `We offer $${basePrice}/unit with ${leadTime}-day delivery and ${paymentTerms} payment terms.`
      ),
    ],
    messages: [
      {
        role: "assistant",
        content: `Thank you for your interest! We're pleased to offer our products.`,
      },
    ],
  }),

  counterOffer: (
    supplierId: number,
    previousOfferId: string,
    adjustedPrice: number,
    leadTime: number,
    paymentTerms: string
  ): MockAgentResponse => ({
    text: `We've reviewed your request and can offer improved terms.`,
    toolCalls: [
      createMockCounterOfferToolCall(
        previousOfferId,
        {
          unitPrice: adjustedPrice,
          leadTimeDays: leadTime,
          paymentTerms,
        },
        `Adjusted price to $${adjustedPrice} to meet your budget requirements`,
        "We've reduced our margin to offer you a better deal."
      ),
    ],
    messages: [
      {
        role: "assistant",
        content: `We've reviewed your request and can offer improved terms.`,
      },
    ],
  }),

  acceptOffer: (offerId: string, finalTerms: {
    unitPrice: number;
    leadTimeDays: number;
    paymentTerms: string;
  }): MockAgentResponse => ({
    text: `We accept your terms and are ready to proceed.`,
    toolCalls: [
      createMockAcceptToolCall(
        offerId,
        finalTerms,
        "We confirm the order and will begin production upon receiving the initial payment."
      ),
    ],
    messages: [
      {
        role: "assistant",
        content: `We accept your terms and are ready to proceed.`,
      },
    ],
  }),

  holdFirm: (
    supplierId: number,
    previousOfferId: string,
    price: number,
    leadTime: number,
    paymentTerms: string
  ): MockAgentResponse => ({
    text: `We appreciate your interest, but this is our best possible offer given our quality standards.`,
    toolCalls: [
      createMockCounterOfferToolCall(
        previousOfferId,
        {
          unitPrice: price,
          leadTimeDays: leadTime,
          paymentTerms,
        },
        "Maintaining current pricing due to premium quality materials",
        "Our pricing reflects our commitment to quality. We cannot reduce further without compromising our standards."
      ),
    ],
    messages: [
      {
        role: "assistant",
        content: `We appreciate your interest, but this is our best possible offer given our quality standards.`,
      },
    ],
  }),
};

/**
 * Create a mock generateText function for AI SDK
 */
export function createMockGenerateText(responses: string[]) {
  let callIndex = 0;
  return vi.fn().mockImplementation(async () => {
    const response = responses[callIndex] || responses[responses.length - 1];
    callIndex++;
    return { text: response };
  });
}

/**
 * Create a mock agent.generate function
 */
export function createMockAgentGenerate(responses: MockAgentResponse[]) {
  let callIndex = 0;
  return vi.fn().mockImplementation(async () => {
    const response = responses[callIndex] || responses[responses.length - 1];
    callIndex++;
    return response;
  });
}

