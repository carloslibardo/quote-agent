/**
 * Message Mutations and Queries
 *
 * Convex functions for message management:
 * - getByNegotiation: Get all messages for a negotiation
 * - create: Create a new message
 * - deleteByNegotiation: Delete all messages for a negotiation
 *
 * These functions are used by the Convex storage adapter for Mastra.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all messages for a negotiation, ordered by timestamp
 */
export const getByNegotiation = query({
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
 * Create a new message
 */
export const create = mutation({
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
 * Delete all messages for a negotiation
 *
 * Used when clearing conversation history
 */
export const deleteByNegotiation = mutation({
  args: {
    negotiationId: v.id("negotiations"),
  },
  handler: async (ctx, args) => {
    // Get all messages for this negotiation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_negotiationId", (q) =>
        q.eq("negotiationId", args.negotiationId)
      )
      .collect();

    // Delete each message
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    return {
      deleted: messages.length,
    };
  },
});

/**
 * Get latest messages for a negotiation (for real-time updates)
 */
export const getLatestMessages = query({
  args: {
    negotiationId: v.id("negotiations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_negotiationId_timestamp", (q) =>
        q.eq("negotiationId", args.negotiationId)
      )
      .order("desc")
      .take(limit);

    // Reverse to get chronological order
    return messages.reverse();
  },
});

/**
 * Get message count for a negotiation
 */
export const getMessageCount = query({
  args: {
    negotiationId: v.id("negotiations"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_negotiationId", (q) =>
        q.eq("negotiationId", args.negotiationId)
      )
      .collect();

    return {
      total: messages.length,
      byBrand: messages.filter((m) => m.sender === "brand").length,
      bySupplier: messages.filter((m) => m.sender === "supplier").length,
      byUser: messages.filter((m) => m.sender === "user").length,
    };
  },
});

/**
 * Get messages since a specific timestamp, optionally filtered by sender
 * Used for user intervention polling during negotiations
 */
export const getMessagesSince = query({
  args: {
    negotiationId: v.id("negotiations"),
    sinceTimestamp: v.number(),
    sender: v.optional(
      v.union(v.literal("brand"), v.literal("supplier"), v.literal("user"))
    ),
  },
  handler: async (ctx, args) => {
    let messages = await ctx.db
      .query("messages")
      .withIndex("by_negotiationId_timestamp", (q) =>
        q.eq("negotiationId", args.negotiationId)
      )
      .filter((q) => q.gt(q.field("timestamp"), args.sinceTimestamp))
      .order("asc")
      .collect();

    // Filter by sender if specified
    if (args.sender) {
      messages = messages.filter((m) => m.sender === args.sender);
    }

    return messages;
  },
});

/**
 * Add a message (alias for create, used by MessagePersister)
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

