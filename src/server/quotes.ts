/**
 * Quote Mutations and Queries
 *
 * Convex functions for quote management:
 * - createQuote: Create a new quote request
 * - startNegotiation: Transition quote to negotiating status
 * - cancelQuote: Cancel a pending quote
 * - getQuote: Fetch a single quote by ID
 * - listQuotes: List all quotes with optional filtering
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new quote request
 *
 * Validates:
 * - At least one product has quantity > 0
 * - Decision priorities sum to 100
 */
export const createQuote = mutation({
  args: {
    products: v.array(
      v.object({
        productId: v.string(),
        quantity: v.number(),
      })
    ),
    userNotes: v.optional(v.string()),
    decisionPriorities: v.object({
      quality: v.number(),
      cost: v.number(),
      leadTime: v.number(),
      paymentTerms: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Validate at least one product has quantity > 0
    const hasValidQuantity = args.products.some((p) => p.quantity > 0);
    if (!hasValidQuantity) {
      throw new Error(
        "At least one product must have a quantity greater than 0"
      );
    }

    // Validate all quantities are non-negative
    const hasNegativeQuantity = args.products.some((p) => p.quantity < 0);
    if (hasNegativeQuantity) {
      throw new Error("Product quantities cannot be negative");
    }

    // Validate decision priorities sum to 100
    const { quality, cost, leadTime, paymentTerms } = args.decisionPriorities;
    const prioritySum = quality + cost + leadTime + paymentTerms;
    if (prioritySum !== 100) {
      throw new Error(
        `Decision priorities must sum to 100 (currently ${prioritySum})`
      );
    }

    // Validate individual priorities are in valid range (0-100)
    const priorities = [quality, cost, leadTime, paymentTerms];
    if (priorities.some((p) => p < 0 || p > 100)) {
      throw new Error("Each priority must be between 0 and 100");
    }

    // Create the quote
    const quoteId = await ctx.db.insert("quotes", {
      products: args.products,
      userNotes: args.userNotes,
      decisionPriorities: args.decisionPriorities,
      status: "pending",
      createdAt: Date.now(),
    });

    return quoteId;
  },
});

/**
 * Start negotiations for a quote
 *
 * Transitions quote from pending to negotiating status
 * Creates negotiation records for all 3 suppliers
 */
export const startNegotiation = mutation({
  args: {
    quoteId: v.id("quotes"),
  },
  handler: async (ctx, args) => {
    // Get the quote
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) {
      throw new Error("Quote not found");
    }

    // Validate quote is in pending status
    if (quote.status !== "pending") {
      throw new Error(
        `Cannot start negotiation for quote with status: ${quote.status}`
      );
    }

    // Update quote status to negotiating
    await ctx.db.patch(args.quoteId, {
      status: "negotiating",
    });

    // Create negotiation records for all 3 suppliers
    const negotiationIds: string[] = [];
    for (const supplierId of [1, 2, 3] as const) {
      const negotiationId = await ctx.db.insert("negotiations", {
        quoteId: args.quoteId,
        supplierId,
        status: "active",
        roundCount: 0,
        createdAt: Date.now(),
      });
      negotiationIds.push(negotiationId);
    }

    return {
      quoteId: args.quoteId,
      negotiationIds,
    };
  },
});

/**
 * Cancel a quote
 *
 * Only pending quotes can be cancelled
 */
export const cancelQuote = mutation({
  args: {
    quoteId: v.id("quotes"),
  },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) {
      throw new Error("Quote not found");
    }

    if (quote.status !== "pending") {
      throw new Error(`Cannot cancel quote with status: ${quote.status}`);
    }

    await ctx.db.patch(args.quoteId, {
      status: "cancelled",
    });

    return { success: true };
  },
});

/**
 * Complete a quote
 *
 * Transitions quote from negotiating to completed status
 */
export const completeQuote = mutation({
  args: {
    quoteId: v.id("quotes"),
  },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) {
      throw new Error("Quote not found");
    }

    if (quote.status !== "negotiating") {
      throw new Error(`Cannot complete quote with status: ${quote.status}`);
    }

    await ctx.db.patch(args.quoteId, {
      status: "completed",
      completedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get a single quote by ID
 */
export const getQuote = query({
  args: {
    quoteId: v.id("quotes"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.quoteId);
  },
});

/**
 * Get negotiations for a quote
 */
export const getQuoteNegotiations = query({
  args: {
    quoteId: v.id("quotes"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("negotiations")
      .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
      .collect();
  },
});

/**
 * List all quotes with optional status filter
 */
export const listQuotes = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("negotiating"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      // Filter by status using index
      return await ctx.db
        .query("quotes")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }

    // No status filter - get all quotes
    return await ctx.db.query("quotes").order("desc").collect();
  },
});

/**
 * Get quote with all related data (negotiations, messages, decision)
 */
export const getQuoteWithDetails = query({
  args: {
    quoteId: v.id("quotes"),
  },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) {
      return null;
    }

    // Get negotiations
    const negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
      .collect();

    // Get messages for each negotiation
    const negotiationsWithMessages = await Promise.all(
      negotiations.map(async (negotiation) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_negotiationId", (q) =>
            q.eq("negotiationId", negotiation._id)
          )
          .order("asc")
          .collect();
        return { ...negotiation, messages };
      })
    );

    // Get decision if exists
    const decision = await ctx.db
      .query("decisions")
      .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
      .first();

    return {
      ...quote,
      negotiations: negotiationsWithMessages,
      decision,
    };
  },
});
