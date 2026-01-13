/**
 * Scoring and Decision Engine Tool
 *
 * Mastra tool for calculating weighted scores and generating
 * human-readable decision explanations for supplier selection.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Decision priorities schema
 */
export const prioritiesSchema = z.object({
  quality: z.number().min(0).max(100),
  cost: z.number().min(0).max(100),
  leadTime: z.number().min(0).max(100),
  paymentTerms: z.number().min(0).max(100),
});

export type DecisionPriorities = z.infer<typeof prioritiesSchema>;

/**
 * Supplier offer schema for scoring
 */
export const supplierOfferSchema = z.object({
  supplierId: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  supplierName: z.string(),
  qualityRating: z.number().min(0).max(5),
  unitPrice: z.number().positive(),
  leadTimeDays: z.number().int().positive(),
  paymentTerms: z.string(),
  finalOffer: z.boolean(),
  negotiationStatus: z.enum(["active", "completed", "impasse"]),
});

export type SupplierOffer = z.infer<typeof supplierOfferSchema>;

/**
 * Evaluation scores for a single supplier
 */
export const evaluationScoreSchema = z.object({
  qualityScore: z.number().min(0).max(100),
  costScore: z.number().min(0).max(100),
  leadTimeScore: z.number().min(0).max(100),
  paymentTermsScore: z.number().min(0).max(100),
  totalScore: z.number().min(0).max(100),
});

export type EvaluationScore = z.infer<typeof evaluationScoreSchema>;

/**
 * Reference values for scoring (best and worst case scenarios)
 */
const SCORING_BENCHMARKS = {
  quality: {
    best: 5.0, // Perfect 5-star rating
    worst: 3.0, // Minimum acceptable
  },
  cost: {
    // These are relative - actual values computed from offer range
    lowestIsBaseline: true,
  },
  leadTime: {
    best: 10, // Fastest possible
    worst: 60, // Slowest acceptable
  },
  paymentTerms: {
    // Split ratio scoring - more even splits are better for buyer cash flow
    "33/33/33": 100, // Best - most even
    "30/70": 60, // Medium
    "50/50": 80, // Good
    "30/30/40": 90, // Good split
    "100": 0, // Worst - full upfront
  },
};

/**
 * Calculate quality score (0-100)
 */
function calculateQualityScore(rating: number): number {
  const { best, worst } = SCORING_BENCHMARKS.quality;
  const normalized = (rating - worst) / (best - worst);
  return Math.round(Math.max(0, Math.min(100, normalized * 100)));
}

/**
 * Calculate cost score (0-100) - lower price = higher score
 * Uses relative scoring based on all offers
 */
function calculateCostScore(
  unitPrice: number,
  allPrices: number[]
): number {
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);

  if (maxPrice === minPrice) return 100; // All same price

  // Inverse scale: lowest price gets 100, highest gets 0
  const normalized = (maxPrice - unitPrice) / (maxPrice - minPrice);
  return Math.round(normalized * 100);
}

/**
 * Calculate lead time score (0-100) - shorter = higher score
 */
function calculateLeadTimeScore(leadTimeDays: number): number {
  const { best, worst } = SCORING_BENCHMARKS.leadTime;
  const normalized = (worst - leadTimeDays) / (worst - best);
  return Math.round(Math.max(0, Math.min(100, normalized * 100)));
}

/**
 * Calculate payment terms score (0-100)
 */
function calculatePaymentTermsScore(terms: string): number {
  // Check for exact matches first
  const knownScore =
    SCORING_BENCHMARKS.paymentTerms[terms as keyof typeof SCORING_BENCHMARKS.paymentTerms];
  if (knownScore !== undefined) return knownScore;

  // Parse and score based on upfront percentage
  const parts = terms.split("/").map((p) => parseInt(p.trim(), 10));
  if (parts.length === 0 || parts.some(isNaN)) return 50; // Default mid-score

  const upfrontPercentage = parts[0];
  // Lower upfront = better (100% upfront = 0, 30% upfront = 70)
  return Math.round(100 - upfrontPercentage);
}

/**
 * Calculate weighted total score
 */
function calculateTotalScore(
  scores: Omit<EvaluationScore, "totalScore">,
  priorities: DecisionPriorities
): number {
  const total =
    (scores.qualityScore * priorities.quality +
      scores.costScore * priorities.cost +
      scores.leadTimeScore * priorities.leadTime +
      scores.paymentTermsScore * priorities.paymentTerms) /
    100;

  return Math.round(total * 100) / 100;
}

/**
 * Scoring Tool
 * Calculates weighted scores for all supplier offers
 */
export const scoringTool = createTool({
  id: "calculate-supplier-scores",
  description:
    "Calculate weighted scores for supplier offers based on user priorities",
  inputSchema: z.object({
    offers: z.array(supplierOfferSchema).min(1).max(3),
    priorities: prioritiesSchema,
  }),
  outputSchema: z.object({
    scores: z.record(
      z.string(),
      evaluationScoreSchema
    ),
    ranking: z.array(
      z.object({
        supplierId: z.number(),
        supplierName: z.string(),
        totalScore: z.number(),
        rank: z.number(),
      })
    ),
    winner: z.object({
      supplierId: z.number(),
      supplierName: z.string(),
      totalScore: z.number(),
    }),
  }),
  execute: async (input) => {
    const offers = input.offers as SupplierOffer[];
    const priorities = input.priorities as DecisionPriorities;

    // Get all prices for relative cost scoring
    const allPrices = offers.map((o) => o.unitPrice);

    // Calculate scores for each supplier
    const scores: Record<string, EvaluationScore> = {};

    for (const offer of offers) {
      const qualityScore = calculateQualityScore(offer.qualityRating);
      const costScore = calculateCostScore(offer.unitPrice, allPrices);
      const leadTimeScore = calculateLeadTimeScore(offer.leadTimeDays);
      const paymentTermsScore = calculatePaymentTermsScore(offer.paymentTerms);

      const componentScores = {
        qualityScore,
        costScore,
        leadTimeScore,
        paymentTermsScore,
      };

      const totalScore = calculateTotalScore(componentScores, priorities);

      scores[`supplier${offer.supplierId}`] = {
        ...componentScores,
        totalScore,
      };
    }

    // Create ranking
    const ranking = offers
      .map((offer) => ({
        supplierId: offer.supplierId,
        supplierName: offer.supplierName,
        totalScore: scores[`supplier${offer.supplierId}`].totalScore,
        rank: 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    const winner = ranking[0];

    return {
      scores,
      ranking,
      winner: {
        supplierId: winner.supplierId,
        supplierName: winner.supplierName,
        totalScore: winner.totalScore,
      },
    };
  },
});

/**
 * Generate Decision Tool
 * Produces human-readable explanation for supplier selection with rich analysis
 */
export const generateDecisionTool = createTool({
  id: "generate-decision-explanation",
  description:
    "Generate a comprehensive human-readable explanation for why a supplier was selected",
  inputSchema: z.object({
    winner: z.object({
      supplierId: z.number(),
      supplierName: z.string(),
      totalScore: z.number(),
    }),
    scores: z.record(z.string(), evaluationScoreSchema),
    offers: z.array(supplierOfferSchema),
    priorities: prioritiesSchema,
  }),
  outputSchema: z.object({
    reasoning: z.string(),
    summary: z.string(),
    keyFactors: z.array(z.string()),
    caveats: z.array(z.string()),
    competitiveAnalysis: z.string(),
    recommendations: z.array(z.string()),
  }),
  execute: async (input) => {
    const winner = input.winner as { supplierId: number; supplierName: string; totalScore: number };
    const scores = input.scores as Record<string, EvaluationScore>;
    const offers = input.offers as SupplierOffer[];
    const priorities = input.priorities as DecisionPriorities;

    const winnerOffer = offers.find((o) => o.supplierId === winner.supplierId);
    const winnerScores = scores[`supplier${winner.supplierId}`];

    if (!winnerOffer || !winnerScores) {
      return {
        reasoning: "Unable to generate reasoning - winner data not found",
        summary: "Decision data incomplete",
        keyFactors: [],
        caveats: ["Please review offers manually"],
        competitiveAnalysis: "",
        recommendations: [],
      };
    }

    // Identify key factors (highest weighted scores that led to selection)
    const keyFactors: string[] = [];
    const caveats: string[] = [];
    const recommendations: string[] = [];

    const factors = [
      { name: "quality", weight: priorities.quality, score: winnerScores.qualityScore },
      { name: "cost", weight: priorities.cost, score: winnerScores.costScore },
      { name: "lead time", weight: priorities.leadTime, score: winnerScores.leadTimeScore },
      {
        name: "payment terms",
        weight: priorities.paymentTerms,
        score: winnerScores.paymentTermsScore,
      },
    ].sort((a, b) => b.weight * b.score - a.weight * a.score);

    // Analyze each factor for key drivers
    const topFactors = factors.slice(0, 2);
    for (const factor of topFactors) {
      if (factor.score >= 80) {
        keyFactors.push(
          `Excellent ${factor.name} performance (${factor.score}/100) - major competitive advantage with ${factor.weight}% priority weight`
        );
      } else if (factor.score >= 60) {
        keyFactors.push(
          `Strong ${factor.name} (${factor.score}/100) aligned well with your ${factor.weight}% priority weight`
        );
      } else if (factor.score >= 40) {
        keyFactors.push(
          `Acceptable ${factor.name} (${factor.score}/100) at ${factor.weight}% priority - contributed to overall score`
        );
      }
    }

    // Check for weaknesses and generate recommendations
    for (const factor of factors) {
      if (factor.weight >= 20 && factor.score < 50) {
        caveats.push(
          `${factor.name.charAt(0).toUpperCase() + factor.name.slice(1)} is a potential concern (${factor.score}/100) given your ${factor.weight}% priority weight`
        );
        
        // Generate specific recommendations based on weakness
        if (factor.name === "quality") {
          recommendations.push("Consider requesting quality certifications or samples before finalizing the order");
        } else if (factor.name === "lead time") {
          recommendations.push("Discuss expedited shipping options or negotiate a buffer in your production timeline");
        } else if (factor.name === "cost") {
          recommendations.push("Explore volume-based pricing tiers or material substitutions for cost optimization");
        } else if (factor.name === "payment terms") {
          recommendations.push("Negotiate for more favorable payment milestones or consider escrow arrangements");
        }
      }
    }

    // Build competitive analysis
    const sortedOffers = offers
      .map((o) => ({
        ...o,
        score: scores[`supplier${o.supplierId}`]?.totalScore || 0,
        scores: scores[`supplier${o.supplierId}`],
      }))
      .sort((a, b) => b.score - a.score);

    const competitiveLines: string[] = [];
    for (let i = 1; i < sortedOffers.length; i++) {
      const competitor = sortedOffers[i];
      const margin = sortedOffers[0].score - competitor.score;
      
      // Find where competitor was stronger
      const competitorAdvantages: string[] = [];
      if (competitor.scores && winnerScores) {
        if (competitor.scores.qualityScore > winnerScores.qualityScore) {
          competitorAdvantages.push(`higher quality (${competitor.scores.qualityScore} vs ${winnerScores.qualityScore})`);
        }
        if (competitor.scores.costScore > winnerScores.costScore) {
          competitorAdvantages.push(`better pricing (${competitor.scores.costScore} vs ${winnerScores.costScore})`);
        }
        if (competitor.scores.leadTimeScore > winnerScores.leadTimeScore) {
          competitorAdvantages.push(`faster delivery (${competitor.scores.leadTimeScore} vs ${winnerScores.leadTimeScore})`);
        }
        if (competitor.scores.paymentTermsScore > winnerScores.paymentTermsScore) {
          competitorAdvantages.push(`better payment terms (${competitor.scores.paymentTermsScore} vs ${winnerScores.paymentTermsScore})`);
        }
      }
      
      if (margin < 5) {
        caveats.push(
          `Very close decision - ${competitor.supplierName} scored within ${margin.toFixed(1)} points and may warrant consideration`
        );
      }
      
      competitiveLines.push(
        `**${competitor.supplierName}** (Score: ${competitor.score.toFixed(1)}/100, -${margin.toFixed(1)} pts)${competitorAdvantages.length > 0 ? `: Had ${competitorAdvantages.join(", ")}` : ""}`
      );
    }

    const competitiveAnalysis = competitiveLines.length > 0
      ? `## Competitive Comparison\n\n${competitiveLines.join("\n\n")}`
      : "No competitive data available.";

    // Determine decision strength
    const avgCompetitorScore = sortedOffers.slice(1).reduce((sum, o) => sum + o.score, 0) / Math.max(1, sortedOffers.length - 1);
    const leadMargin = winner.totalScore - avgCompetitorScore;
    
    let decisionStrength: string;
    if (leadMargin > 15) {
      decisionStrength = "Clear Winner";
      recommendations.push("Strong selection with significant competitive advantage - proceed with confidence");
    } else if (leadMargin > 5) {
      decisionStrength = "Solid Choice";
      recommendations.push("Good selection based on your priorities - standard due diligence recommended");
    } else {
      decisionStrength = "Competitive";
      recommendations.push("Close decision - consider maintaining relationships with runner-up suppliers as backup options");
    }

    // Build comprehensive reasoning
    const reasoning = `## Executive Summary

**${winner.supplierName}** achieved the highest weighted score of **${winner.totalScore.toFixed(1)}/100** based on your priority weights. This is a **${decisionStrength}** selection with ${leadMargin.toFixed(1)} points above the competitive average.

## Your Priority Alignment

| Criterion | Your Priority | Score | Contribution |
|-----------|---------------|-------|--------------|
| Quality | ${priorities.quality}% | ${winnerScores.qualityScore}/100 | ${((winnerScores.qualityScore * priorities.quality) / 100).toFixed(1)} pts |
| Cost | ${priorities.cost}% | ${winnerScores.costScore}/100 | ${((winnerScores.costScore * priorities.cost) / 100).toFixed(1)} pts |
| Lead Time | ${priorities.leadTime}% | ${winnerScores.leadTimeScore}/100 | ${((winnerScores.leadTimeScore * priorities.leadTime) / 100).toFixed(1)} pts |
| Payment Terms | ${priorities.paymentTerms}% | ${winnerScores.paymentTermsScore}/100 | ${((winnerScores.paymentTermsScore * priorities.paymentTerms) / 100).toFixed(1)} pts |

## Selected Offer Details

- **Unit Price:** $${winnerOffer.unitPrice.toFixed(2)}
- **Lead Time:** ${winnerOffer.leadTimeDays} days
- **Payment Terms:** ${winnerOffer.paymentTerms}
- **Quality Rating:** ${winnerOffer.qualityRating}/5.0

${keyFactors.length > 0 ? `## Key Decision Drivers\n\n${keyFactors.map((f) => `- ${f}`).join("\n")}` : ""}

${caveats.length > 0 ? `## Considerations & Risks\n\n${caveats.map((c) => `⚠️ ${c}`).join("\n")}` : ""}

${competitiveAnalysis}

${recommendations.length > 0 ? `## Strategic Recommendations\n\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}` : ""}`;

    const summary = `${winner.supplierName} selected as ${decisionStrength.toLowerCase()} with ${winner.totalScore.toFixed(1)}/100 - best balance of ${topFactors.map((f) => f.name).join(" and ")}.`;

    return {
      reasoning,
      summary,
      keyFactors,
      caveats,
      competitiveAnalysis,
      recommendations,
    };
  },
});

/**
 * Export tools collection
 */
export const scoringTools = {
  scoringTool,
  generateDecisionTool,
};

/**
 * Standalone scoring functions for use outside Mastra tools
 */
export const scoringUtils = {
  calculateQualityScore,
  calculateCostScore,
  calculateLeadTimeScore,
  calculatePaymentTermsScore,
  calculateTotalScore,
};

