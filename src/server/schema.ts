import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Database Schema
 *
 * This file defines the structure of your Convex database tables.
 * Each table is defined with its fields and their types.
 */

export default defineSchema({
  // Quote Request table - stores quote requests
  quotes: defineTable({
    // Optional user identifier (for backwards compatibility)
    userId: v.optional(v.string()),
    // Array of products with quantities
    products: v.array(
      v.object({
        productId: v.string(),
        quantity: v.number(),
      })
    ),
    // Optional guidance notes for the brand agent
    userNotes: v.optional(v.string()),
    // Decision priority weights (should sum to 100)
    decisionPriorities: v.object({
      quality: v.number(),
      cost: v.number(),
      leadTime: v.number(),
      paymentTerms: v.number(),
    }),
    // Quote status: pending | negotiating | completed | cancelled
    status: v.union(
      v.literal("pending"),
      v.literal("negotiating"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    // Timestamps
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  // Negotiation table - one per supplier per quote
  negotiations: defineTable({
    // Reference to parent quote
    quoteId: v.id("quotes"),
    // Supplier ID: 1, 2, 3, or 4
    supplierId: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
    // Negotiation status: active | completed | impasse
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("impasse")
    ),
    // Current round count (max 10)
    roundCount: v.number(),
    // Final offer data (populated when completed)
    finalOffer: v.optional(
      v.object({
        // Per-product pricing breakdown
        products: v.optional(
          v.array(
            v.object({
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
            })
          )
        ),
        // Aggregate pricing
        subtotal: v.optional(v.number()),
        volumeDiscount: v.optional(v.number()),
        volumeDiscountPercent: v.optional(v.number()),
        // Legacy field for backwards compatibility
        unitPrice: v.number(),
        leadTimeDays: v.number(),
        paymentTerms: v.string(),
        notes: v.optional(v.string()),
      })
    ),
    // Timestamps
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_quoteId", ["quoteId"])
    .index("by_status", ["status"])
    .index("by_quoteId_supplierId", ["quoteId", "supplierId"]),

  // Message table - conversation history
  messages: defineTable({
    // Reference to parent negotiation
    negotiationId: v.id("negotiations"),
    // Sender type: brand | supplier | user
    sender: v.union(
      v.literal("brand"),
      v.literal("supplier"),
      v.literal("user")
    ),
    // Message content
    content: v.string(),
    // Message timestamp
    timestamp: v.number(),
    // Optional metadata (AI model info, token usage)
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
  })
    .index("by_negotiationId", ["negotiationId"])
    .index("by_negotiationId_timestamp", ["negotiationId", "timestamp"]),

  // Decision table - final supplier selection
  decisions: defineTable({
    // Reference to parent quote
    quoteId: v.id("quotes"),
    // Selected supplier ID (1, 2, 3, or 4)
    selectedSupplierId: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
    // Human-readable explanation of decision
    reasoning: v.string(),
    // Evaluation scores for all suppliers
    evaluationScores: v.object({
      supplier1: v.object({
        qualityScore: v.number(),
        costScore: v.number(),
        leadTimeScore: v.number(),
        paymentTermsScore: v.number(),
        totalScore: v.number(),
      }),
      supplier2: v.object({
        qualityScore: v.number(),
        costScore: v.number(),
        leadTimeScore: v.number(),
        paymentTermsScore: v.number(),
        totalScore: v.number(),
      }),
      supplier3: v.object({
        qualityScore: v.number(),
        costScore: v.number(),
        leadTimeScore: v.number(),
        paymentTermsScore: v.number(),
        totalScore: v.number(),
      }),
      supplier4: v.optional(
        v.object({
          qualityScore: v.number(),
          costScore: v.number(),
          leadTimeScore: v.number(),
          paymentTermsScore: v.number(),
          totalScore: v.number(),
        })
      ),
    }),
    // Timestamp
    createdAt: v.number(),
  }).index("by_quoteId", ["quoteId"]),
});
