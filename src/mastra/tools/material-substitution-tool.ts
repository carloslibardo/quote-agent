/**
 * Material Substitution Tools
 *
 * Mastra tools for material substitution negotiation:
 * - suggestSubstitutionTool: Supplier proposes material alternatives
 * - acceptSubstitutionTool: Brand accepts a substitution
 * - rejectSubstitutionTool: Brand rejects a substitution
 * - materialSubstitutionTool: Query available alternatives (legacy)
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

/**
 * Substitution proposal schema for structured negotiation
 */
export const substitutionProposalSchema = z.object({
  productId: z.string().describe("Product ID for this substitution"),
  originalMaterial: z.string().describe("Current material specification"),
  suggestedMaterial: z.string().describe("Proposed alternative material"),
  costReductionPercent: z.number().min(0).max(50)
    .describe("Percentage cost reduction (0-50%)"),
  qualityImpact: z.enum(["none", "minor", "moderate", "significant"])
    .describe("Expected impact on quality"),
  qualityJustification: z.string()
    .describe("Explanation of quality impact or equivalence"),
  leadTimeChange: z.number().optional()
    .describe("Change in lead time (positive = longer, negative = shorter)"),
});

export type SubstitutionProposal = z.infer<typeof substitutionProposalSchema>;

// ============================================================================
// Substitution Negotiation Tools
// ============================================================================

/**
 * Suggest Substitution Tool
 * Used by supplier agents to propose alternative materials
 */
export const suggestSubstitutionTool = createTool({
  id: "suggest-substitution",
  description: `Propose a material substitution to reduce costs while maintaining quality.
Use this when you can offer a cost-effective alternative material.
Be specific about quality implications.`,
  inputSchema: z.object({
    proposal: substitutionProposalSchema,
    message: z.string().describe("Explanation of the substitution benefits"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    substitutionId: z.string(),
    proposal: substitutionProposalSchema,
    message: z.string(),
  }),
  execute: async (input) => {
    const substitutionId = `sub-${Date.now()}-${input.proposal.productId}`;
    return {
      success: true,
      substitutionId,
      proposal: input.proposal,
      message: input.message,
    };
  },
});

/**
 * Accept Substitution Tool
 * Used by brand agent to accept a proposed substitution
 */
export const acceptSubstitutionTool = createTool({
  id: "accept-substitution",
  description: `Accept a proposed material substitution.
Use when the cost savings justify any quality impact.`,
  inputSchema: z.object({
    substitutionId: z.string().describe("ID of the substitution to accept"),
    conditions: z.string().optional()
      .describe("Any conditions for acceptance (e.g., quality testing required)"),
    message: z.string().describe("Confirmation message"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    substitutionId: z.string(),
    status: z.literal("accepted"),
    conditions: z.string().optional(),
    message: z.string(),
  }),
  execute: async (input) => ({
    success: true,
    substitutionId: input.substitutionId,
    status: "accepted" as const,
    conditions: input.conditions,
    message: input.message,
  }),
});

/**
 * Rejection reason categories
 */
export const rejectionReasonSchema = z.enum([
  "quality_concerns",
  "customer_requirements",
  "certification_issues",
  "insufficient_savings",
  "other",
]);

export type RejectionReason = z.infer<typeof rejectionReasonSchema>;

/**
 * Reject Substitution Tool
 * Used by brand agent to reject a proposed substitution
 */
export const rejectSubstitutionTool = createTool({
  id: "reject-substitution",
  description: `Reject a proposed material substitution.
Use when quality concerns outweigh cost savings or substitution is inappropriate.`,
  inputSchema: z.object({
    substitutionId: z.string().describe("ID of the substitution to reject"),
    reason: rejectionReasonSchema.describe("Primary reason for rejection"),
    explanation: z.string().describe("Detailed explanation"),
    message: z.string().describe("Response message"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    substitutionId: z.string(),
    status: z.literal("rejected"),
    reason: z.string(),
    explanation: z.string(),
    message: z.string(),
  }),
  execute: async (input) => ({
    success: true,
    substitutionId: input.substitutionId,
    status: "rejected" as const,
    reason: input.reason,
    explanation: input.explanation,
    message: input.message,
  }),
});

/**
 * Export all substitution negotiation tools
 */
export const materialSubstitutionTools = {
  suggestSubstitutionTool,
  acceptSubstitutionTool,
  rejectSubstitutionTool,
};

// ============================================================================
// Legacy Material Query Tool
// ============================================================================

/**
 * Material type categories
 */
export type MaterialCategory = "leather" | "rubber" | "mesh" | "foam" | "laces" | "hardware";

/**
 * Material option with substitutes
 */
interface MaterialOption {
  id: string;
  name: string;
  category: MaterialCategory;
  costMultiplier: number;
  qualityImpact: number; // -1 to 1, negative = worse, positive = better
  leadTimeImpact: number; // days added/subtracted
  description: string;
  sustainability: "standard" | "eco-friendly" | "recycled";
}

/**
 * Simulated materials database with alternatives
 */
const MATERIALS_DATABASE: Record<string, MaterialOption[]> = {
  leather: [
    {
      id: "premium-leather",
      name: "Premium Full-Grain Leather",
      category: "leather",
      costMultiplier: 1.0,
      qualityImpact: 0,
      leadTimeImpact: 0,
      description: "Standard premium leather for high-end footwear",
      sustainability: "standard",
    },
    {
      id: "synthetic-leather",
      name: "High-Quality Synthetic Leather",
      category: "leather",
      costMultiplier: 0.7,
      qualityImpact: -0.1,
      leadTimeImpact: -5,
      description: "Durable synthetic alternative, 30% cost savings",
      sustainability: "eco-friendly",
    },
    {
      id: "recycled-leather",
      name: "Recycled Bonded Leather",
      category: "leather",
      costMultiplier: 0.75,
      qualityImpact: -0.15,
      leadTimeImpact: 0,
      description: "Made from leather scraps, eco-conscious choice",
      sustainability: "recycled",
    },
    {
      id: "vegan-leather",
      name: "Plant-Based Vegan Leather",
      category: "leather",
      costMultiplier: 0.85,
      qualityImpact: -0.05,
      leadTimeImpact: 3,
      description: "Apple or pineapple-based leather alternative",
      sustainability: "eco-friendly",
    },
  ],
  rubber: [
    {
      id: "natural-rubber",
      name: "Natural Rubber Sole",
      category: "rubber",
      costMultiplier: 1.0,
      qualityImpact: 0,
      leadTimeImpact: 0,
      description: "Premium natural rubber for outsoles",
      sustainability: "standard",
    },
    {
      id: "recycled-rubber",
      name: "Recycled Rubber Blend",
      category: "rubber",
      costMultiplier: 0.85,
      qualityImpact: -0.05,
      leadTimeImpact: -3,
      description: "Contains 40% recycled tire rubber, 15% cost savings",
      sustainability: "recycled",
    },
    {
      id: "eva-foam-rubber",
      name: "EVA/Rubber Composite",
      category: "rubber",
      costMultiplier: 0.8,
      qualityImpact: 0,
      leadTimeImpact: -2,
      description: "Lighter weight, good durability, 20% cost savings",
      sustainability: "standard",
    },
  ],
  mesh: [
    {
      id: "engineered-mesh",
      name: "Engineered Mesh",
      category: "mesh",
      costMultiplier: 1.0,
      qualityImpact: 0,
      leadTimeImpact: 0,
      description: "Premium breathable engineered mesh upper",
      sustainability: "standard",
    },
    {
      id: "recycled-mesh",
      name: "Recycled Polyester Mesh",
      category: "mesh",
      costMultiplier: 0.9,
      qualityImpact: -0.03,
      leadTimeImpact: 0,
      description: "Made from recycled plastic bottles",
      sustainability: "recycled",
    },
    {
      id: "budget-mesh",
      name: "Standard Nylon Mesh",
      category: "mesh",
      costMultiplier: 0.75,
      qualityImpact: -0.1,
      leadTimeImpact: -2,
      description: "Basic breathable mesh, 25% cost savings",
      sustainability: "standard",
    },
  ],
  foam: [
    {
      id: "premium-eva",
      name: "Premium EVA Midsole",
      category: "foam",
      costMultiplier: 1.0,
      qualityImpact: 0,
      leadTimeImpact: 0,
      description: "High-quality EVA foam cushioning",
      sustainability: "standard",
    },
    {
      id: "bio-eva",
      name: "Bio-Based EVA Foam",
      category: "foam",
      costMultiplier: 1.1,
      qualityImpact: 0.05,
      leadTimeImpact: 2,
      description: "Sugarcane-derived EVA, premium eco option",
      sustainability: "eco-friendly",
    },
    {
      id: "standard-eva",
      name: "Standard EVA Foam",
      category: "foam",
      costMultiplier: 0.85,
      qualityImpact: -0.08,
      leadTimeImpact: 0,
      description: "Basic EVA cushioning, 15% cost savings",
      sustainability: "standard",
    },
  ],
  laces: [
    {
      id: "premium-laces",
      name: "Premium Waxed Laces",
      category: "laces",
      costMultiplier: 1.0,
      qualityImpact: 0,
      leadTimeImpact: 0,
      description: "Durable waxed flat laces",
      sustainability: "standard",
    },
    {
      id: "recycled-laces",
      name: "Recycled Polyester Laces",
      category: "laces",
      costMultiplier: 0.9,
      qualityImpact: 0,
      leadTimeImpact: 0,
      description: "Made from recycled materials",
      sustainability: "recycled",
    },
  ],
  hardware: [
    {
      id: "metal-eyelets",
      name: "Metal Eyelets",
      category: "hardware",
      costMultiplier: 1.0,
      qualityImpact: 0,
      leadTimeImpact: 0,
      description: "Standard metal eyelets and hardware",
      sustainability: "standard",
    },
    {
      id: "plastic-eyelets",
      name: "Reinforced Plastic Eyelets",
      category: "hardware",
      costMultiplier: 0.7,
      qualityImpact: -0.1,
      leadTimeImpact: -1,
      description: "Durable plastic alternative, 30% cost savings",
      sustainability: "standard",
    },
  ],
};

/**
 * Material substitution suggestion output
 */
const suggestionSchema = z.object({
  originalMaterial: z.string(),
  suggestedMaterial: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    costMultiplier: z.number(),
    qualityImpact: z.number(),
    leadTimeImpact: z.number(),
    description: z.string(),
    sustainability: z.string(),
  }),
  estimatedCostSavings: z.string(),
  tradeoffs: z.string(),
  recommendation: z.string(),
});

/**
 * Material Substitution Tool
 * Allows agents to suggest alternative materials for optimization
 */
export const materialSubstitutionTool = createTool({
  id: "suggest-material-substitution",
  description:
    "Suggest alternative materials to reduce cost, improve sustainability, or adjust quality/lead time trade-offs",
  inputSchema: z.object({
    materialCategory: z
      .enum(["leather", "rubber", "mesh", "foam", "laces", "hardware"])
      .describe("Category of material to find substitutes for"),
    optimization: z
      .enum(["cost", "sustainability", "quality", "leadTime"])
      .describe("What to optimize for with the substitution"),
    currentMaterialId: z
      .string()
      .optional()
      .describe("Current material ID if known"),
  }),
  outputSchema: z.object({
    category: z.string(),
    currentMaterial: z.string(),
    suggestions: z.array(suggestionSchema),
    summary: z.string(),
  }),
  execute: async (input) => {
    const materialCategory = input.materialCategory as MaterialCategory;
    const optimization = input.optimization;
    const currentMaterialId = input.currentMaterialId;

    const materials = MATERIALS_DATABASE[materialCategory] || [];
    const currentMaterial =
      materials.find((m) => m.id === currentMaterialId) || materials[0];

    // Filter and sort based on optimization goal
    const suggestions = materials
      .filter((m) => m.id !== currentMaterial?.id)
      .map((material) => {
        const costSavings = (1 - material.costMultiplier) * 100;
        let recommendation = "";

        switch (optimization) {
          case "cost":
            recommendation =
              costSavings > 0
                ? `Saves ${costSavings.toFixed(0)}% on this component`
                : `Costs ${Math.abs(costSavings).toFixed(0)}% more`;
            break;
          case "sustainability":
            recommendation =
              material.sustainability === "recycled"
                ? "Excellent eco-friendly option with recycled content"
                : material.sustainability === "eco-friendly"
                  ? "Good sustainable choice"
                  : "Standard material";
            break;
          case "quality":
            recommendation =
              material.qualityImpact > 0
                ? `Improves quality by ${(material.qualityImpact * 100).toFixed(0)}%`
                : material.qualityImpact < 0
                  ? `Slight quality reduction of ${Math.abs(material.qualityImpact * 100).toFixed(0)}%`
                  : "Maintains same quality level";
            break;
          case "leadTime":
            recommendation =
              material.leadTimeImpact < 0
                ? `Reduces lead time by ${Math.abs(material.leadTimeImpact)} days`
                : material.leadTimeImpact > 0
                  ? `Adds ${material.leadTimeImpact} days to lead time`
                  : "No impact on lead time";
            break;
        }

        const tradeoffs = [];
        if (material.qualityImpact < 0)
          tradeoffs.push(`${Math.abs(material.qualityImpact * 100).toFixed(0)}% quality reduction`);
        if (material.leadTimeImpact > 0)
          tradeoffs.push(`${material.leadTimeImpact} days longer lead time`);
        if (costSavings < 0)
          tradeoffs.push(`${Math.abs(costSavings).toFixed(0)}% cost increase`);

        return {
          originalMaterial: currentMaterial?.name || "Unknown",
          suggestedMaterial: {
            id: material.id,
            name: material.name,
            category: material.category,
            costMultiplier: material.costMultiplier,
            qualityImpact: material.qualityImpact,
            leadTimeImpact: material.leadTimeImpact,
            description: material.description,
            sustainability: material.sustainability,
          },
          estimatedCostSavings:
            costSavings >= 0
              ? `${costSavings.toFixed(0)}% savings`
              : `${Math.abs(costSavings).toFixed(0)}% increase`,
          tradeoffs:
            tradeoffs.length > 0 ? tradeoffs.join(", ") : "No significant tradeoffs",
          recommendation,
        };
      })
      .sort((a, b) => {
        // Sort by optimization criteria
        switch (optimization) {
          case "cost":
            return (
              a.suggestedMaterial.costMultiplier -
              b.suggestedMaterial.costMultiplier
            );
          case "sustainability":
            const sustainOrder = { recycled: 0, "eco-friendly": 1, standard: 2 };
            return (
              sustainOrder[a.suggestedMaterial.sustainability as keyof typeof sustainOrder] -
              sustainOrder[b.suggestedMaterial.sustainability as keyof typeof sustainOrder]
            );
          case "quality":
            return (
              b.suggestedMaterial.qualityImpact -
              a.suggestedMaterial.qualityImpact
            );
          case "leadTime":
            return (
              a.suggestedMaterial.leadTimeImpact -
              b.suggestedMaterial.leadTimeImpact
            );
        }
      });

    const topSuggestion = suggestions[0];
    const summary = topSuggestion
      ? `Best ${optimization} option: ${topSuggestion.suggestedMaterial.name} - ${topSuggestion.recommendation}`
      : `No alternative materials available for ${materialCategory}`;

    return {
      category: materialCategory,
      currentMaterial: currentMaterial?.name || "Unknown",
      suggestions,
      summary,
    };
  },
});

/**
 * Get all materials in a category
 */
export function getMaterialsForCategory(category: MaterialCategory): MaterialOption[] {
  return MATERIALS_DATABASE[category] || [];
}

/**
 * Calculate cost impact of material substitution
 */
export function calculateCostImpact(
  originalCost: number,
  originalMaterialId: string,
  newMaterialId: string,
  category: MaterialCategory
): number {
  const materials = MATERIALS_DATABASE[category];
  const original = materials?.find((m) => m.id === originalMaterialId);
  const newMaterial = materials?.find((m) => m.id === newMaterialId);

  if (!original || !newMaterial) return originalCost;

  const costRatio = newMaterial.costMultiplier / original.costMultiplier;
  return originalCost * costRatio;
}

