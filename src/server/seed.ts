/**
 * Database Seed Mutations
 *
 * This file contains seed functions for populating the database with initial data.
 * Run these via the Convex CLI:
 *
 *   pnpx convex run seed:seedSampleQuote
 *   pnpx convex run seed:clearQuotes
 */

import { internalMutation } from "./_generated/server";

/**
 * Seed sample quote data for testing.
 * Creates a sample quote with products.
 *
 * Usage: pnpx convex run seed:seedSampleQuote
 */
export const seedSampleQuote = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Create a sample quote
    const quoteId = await ctx.db.insert("quotes", {
      products: [
        { productId: "organic-cotton-tshirt", quantity: 500 },
        { productId: "recycled-polyester-hoodie", quantity: 200 },
      ],
      userNotes:
        "Sample quote for testing - prioritize quality and sustainability",
      decisionPriorities: {
        quality: 40,
        cost: 30,
        leadTime: 20,
        paymentTerms: 10,
      },
      status: "pending",
      createdAt: Date.now(),
    });

    return {
      message: "Sample quote created",
      quoteId,
    };
  },
});

/**
 * Clear all quotes from the database.
 * Use with caution - this will delete all quotes and related data!
 *
 * Usage: pnpx convex run seed:clearQuotes
 */
export const clearQuotes = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all quotes
    const quotes = await ctx.db.query("quotes").collect();

    let deletedQuotes = 0;
    let deletedNegotiations = 0;
    let deletedMessages = 0;
    let deletedDecisions = 0;

    for (const quote of quotes) {
      // Get and delete negotiations
      const negotiations = await ctx.db
        .query("negotiations")
        .withIndex("by_quoteId", (q) => q.eq("quoteId", quote._id))
        .collect();

      for (const negotiation of negotiations) {
        // Delete messages for this negotiation
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_negotiationId", (q) =>
            q.eq("negotiationId", negotiation._id)
          )
          .collect();

        for (const message of messages) {
          await ctx.db.delete(message._id);
          deletedMessages++;
        }

        await ctx.db.delete(negotiation._id);
        deletedNegotiations++;
      }

      // Delete decision for this quote
      const decision = await ctx.db
        .query("decisions")
        .withIndex("by_quoteId", (q) => q.eq("quoteId", quote._id))
        .first();

      if (decision) {
        await ctx.db.delete(decision._id);
        deletedDecisions++;
      }

      // Delete the quote
      await ctx.db.delete(quote._id);
      deletedQuotes++;
    }

    return {
      message: `Deleted ${deletedQuotes} quotes, ${deletedNegotiations} negotiations, ${deletedMessages} messages, and ${deletedDecisions} decisions`,
    };
  },
});
