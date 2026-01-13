/**
 * Brand Negotiation Agent
 *
 * AI agent representing the brand's interests in supplier negotiations.
 * Uses GPT-4o with negotiation tools to conduct professional procurement discussions.
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
 * Supplier characteristics for the brand agent's awareness
 */
export const SUPPLIER_CHARACTERISTICS = {
  1: {
    name: "Supplier 1",
    qualityRating: 4.0,
    pricingStrategy: "Cheapest",
    leadTimeDays: 45,
    paymentTerms: "33/33/33",
    description:
      "Medium quality with lowest prices. Slower delivery but favorable payment split.",
  },
  2: {
    name: "Supplier 2",
    qualityRating: 4.7,
    pricingStrategy: "Premium",
    leadTimeDays: 25,
    paymentTerms: "30/70",
    description:
      "Highest quality supplier. Premium pricing with medium-fast delivery.",
  },
  3: {
    name: "Supplier 3",
    qualityRating: 4.0,
    pricingStrategy: "Expensive",
    leadTimeDays: 15,
    paymentTerms: "30/70",
    description:
      "Medium quality with fastest delivery. Higher prices for speed.",
  },
  4: {
    name: "Supplier 4",
    qualityRating: 4.3,
    pricingStrategy: "Negotiable",
    leadTimeDays: 30,
    paymentTerms: "50/50",
    description:
      "Good quality with highly negotiable pricing. Partnership-focused with balanced terms.",
  },
} as const;

/**
 * User guidance for dynamic instruction injection
 */
export interface FormattedGuidance {
  summary: string;
  interventions: Array<{
    content: string;
    timestamp: number;
    messageId: string;
  }>;
  hasUrgentRequest: boolean;
}

/**
 * Context for creating a brand agent
 */
export interface BrandAgentContext {
  priorities: {
    quality: number;
    cost: number;
    leadTime: number;
    paymentTerms: number;
  };
  userNotes?: string;
  products?: Array<{ productId: string; quantity: number }>;
  userGuidance?: FormattedGuidance;
  currentSupplierId?: 1 | 2 | 3 | 4;
}

/**
 * Build dynamic instructions based on user priorities and context
 */
export function buildBrandAgentInstructions(
  context: BrandAgentContext
): string {
  const { priorities, userNotes, products, userGuidance, currentSupplierId } =
    context;

  const priorityDescriptions: string[] = [];
  if (priorities.quality >= 30)
    priorityDescriptions.push(
      `Quality is ${priorities.quality >= 40 ? "highly" : "moderately"} important (${priorities.quality}%)`
    );
  if (priorities.cost >= 30)
    priorityDescriptions.push(
      `Cost is ${priorities.cost >= 40 ? "highly" : "moderately"} important (${priorities.cost}%)`
    );
  if (priorities.leadTime >= 20)
    priorityDescriptions.push(
      `Lead time is important (${priorities.leadTime}%)`
    );
  if (priorities.paymentTerms >= 20)
    priorityDescriptions.push(
      `Payment terms matter (${priorities.paymentTerms}%)`
    );

  const productInfo = products
    ? products
        .filter((p) => p.quantity > 0)
        .map((p) => `${p.productId}: ${p.quantity.toLocaleString()} units`)
        .join(", ")
    : "various products";

  // Build supplier awareness section
  let supplierSection = `## Supplier Information
You are aware of these supplier characteristics:

**Supplier 1** (Quality: 4.0/5)
- Pricing: Cheapest option
- Lead Time: 45 days (slow)
- Payment: 33/33/33 split (favorable cash flow)

**Supplier 2** (Quality: 4.7/5)
- Pricing: Premium pricing
- Lead Time: 25 days (medium-fast)
- Payment: 30/70 (30% upfront, 70% on delivery)

**Supplier 3** (Quality: 4.0/5)
- Pricing: Expensive
- Lead Time: 15 days (fastest)
- Payment: 30/70 (30% upfront, 70% on delivery)

**Supplier 4** (Quality: 4.3/5)
- Pricing: Highly negotiable (starts high but very flexible)
- Lead Time: 30 days (medium)
- Payment: 50/50 split (balanced cash flow)
- Note: Very open to price negotiations - push hard for discounts`;

  if (currentSupplierId) {
    const supplier = SUPPLIER_CHARACTERISTICS[currentSupplierId];
    supplierSection += `

**Currently Negotiating With:** ${supplier.name}
${supplier.description}`;
  }

  // Build user guidance section
  let guidanceSection = "";
  if (userGuidance && userGuidance.summary) {
    guidanceSection = `
---
${userGuidance.summary}
---

${userGuidance.hasUrgentRequest ? "**CRITICAL:** The user has provided urgent instructions. Follow them precisely." : "Consider the above guidance when making your next move."}
`;
  }

  return `You are a professional buyer representing a footwear brand in supplier negotiations.

## Your Role
You negotiate on behalf of the brand to secure the best possible deal from suppliers based on the brand's priorities.

## Products Being Sourced
${productInfo}

## User's Priority Weights (out of 100% total)
- Quality: ${priorities.quality}%
- Cost: ${priorities.cost}%
- Lead Time: ${priorities.leadTime}%
- Payment Terms: ${priorities.paymentTerms}%

${priorityDescriptions.length > 0 ? `Key priorities: ${priorityDescriptions.join(". ")}.` : ""}

${userNotes ? `## Additional Guidance from User\n${userNotes}` : ""}

${supplierSection}

## Tool Usage Guidelines - CRITICAL
You MUST use tools to structure your negotiation actions:

1. **propose-offer**: Use when making an initial offer to a supplier
   - Include specific unit price, lead time, and payment terms
   - Add notes for special conditions

2. **counter-offer**: Use when responding to supplier offers with modifications
   - Reference the previous offer ID
   - Explain what you're changing and why
   - Provide your counter terms

3. **accept-offer**: Use when terms are acceptable
   - Include the final agreed terms
   - Do NOT continue negotiating after accepting

**IMPORTANT:** 
- Always include structured offer data in tool calls, not just text descriptions
- Use tools for EVERY negotiation action (propose, counter, accept)
- Your text response should complement the tool call, not replace it
- **You MUST reach a deal - never walk away from negotiations**

## Negotiation Strategy - DEAL CLOSURE FOCUS
1. Open professionally, clearly stating product requirements and quantities
2. Negotiate based on user priorities - push harder on higher-weighted criteria
3. Be willing to make trade-offs that align with priority weights
4. **CRITICAL: You MUST close a deal - every negotiation should end with acceptance**
5. In later rounds, be increasingly flexible to find common ground
6. Accept reasonable offers rather than holding out for perfect terms
7. Always maintain professional, business-appropriate language
8. Consider material substitutions if suggested by suppliers
9. **If nearing the final round, accept the best available offer**

## Decision Making
After all negotiations complete, evaluate offers using weighted scoring:
- Score each criterion 0-100
- Apply priority weights
- Recommend the supplier with highest total score
- Provide clear reasoning for the decision
${guidanceSection}`;
}

/**
 * Default brand agent with base instructions
 * Use createBrandAgentWithContext for dynamic context-aware agent
 */
export const brandAgent = new Agent({
  id: "brand-negotiation-agent",
  name: "Brand Negotiation Agent",
  instructions: buildBrandAgentInstructions({
    priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
  }),
  model: openai("gpt-4o"),
  tools: {
    proposeTool,
    counterOfferTool,
    acceptOfferTool,
    rejectOfferTool,
  },
});

/**
 * Create a brand agent with specific context (priorities, notes, products)
 */
export function createBrandAgentWithContext(
  agentContext: BrandAgentContext
): Agent {
  return new Agent({
    id: "brand-negotiation-agent",
    name: "Brand Negotiation Agent",
    instructions: buildBrandAgentInstructions(agentContext),
    model: openai("gpt-4o"),
    tools: {
      proposeTool,
      counterOfferTool,
      acceptOfferTool,
      rejectOfferTool,
    },
  });
}
