/**
 * Supplier Agent Factory
 *
 * Creates AI agents simulating supplier sales representatives.
 * Each supplier has distinct characteristics affecting their negotiation behavior.
 */

import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

import {
  acceptOfferTool,
  counterOfferTool,
  proposeTool,
  rejectOfferTool,
} from "../tools/negotiation-tools";

/**
 * Supplier ID type (1, 2, or 3)
 */
export type SupplierId = 1 | 2 | 3 | 4;

/**
 * Supplier characteristics configuration
 */
export interface SupplierCharacteristics {
  name: string;
  qualityRating: number;
  pricingStrategy: "Cheapest" | "Premium" | "Expensive";
  basePriceMultiplier: number;
  leadTimeDays: number;
  paymentTerms: string;
  description: string;
  negotiationFlexibility: {
    priceFlexibility: number; // 0-1, how much they can reduce price
    leadTimeFlexibility: number; // 0-1, how much they can reduce lead time
    paymentFlexibility: boolean; // whether they can adjust payment terms
  };
  strengths: string[];
  limitations: string[];
}

/**
 * Supplier characteristics database
 */
export const SUPPLIER_CHARACTERISTICS: Record<
  SupplierId,
  SupplierCharacteristics
> = {
  1: {
    name: "Supplier 1",
    qualityRating: 4.0,
    pricingStrategy: "Cheapest",
    basePriceMultiplier: 1.0,
    leadTimeDays: 45,
    paymentTerms: "33/33/33",
    description: "Budget-friendly supplier with reliable medium quality",
    negotiationFlexibility: {
      priceFlexibility: 0.15, // Can reduce up to 15% (increased from 10% for deal closure)
      leadTimeFlexibility: 0.15, // Can reduce up to 15% on lead time
      paymentFlexibility: true,
    },
    strengths: [
      "Lowest base prices",
      "Flexible payment terms (33/33/33 split)",
      "Reliable consistent quality",
      "Large production capacity",
    ],
    limitations: [
      "Slower delivery times",
      "Limited rush order capability",
      "Medium quality only",
    ],
  },
  2: {
    name: "Supplier 2",
    qualityRating: 4.7,
    pricingStrategy: "Premium",
    basePriceMultiplier: 1.35,
    leadTimeDays: 25,
    paymentTerms: "30/70",
    description: "Premium quality supplier for high-end products",
    negotiationFlexibility: {
      priceFlexibility: 0.12, // Can reduce up to 12% (increased from 8% for deal closure)
      leadTimeFlexibility: 0.2, // More flexible on timing
      paymentFlexibility: false, // Strict payment terms
    },
    strengths: [
      "Highest quality rating (4.7/5)",
      "Premium materials and craftsmanship",
      "Medium-fast delivery",
      "Excellent reputation",
    ],
    limitations: [
      "Higher prices",
      "Less flexible on payment terms",
      "Premium positioning non-negotiable",
    ],
  },
  3: {
    name: "Supplier 3",
    qualityRating: 4.0,
    pricingStrategy: "Expensive",
    basePriceMultiplier: 1.25,
    leadTimeDays: 15,
    paymentTerms: "30/70",
    description: "Speed-focused supplier for urgent orders",
    negotiationFlexibility: {
      priceFlexibility: 0.18, // Increased flexibility (from 12% to 18% for deal closure)
      leadTimeFlexibility: 0.1, // Already fast, less room to improve
      paymentFlexibility: true,
    },
    strengths: [
      "Fastest delivery (15 days)",
      "Rush order specialists",
      "Reliable on-time performance",
      "Good for urgent restocks",
    ],
    limitations: [
      "Higher prices for speed premium",
      "Medium quality level",
      "Capacity constraints for very large orders",
    ],
  },
  4: {
    name: "Supplier 4",
    qualityRating: 4.3,
    pricingStrategy: "Premium",
    basePriceMultiplier: 1.4,
    leadTimeDays: 30,
    paymentTerms: "50/50",
    description:
      "Deal-oriented supplier focused on building long-term partnerships",
    negotiationFlexibility: {
      priceFlexibility: 0.35, // Highly flexible - can reduce up to 35%
      leadTimeFlexibility: 0.25, // Can reduce up to 25% on lead time
      paymentFlexibility: true,
    },
    strengths: [
      "Extremely flexible on pricing",
      "High quality at negotiable rates (4.3/5)",
      "Partnership-focused approach",
      "Balanced lead times (30 days)",
      "Flexible 50/50 payment terms",
      "Volume discounts stack with negotiated prices",
    ],
    limitations: [
      "Initial quotes are high (expects negotiation)",
      "May require commitment to future orders",
      "Quality varies slightly with aggressive pricing",
    ],
  },
};

/**
 * Build supplier agent instructions based on characteristics
 */
function buildSupplierInstructions(supplierId: SupplierId): string {
  const supplier = SUPPLIER_CHARACTERISTICS[supplierId];

  // Supplier-specific negotiation strategy
  let negotiationStrategy = "";
  switch (supplierId) {
    case 1:
      negotiationStrategy = `
## Your Negotiation Strategy (Value-Focused)
- Lead with your competitive pricing advantage
- Emphasize volume discounts for larger orders
- Highlight the favorable 33/33/33 payment structure
- Be willing to discuss payment terms flexibility
- Proactively suggest material substitutions to reduce costs further
- Aim for 5-15% cost reductions through material optimization`;
      break;
    case 2:
      negotiationStrategy = `
## Your Negotiation Strategy (Quality-Focused)
- Defend your premium pricing with quality arguments
- Emphasize your 4.7/5 quality rating and reputation
- Only suggest substitutions when quality is maintained or improved
- Be conservative - prefer "none" or "minor" quality impact options
- Offer lead time improvements rather than price cuts
- Payment terms are non-negotiable - redirect to other value`;
      break;
    case 3:
      negotiationStrategy = `
## Your Negotiation Strategy (Speed-Focused)
- Highlight your industry-leading 15-day delivery
- Position speed as a competitive advantage worth paying for
- Suggest substitutions that improve lead time or availability
- Balance cost savings with delivery speed
- Be flexible on payment terms for valued partners
- Emphasize reliability and on-time delivery track record`;
      break;
    case 4:
      negotiationStrategy = `
## Your Negotiation Strategy (Deal-Focused / Highly Flexible)
- Start with premium pricing but be VERY willing to negotiate down
- Your main goal is to WIN the deal - price is your main lever
- Offer aggressive discounts early to show good faith
- Match or beat competitor prices when possible
- Combine volume discounts with negotiated discounts for maximum savings
- Emphasize building a long-term partnership over one-time margins
- Be creative with payment terms - offer custom splits if needed
- Suggest material substitutions proactively to hit buyer's budget
- Counter offers should always move significantly toward buyer's position
- In later rounds, accept almost any reasonable offer to close the deal`;
      break;
  }

  return `You are a sales representative for ${supplier.name}, a footwear manufacturing supplier.

## Your Company Profile
- **Quality Rating**: ${supplier.qualityRating}/5.0
- **Pricing Strategy**: ${supplier.pricingStrategy}
- **Standard Lead Time**: ${supplier.leadTimeDays} days
- **Payment Terms**: ${supplier.paymentTerms}
- **Description**: ${supplier.description}

## Your Strengths
${supplier.strengths.map((s) => `- ${s}`).join("\n")}

## Your Limitations
${supplier.limitations.map((l) => `- ${l}`).join("\n")}

${negotiationStrategy}

## Tool Usage Guidelines - CRITICAL
You MUST use tools to structure your negotiation responses:

1. **propose-offer**: Use for your INITIAL offer to the buyer
   - Include your supplierId (${supplierId})
   - Set unitPrice, leadTimeDays, and paymentTerms
   - Add notes for volume discounts or special conditions

2. **counter-offer**: Use when responding to buyer counter-offers
   - Reference the previous offer ID
   - Explain what you're adjusting and why
   - Stay within your pricing flexibility (max ${Math.round(supplier.negotiationFlexibility.priceFlexibility * 100)}% discount)

3. **accept-offer**: Use when buyer terms are acceptable
   - Confirm the final agreed terms
   - Include a confirmation message

**IMPORTANT:**
- ALWAYS use propose-offer for your initial offer
- ALWAYS include structured pricing data in tool calls
- Your text response should complement the tool call, explaining your reasoning
- Maximum price flexibility: ${Math.round(supplier.negotiationFlexibility.priceFlexibility * 100)}%
- ${supplier.negotiationFlexibility.leadTimeFlexibility > 0.15 ? `Lead time can be reduced up to ${Math.round(supplier.negotiationFlexibility.leadTimeFlexibility * 100)}%` : "Lead times are relatively fixed"}
- **You MUST close deals - be flexible and solution-oriented**
- **Never walk away from negotiations - every deal should close successfully**

## Material Substitution Options
You can suggest material alternatives to reduce costs:
- Synthetic leather instead of premium leather (-20-30% cost)
- Recycled rubber for soles (-10-15% cost)
- Alternative mesh fabrics (-5-10% cost)

When proposing substitutions, be specific about:
- Original material and suggested alternative
- Cost reduction percentage
- Any quality impact (none, minor, moderate, significant)

## Volume Discount Guidelines
- 10,000+ units: 5% discount
- 25,000+ units: 8% discount
- 50,000+ units: 12% discount

## Closing Deals - CRITICAL PRIORITY
- **You MUST reach a deal - every negotiation must end successfully**
- Accept offers that meet reasonable margin requirements
- Be increasingly flexible as negotiations progress
- **In later rounds, prioritize closing the deal over holding firm on terms**
- **If nearing the final round, accept any reasonable offer to close the deal**
- Counter with specific improvements rather than flat rejections
- If negotiations stall, suggest creative solutions (phased delivery, material changes)
- Be professional and solution-oriented at all times
- Remember: A closed deal is always better than no deal`;
}

/**
 * Create a supplier agent for a specific supplier ID
 */
export function createSupplierAgent(supplierId: SupplierId): Agent {
  const supplier = SUPPLIER_CHARACTERISTICS[supplierId];

  return new Agent({
    id: `supplier-${supplierId}-agent`,
    name: supplier.name,
    instructions: buildSupplierInstructions(supplierId),
    model: openai("gpt-4o"),
    tools: {
      proposeTool,
      counterOfferTool,
      acceptOfferTool,
      rejectOfferTool,
    },
  });
}

/**
 * Pre-created supplier agents for convenience
 */
export const supplierAgent1 = createSupplierAgent(1);
export const supplierAgent2 = createSupplierAgent(2);
export const supplierAgent3 = createSupplierAgent(3);
export const supplierAgent4 = createSupplierAgent(4);

/**
 * Get all supplier agents
 */
export function getAllSupplierAgents(): Record<SupplierId, Agent> {
  return {
    1: supplierAgent1,
    2: supplierAgent2,
    3: supplierAgent3,
    4: supplierAgent4,
  };
}

/**
 * Get supplier characteristics by ID
 */
export function getSupplierCharacteristics(
  supplierId: SupplierId
): SupplierCharacteristics {
  return SUPPLIER_CHARACTERISTICS[supplierId];
}
