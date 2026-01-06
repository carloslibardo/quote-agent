/**
 * Negotiation Tools
 *
 * Mastra tools for structured negotiation actions:
 * - proposeTool: Submit initial offer
 * - counterOfferTool: Counter with modified terms
 * - acceptOfferTool: Accept current offer
 * - rejectOfferTool: Reject offer with reason
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Offer schema used across negotiation tools
 */
export const offerSchema = z.object({
  unitPrice: z.number().positive().describe("Price per unit in USD"),
  leadTimeDays: z
    .number()
    .int()
    .positive()
    .describe("Delivery lead time in days"),
  paymentTerms: z
    .string()
    .describe("Payment structure (e.g., '30/70', '33/33/33', '50/50')"),
  notes: z.string().optional().describe("Additional notes or conditions"),
});

export type Offer = z.infer<typeof offerSchema>;

/**
 * Propose Tool
 * Used by agents to submit an initial offer in negotiations
 */
export const proposeTool = createTool({
  id: "propose-offer",
  description:
    "Submit an initial offer proposal with price, lead time, and payment terms",
  inputSchema: z.object({
    supplierId: z.number().min(1).max(3).describe("Supplier ID (1, 2, or 3)"),
    offer: offerSchema.describe("The offer details being proposed"),
    message: z
      .string()
      .describe("Natural language message accompanying the offer"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    offerId: z.string(),
    offer: offerSchema,
    message: z.string(),
  }),
  execute: async (input) => {
    // Generate a unique offer ID
    const offerId = `offer-${input.supplierId}-${Date.now()}`;

    return {
      success: true,
      offerId,
      offer: input.offer,
      message: input.message,
    };
  },
});

/**
 * Counter Offer Tool
 * Used to counter a previous offer with modified terms
 */
export const counterOfferTool = createTool({
  id: "counter-offer",
  description:
    "Counter a previous offer with modified terms. Explain what changed and why.",
  inputSchema: z.object({
    previousOfferId: z.string().describe("ID of the offer being countered"),
    counterOffer: offerSchema.describe("The new counter offer terms"),
    changesExplanation: z
      .string()
      .describe("Explanation of what changed and the reasoning"),
    message: z
      .string()
      .describe("Natural language message for the counter offer"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    offerId: z.string(),
    previousOfferId: z.string(),
    counterOffer: offerSchema,
    changesExplanation: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    const offerId = `counter-${Date.now()}`;

    return {
      success: true,
      offerId,
      previousOfferId: input.previousOfferId,
      counterOffer: input.counterOffer,
      changesExplanation: input.changesExplanation,
      message: input.message,
    };
  },
});

/**
 * Accept Offer Tool
 * Used to accept the current offer and finalize the negotiation
 */
export const acceptOfferTool = createTool({
  id: "accept-offer",
  description:
    "Accept the current offer terms and finalize the negotiation agreement",
  inputSchema: z.object({
    offerId: z.string().describe("ID of the offer being accepted"),
    acceptedTerms: offerSchema.describe("The final accepted terms"),
    confirmationMessage: z
      .string()
      .describe("Confirmation message for the agreement"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    offerId: z.string(),
    acceptedTerms: offerSchema,
    status: z.literal("accepted"),
    message: z.string(),
  }),
  execute: async (input) => {
    return {
      success: true,
      offerId: input.offerId,
      acceptedTerms: input.acceptedTerms,
      status: "accepted" as const,
      message: input.confirmationMessage,
    };
  },
});

/**
 * Rejection category for detailed tracking
 */
export const rejectionCategorySchema = z.enum([
  "price_too_high",
  "lead_time_too_long",
  "payment_terms_unacceptable",
  "quality_concerns",
  "other",
]);

export type RejectionCategory = z.infer<typeof rejectionCategorySchema>;

/**
 * Reject Offer Tool
 * Used to reject an offer with a reason and optional category
 */
export const rejectOfferTool = createTool({
  id: "reject-offer",
  description:
    "Reject the current offer with a clear reason. Use when terms are unacceptable.",
  inputSchema: z.object({
    offerId: z.string().describe("ID of the offer being rejected"),
    reason: z.string().describe("Reason for rejecting the offer"),
    isNegotiationEnded: z
      .boolean()
      .describe("Whether this rejection ends the negotiation entirely"),
    rejectionCategory: rejectionCategorySchema
      .optional()
      .describe("Category of rejection for tracking purposes"),
    message: z.string().describe("Message explaining the rejection"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    offerId: z.string(),
    reason: z.string(),
    rejectionCategory: rejectionCategorySchema.optional(),
    status: z.union([z.literal("rejected"), z.literal("impasse")]),
    message: z.string(),
  }),
  execute: async (input) => {
    return {
      success: true,
      offerId: input.offerId,
      reason: input.reason,
      rejectionCategory: input.rejectionCategory,
      status: input.isNegotiationEnded
        ? ("impasse" as const)
        : ("rejected" as const),
      message: input.message,
    };
  },
});

/**
 * Export all negotiation tools as a collection
 */
export const negotiationTools = {
  proposeTool,
  counterOfferTool,
  acceptOfferTool,
  rejectOfferTool,
};

