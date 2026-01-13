/**
 * Decision Mutations and Queries
 *
 * Convex functions for decision management:
 * - createDecision: Create a decision after negotiations complete
 * - getDecision: Get decision by ID
 * - getQuoteDecision: Get decision for a quote
 * - evaluateSuppliers: Action to evaluate and select supplier
 */

import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";

/**
 * Supplier scores schema for validation
 */
const supplierScoresValidator = v.object({
  qualityScore: v.number(),
  costScore: v.number(),
  leadTimeScore: v.number(),
  paymentTermsScore: v.number(),
  totalScore: v.number(),
});

/**
 * Create a decision record
 */
export const createDecision = mutation({
  args: {
    quoteId: v.id("quotes"),
    selectedSupplierId: v.union(
      v.literal(1),
      v.literal(2),
      v.literal(3),
      v.literal(4)
    ),
    reasoning: v.string(),
    evaluationScores: v.object({
      supplier1: supplierScoresValidator,
      supplier2: supplierScoresValidator,
      supplier3: supplierScoresValidator,
      supplier4: v.optional(supplierScoresValidator),
    }),
  },
  handler: async (ctx, args) => {
    // Verify quote exists
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) {
      throw new Error("Quote not found");
    }

    // Check if decision already exists for this quote
    const existingDecision = await ctx.db
      .query("decisions")
      .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
      .first();

    if (existingDecision) {
      throw new Error("Decision already exists for this quote");
    }

    // Create the decision
    const decisionId = await ctx.db.insert("decisions", {
      quoteId: args.quoteId,
      selectedSupplierId: args.selectedSupplierId,
      reasoning: args.reasoning,
      evaluationScores: args.evaluationScores,
      createdAt: Date.now(),
    });

    // Complete the quote
    await ctx.db.patch(args.quoteId, {
      status: "completed",
      completedAt: Date.now(),
    });

    return decisionId;
  },
});

/**
 * Get decision by ID
 */
export const getDecision = query({
  args: {
    decisionId: v.id("decisions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.decisionId);
  },
});

/**
 * Get decision for a specific quote
 */
export const getQuoteDecision = query({
  args: {
    quoteId: v.id("quotes"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("decisions")
      .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
      .first();
  },
});

/**
 * Scoring calculation utilities
 */
const SCORING_BENCHMARKS = {
  quality: {
    best: 5.0,
    worst: 3.0,
  },
  leadTime: {
    best: 10,
    worst: 60,
  },
  paymentTerms: {
    "33/33/33": 100,
    "30/70": 60,
    "50/50": 80,
    "30/30/40": 90,
    "100": 0,
  } as Record<string, number>,
};

function calculateQualityScore(rating: number): number {
  const { best, worst } = SCORING_BENCHMARKS.quality;
  const normalized = (rating - worst) / (best - worst);
  return Math.round(Math.max(0, Math.min(100, normalized * 100)));
}

function calculateCostScore(unitPrice: number, allPrices: number[]): number {
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  if (maxPrice === minPrice) return 100;
  const normalized = (maxPrice - unitPrice) / (maxPrice - minPrice);
  return Math.round(normalized * 100);
}

function calculateLeadTimeScore(leadTimeDays: number): number {
  const { best, worst } = SCORING_BENCHMARKS.leadTime;
  const normalized = (worst - leadTimeDays) / (worst - best);
  return Math.round(Math.max(0, Math.min(100, normalized * 100)));
}

function calculatePaymentTermsScore(terms: string): number {
  const knownScore = SCORING_BENCHMARKS.paymentTerms[terms];
  if (knownScore !== undefined) return knownScore;

  const parts = terms.split("/").map((p) => parseInt(p.trim(), 10));
  if (parts.length === 0 || parts.some(isNaN)) return 50;

  const upfrontPercentage = parts[0];
  return Math.round(100 - upfrontPercentage);
}

// Negotiation type for action context
interface NegotiationForScoring {
  supplierId: 1 | 2 | 3 | 4;
  status: "active" | "completed" | "impasse";
  finalOffer?: {
    unitPrice: number;
    leadTimeDays: number;
    paymentTerms: string;
  };
}

// Quote type for action context
interface QuoteForScoring {
  decisionPriorities: {
    quality: number;
    cost: number;
    leadTime: number;
    paymentTerms: number;
  };
}

/**
 * Evaluate suppliers action
 *
 * Analyzes completed negotiations and selects the best supplier
 */
export const evaluateSuppliers = action({
  args: {
    quoteId: v.id("quotes"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    decisionId: string;
    selectedSupplierId: 1 | 2 | 3 | 4;
    totalScore: number;
    evaluationScores: Record<
      string,
      {
        qualityScore: number;
        costScore: number;
        leadTimeScore: number;
        paymentTermsScore: number;
        totalScore: number;
      }
    >;
    reasoning: string;
  }> => {
    // Get quote with priorities
    const quote = (await ctx.runQuery(api.quotes.getQuote, {
      quoteId: args.quoteId,
    })) as QuoteForScoring | null;

    if (!quote) {
      throw new Error("Quote not found");
    }

    // Get all negotiations with their final offers
    const negotiations = (await ctx.runQuery(
      api.negotiations.getQuoteNegotiationsWithMessages,
      { quoteId: args.quoteId }
    )) as NegotiationForScoring[];

    // Filter to completed negotiations with final offers
    const completedNegotiations = negotiations.filter(
      (n: NegotiationForScoring) => n.status === "completed" && n.finalOffer
    );

    if (completedNegotiations.length === 0) {
      throw new Error("No completed negotiations with final offers found");
    }

    // Get all prices for relative cost scoring
    const allPrices = completedNegotiations.map(
      (n: NegotiationForScoring) => n.finalOffer!.unitPrice
    );

    // Calculate scores for each supplier
    const supplierScores: Record<
      string,
      {
        qualityScore: number;
        costScore: number;
        leadTimeScore: number;
        paymentTermsScore: number;
        totalScore: number;
      }
    > = {};

    // Supplier quality ratings (from supplier characteristics)
    const qualityRatings: Record<number, number> = {
      1: 4.0,
      2: 4.7,
      3: 4.0,
      4: 4.3,
    };

    for (const negotiation of negotiations) {
      const supplierId = negotiation.supplierId;
      const finalOffer = negotiation.finalOffer;

      // Use final offer data if completed, otherwise use defaults
      const qualityScore = calculateQualityScore(
        qualityRatings[supplierId] || 4.0
      );

      const costScore = finalOffer
        ? calculateCostScore(
            finalOffer.unitPrice,
            allPrices.length > 0 ? allPrices : [100]
          )
        : 0;

      const leadTimeScore = finalOffer
        ? calculateLeadTimeScore(finalOffer.leadTimeDays)
        : 0;

      const paymentTermsScore = finalOffer
        ? calculatePaymentTermsScore(finalOffer.paymentTerms)
        : 0;

      // Calculate weighted total
      const priorities = quote.decisionPriorities;
      const totalScore =
        (qualityScore * priorities.quality +
          costScore * priorities.cost +
          leadTimeScore * priorities.leadTime +
          paymentTermsScore * priorities.paymentTerms) /
        100;

      supplierScores[`supplier${supplierId}`] = {
        qualityScore,
        costScore,
        leadTimeScore,
        paymentTermsScore,
        totalScore: Math.round(totalScore * 100) / 100,
      };
    }

    // Ensure all suppliers have scores (even if they didn't complete)
    for (const supplierId of [1, 2, 3, 4]) {
      if (!supplierScores[`supplier${supplierId}`]) {
        supplierScores[`supplier${supplierId}`] = {
          qualityScore: 0,
          costScore: 0,
          leadTimeScore: 0,
          paymentTermsScore: 0,
          totalScore: 0,
        };
      }
    }

    // Find winner (highest total score among completed negotiations)
    let winner = { supplierId: 1 as 1 | 2 | 3 | 4, score: 0 };
    for (const negotiation of completedNegotiations) {
      const scores = supplierScores[`supplier${negotiation.supplierId}`];
      if (scores.totalScore > winner.score) {
        winner = {
          supplierId: negotiation.supplierId,
          score: scores.totalScore,
        };
      }
    }

    // Generate reasoning
    const winnerNegotiation = completedNegotiations.find(
      (n: NegotiationForScoring) => n.supplierId === winner.supplierId
    );
    const winnerScores = supplierScores[`supplier${winner.supplierId}`];
    const winnerOffer = winnerNegotiation?.finalOffer;

    const priorities = quote.decisionPriorities;
    const reasoning = `Based on your priority weights (Quality: ${priorities.quality}%, Cost: ${priorities.cost}%, Lead Time: ${priorities.leadTime}%, Payment Terms: ${priorities.paymentTerms}%), Supplier ${winner.supplierId} achieved the highest weighted score of ${winner.score.toFixed(1)} out of 100.

**Offer Details:**
- Unit Price: $${winnerOffer?.unitPrice.toFixed(2) || "N/A"}
- Lead Time: ${winnerOffer?.leadTimeDays || "N/A"} days
- Payment Terms: ${winnerOffer?.paymentTerms || "N/A"}

**Score Breakdown:**
- Quality: ${winnerScores.qualityScore}/100
- Cost Efficiency: ${winnerScores.costScore}/100
- Lead Time: ${winnerScores.leadTimeScore}/100
- Payment Terms: ${winnerScores.paymentTermsScore}/100

This selection best aligns with your stated priorities for this sourcing decision.`;

    // Create decision
    const decisionId = await ctx.runMutation(api.decisions.createDecision, {
      quoteId: args.quoteId,
      selectedSupplierId: winner.supplierId,
      reasoning,
      evaluationScores: {
        supplier1: supplierScores.supplier1,
        supplier2: supplierScores.supplier2,
        supplier3: supplierScores.supplier3,
        supplier4: supplierScores.supplier4,
      },
    });

    return {
      decisionId,
      selectedSupplierId: winner.supplierId,
      totalScore: winner.score,
      evaluationScores: supplierScores,
      reasoning,
    };
  },
});
