/**
 * Negotiation Mutations and Queries
 *
 * Convex functions for negotiation management:
 * - addMessage: Add a message to a negotiation
 * - updateNegotiationStatus: Update negotiation status
 * - addUserIntervention: Add user intervention message
 * - getNegotiation: Get a single negotiation
 * - getNegotiationMessages: Get messages for a negotiation
 */

import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Add a message to a negotiation
 */
export const addMessage = mutation({
  args: {
    negotiationId: v.id("negotiations"),
    sender: v.union(
      v.literal("brand"),
      v.literal("supplier"),
      v.literal("user")
    ),
    content: v.string(),
    metadata: v.optional(
      v.object({
        model: v.optional(v.string()),
        tokenUsage: v.optional(
          v.object({
            promptTokens: v.number(),
            completionTokens: v.number(),
            totalTokens: v.number(),
          })
        ),
        toolCalls: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Verify negotiation exists
    const negotiation = await ctx.db.get(args.negotiationId);
    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    // Insert message
    const messageId = await ctx.db.insert("messages", {
      negotiationId: args.negotiationId,
      sender: args.sender,
      content: args.content,
      timestamp: Date.now(),
      metadata: args.metadata,
    });

    return messageId;
  },
});

/**
 * Product offer item validator
 */
const productOfferValidator = v.object({
  productId: v.string(),
  productName: v.string(),
  quantity: v.number(),
  unitPrice: v.number(),
  lineTotal: v.number(),
  materialSubstitution: v.optional(
    v.object({
      original: v.string(),
      suggested: v.string(),
      savings: v.number(),
    })
  ),
});

/**
 * Update negotiation status
 */
export const updateNegotiationStatus = mutation({
  args: {
    negotiationId: v.id("negotiations"),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("impasse")
    ),
    roundCount: v.optional(v.number()),
    finalOffer: v.optional(
      v.object({
        products: v.optional(v.array(productOfferValidator)),
        subtotal: v.optional(v.number()),
        volumeDiscount: v.optional(v.number()),
        volumeDiscountPercent: v.optional(v.number()),
        unitPrice: v.number(),
        leadTimeDays: v.number(),
        paymentTerms: v.string(),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const negotiation = await ctx.db.get(args.negotiationId);
    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    const updates: {
      status: "active" | "completed" | "impasse";
      roundCount?: number;
      completedAt?: number;
      finalOffer?: {
        products?: Array<{
          productId: string;
          productName: string;
          quantity: number;
          unitPrice: number;
          lineTotal: number;
          materialSubstitution?: {
            original: string;
            suggested: string;
            savings: number;
          };
        }>;
        subtotal?: number;
        volumeDiscount?: number;
        volumeDiscountPercent?: number;
        unitPrice: number;
        leadTimeDays: number;
        paymentTerms: string;
        notes?: string;
      };
    } = {
      status: args.status,
    };

    if (args.roundCount !== undefined) {
      updates.roundCount = args.roundCount;
    }

    if (args.status === "completed" || args.status === "impasse") {
      updates.completedAt = Date.now();
    }

    if (args.finalOffer) {
      updates.finalOffer = args.finalOffer;
    }

    await ctx.db.patch(args.negotiationId, updates);

    return { success: true };
  },
});

/**
 * Increment round count for a negotiation
 */
export const incrementRound = mutation({
  args: {
    negotiationId: v.id("negotiations"),
  },
  handler: async (ctx, args) => {
    const negotiation = await ctx.db.get(args.negotiationId);
    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    const newRoundCount = negotiation.roundCount + 1;

    await ctx.db.patch(args.negotiationId, {
      roundCount: newRoundCount,
    });

    return { roundCount: newRoundCount };
  },
});

/**
 * Add user intervention message
 *
 * Allows user to inject guidance into an active negotiation
 */
export const addUserIntervention = mutation({
  args: {
    negotiationId: v.id("negotiations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify negotiation exists and is active
    const negotiation = await ctx.db.get(args.negotiationId);
    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    if (negotiation.status !== "active") {
      throw new Error(
        `Cannot add intervention to negotiation with status: ${negotiation.status}`
      );
    }

    // Insert user message
    const messageId = await ctx.db.insert("messages", {
      negotiationId: args.negotiationId,
      sender: "user",
      content: args.content,
      timestamp: Date.now(),
    });

    return messageId;
  },
});

/**
 * Get a single negotiation by ID
 */
export const getNegotiation = query({
  args: {
    negotiationId: v.id("negotiations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.negotiationId);
  },
});

/**
 * Get messages for a negotiation, ordered by timestamp
 */
export const getNegotiationMessages = query({
  args: {
    negotiationId: v.id("negotiations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_negotiationId_timestamp", (q) =>
        q.eq("negotiationId", args.negotiationId)
      )
      .order("asc")
      .collect();
  },
});

/**
 * Get all negotiations for a quote with their messages
 */
export const getQuoteNegotiationsWithMessages = query({
  args: {
    quoteId: v.id("quotes"),
  },
  handler: async (ctx, args) => {
    // Get negotiations for this quote
    const negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
      .collect();

    // Get messages for each negotiation
    const result = await Promise.all(
      negotiations.map(async (negotiation) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_negotiationId", (q) =>
            q.eq("negotiationId", negotiation._id)
          )
          .order("asc")
          .collect();

        return {
          ...negotiation,
          messages,
        };
      })
    );

    return result;
  },
});

/**
 * Check if all negotiations for a quote are complete
 */
export const checkQuoteNegotiationsComplete = query({
  args: {
    quoteId: v.id("quotes"),
  },
  handler: async (ctx, args) => {
    const negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
      .collect();

    const allComplete = negotiations.every(
      (n) => n.status === "completed" || n.status === "impasse"
    );

    const activeCount = negotiations.filter((n) => n.status === "active").length;
    const completedCount = negotiations.filter(
      (n) => n.status === "completed"
    ).length;
    const impasseCount = negotiations.filter((n) => n.status === "impasse").length;

    return {
      allComplete,
      activeCount,
      completedCount,
      impasseCount,
      total: negotiations.length,
    };
  },
});

// Types for action handlers
interface StartNegotiationResult {
  quoteId: string;
  negotiationIds: string[];
}

interface ContinueNegotiationResult {
  status: string;
  reason?: string;
  newRoundCount?: number;
}

/**
 * Start negotiations action
 *
 * This action initializes parallel negotiations with all suppliers
 */
export const startNegotiations = action({
  args: {
    quoteId: v.id("quotes"),
  },
  handler: async (ctx, args): Promise<{
    quoteId: string;
    negotiationIds: string[];
    status: string;
  }> => {
    // Start negotiation (creates negotiation records)
    const result = (await ctx.runMutation(api.quotes.startNegotiation, {
      quoteId: args.quoteId,
    })) as StartNegotiationResult;

    // In a full implementation, this would trigger the Mastra workflow
    // For now, return the created negotiation IDs
    return {
      quoteId: result.quoteId,
      negotiationIds: result.negotiationIds,
      status: "negotiations_started",
    };
  },
});

// Type for negotiation query result
interface NegotiationQueryResult {
  status: "active" | "completed" | "impasse";
  roundCount: number;
}

/**
 * Continue negotiation action
 *
 * Processes the next round for an active negotiation
 */
export const continueNegotiation = action({
  args: {
    negotiationId: v.id("negotiations"),
    brandMessage: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ContinueNegotiationResult> => {
    // Get negotiation
    const negotiation = (await ctx.runQuery(api.negotiations.getNegotiation, {
      negotiationId: args.negotiationId,
    })) as NegotiationQueryResult | null;

    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    if (negotiation.status !== "active") {
      throw new Error(
        `Cannot continue negotiation with status: ${negotiation.status}`
      );
    }

    // Check round limit
    if (negotiation.roundCount >= 10) {
      // Mark as impasse if max rounds reached
      await ctx.runMutation(api.negotiations.updateNegotiationStatus, {
        negotiationId: args.negotiationId,
        status: "impasse",
      });

      return {
        status: "impasse",
        reason: "Maximum rounds (10) reached without agreement",
      };
    }

    // Increment round count
    await ctx.runMutation(api.negotiations.incrementRound, {
      negotiationId: args.negotiationId,
    });

    // In a full implementation, this would:
    // 1. Generate brand agent response if brandMessage provided
    // 2. Get supplier agent response
    // 3. Persist messages
    // 4. Check for agreement/impasse

    return {
      status: "round_completed",
      newRoundCount: negotiation.roundCount + 1,
    };
  },
});

