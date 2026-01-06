/**
 * Negotiation Workflow
 *
 * Mastra workflow that orchestrates dynamic AI-powered negotiations:
 * 1. Load product data and calculate pricing based on quantities
 * 2. Run AI agent negotiations for each supplier using agent.generate()
 * 3. Include material substitution suggestions
 * 4. Evaluate final offers and select winner
 * 5. Generate decision with reasoning
 */

import { createOpenAI } from "@ai-sdk/openai";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { generateText } from "ai";
import { z } from "zod";

import {
  createBrandAgentWithContext,
  type BrandAgentContext,
} from "../agents/brand-agent";
import { createSupplierAgent, type SupplierId } from "../agents/supplier-agent";
import {
  MessagePersister,
  createNoOpCallbacks,
  type FinalOffer,
  type NegotiationCallbacks,
} from "../storage/message-persister";
import {
  createBrandRequestMessage,
  createInitialMessage,
  createSupplierOfferMessage,
  fromAgentResponse,
  type AgentResponse,
  type ToolCallResult,
  type WorkflowMessage,
} from "../utils/message-converter";
import { OfferTracker } from "../utils/offer-tracker";
import {
  extractNegotiationOutcome,
  extractOfferFromToolCall,
  type ParsedOffer,
} from "../utils/tool-parser";
import {
  formatUserGuidance,
  type FormattedGuidance,
} from "../utils/user-guidance";

// Create OpenAI provider instance for fallback
const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get model for fallback - use 'as unknown' to bridge v1/v2 type gap
const getModel = () => openaiProvider("gpt-4o-mini") as unknown;

// ============================================================================
// Product Data
// ============================================================================

// Product data is loaded from the static JSON
const productsData = {
  products: [
    {
      code: "FSH013",
      name: "Pulse Pro High-Top",
      description: "Premium materials with elevated padding.",
      targetFob: 14.49,
      components: [
        {
          type: "material",
          name: "Premium Microfiber PU Leather",
          composition: "100% Polyurethane-coated microfiber",
        },
        {
          type: "material",
          name: "Breathable Knit Mesh Lining",
          composition: "100% Polyester spacer knit",
        },
      ],
    },
    {
      code: "FSH014",
      name: "Drift Aero High-Top",
      description: "Breathable mesh paneling with secure fit.",
      targetFob: 20.75,
      components: [
        { type: "material", name: "Leather", composition: "100% Leather" },
        {
          type: "material",
          name: "Drift Aero AirMesh Upper",
          composition: "85% Polyester, 15% Elastane",
        },
      ],
    },
    {
      code: "FSH016",
      name: "Vibe City High-Top",
      description: "Stylish silhouette with reinforced toe guard.",
      targetFob: 26.13,
      components: [
        {
          type: "material",
          name: "Premium PU Upper",
          composition: "100% Polyurethane (PU) coated fabric",
        },
        {
          type: "material",
          name: "Breathable Nylon Mesh",
          composition: "100% Nylon",
        },
      ],
    },
    {
      code: "FSH019",
      name: "Edge Urban High-Top",
      description: "Durable leather overlays and grippy outsole.",
      targetFob: 51.69,
      components: [
        {
          type: "material",
          name: "Full-Grain Leather Upper",
          composition: "100% Cowhide Leather (Full-Grain)",
        },
        {
          type: "material",
          name: "Nylon Mesh Lining",
          composition: "100% Polyamide Nylon",
        },
      ],
    },
    {
      code: "FSH021",
      name: "City Rise High-Top",
      description:
        "Lightweight city sneaker with padded collar and responsive sole.",
      targetFob: 31.89,
      components: [
        {
          type: "material",
          name: "City Rise Knit Upper",
          composition: "80% Polyester, 20% Elastane",
        },
        {
          type: "component",
          name: "EVA Insole",
          function: "Cushioning and odor control",
        },
      ],
    },
  ],
};

interface ProductComponent {
  type: string;
  name: string;
  composition?: string;
  supplier?: string;
  color?: string;
  code?: string;
  size?: string;
  material?: string;
  weight?: string;
  function?: string;
  position?: string;
  description?: string;
}

interface Product {
  code: string;
  name: string;
  description: string;
  targetFob: number;
  categoryPath?: string;
  components: ProductComponent[];
}

const products: Product[] = productsData.products;

function getProductById(productId: string): Product | undefined {
  return products.find((p) => p.code === productId);
}

// ============================================================================
// Material Substitutions Database
// ============================================================================

const MATERIAL_SUBSTITUTIONS: Record<
  string,
  { suggested: string; savingsPercent: number; description: string }
> = {
  "Full-Grain Leather Upper": {
    suggested: "Premium PU Leather",
    savingsPercent: 35,
    description: "High-quality synthetic that mimics leather look and feel",
  },
  "Premium Microfiber PU Leather": {
    suggested: "Standard PU Leather",
    savingsPercent: 20,
    description: "Cost-effective alternative with similar durability",
  },
  Leather: {
    suggested: "Synthetic Leather Blend",
    savingsPercent: 40,
    description: "Vegan-friendly option with good performance",
  },
  "Premium PU Upper": {
    suggested: "Recycled PU Upper",
    savingsPercent: 15,
    description: "Eco-friendly recycled materials at lower cost",
  },
  "EVA Insole": {
    suggested: "Recycled EVA Insole",
    savingsPercent: 10,
    description: "Sustainable alternative with same cushioning",
  },
};

function findMaterialSubstitution(
  components: ProductComponent[]
): { original: string; suggested: string; savings: number } | null {
  for (const component of components) {
    if (
      component.type === "material" &&
      component.name in MATERIAL_SUBSTITUTIONS
    ) {
      const sub = MATERIAL_SUBSTITUTIONS[component.name];
      return {
        original: component.name,
        suggested: sub.suggested,
        savings: sub.savingsPercent,
      };
    }
  }
  return null;
}

// ============================================================================
// Supplier Data
// ============================================================================

const SUPPLIER_DATA: Record<
  number,
  {
    name: string;
    qualityRating: number;
    marginMultiplier: number;
    leadTimeDays: number;
    paymentTerms: string;
    personality: string;
    priceFlexibility: number;
  }
> = {
  1: {
    name: "ChinaFootwear Co.",
    qualityRating: 4.0,
    marginMultiplier: 1.15,
    leadTimeDays: 45,
    paymentTerms: "33/33/33",
    personality: "Value-focused, emphasizes volume discounts",
    priceFlexibility: 0.1,
  },
  2: {
    name: "VietnamPremium Ltd.",
    qualityRating: 4.7,
    marginMultiplier: 1.45,
    leadTimeDays: 25,
    paymentTerms: "30/70",
    personality: "Quality-focused, defends premium pricing",
    priceFlexibility: 0.08,
  },
  3: {
    name: "IndonesiaExpress",
    qualityRating: 4.0,
    marginMultiplier: 1.3,
    leadTimeDays: 15,
    paymentTerms: "30/70",
    personality: "Speed-focused, highlights fast delivery",
    priceFlexibility: 0.12,
  },
};

// ============================================================================
// Volume Discount Calculation
// ============================================================================

function calculateVolumeDiscount(totalQuantity: number): {
  percent: number;
  description: string;
} {
  if (totalQuantity >= 50000) {
    return { percent: 12, description: "Elite Volume (50K+ units): 12% off" };
  } else if (totalQuantity >= 25000) {
    return { percent: 8, description: "Large Volume (25K+ units): 8% off" };
  } else if (totalQuantity >= 10000) {
    return { percent: 5, description: "Volume Discount (10K+ units): 5% off" };
  }
  return { percent: 0, description: "Standard pricing" };
}

// ============================================================================
// Schemas
// ============================================================================

const workflowInputSchema = z.object({
  quoteId: z.string(),
  userId: z.string().optional(),
  products: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number(),
    })
  ),
  userNotes: z.string().optional(),
  priorities: z.object({
    quality: z.number(),
    cost: z.number(),
    leadTime: z.number(),
    paymentTerms: z.number(),
  }),
  // Optional: Pre-created negotiation IDs for real-time persistence
  negotiationIds: z.array(z.string()).length(3).optional(),
});

const messageSchema = z.object({
  sender: z.enum(["brand", "supplier"]),
  content: z.string(),
  timestamp: z.number(),
});

const productOfferSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
  materialSubstitution: z
    .object({
      original: z.string(),
      suggested: z.string(),
      savings: z.number(),
    })
    .optional(),
});

const offerSchema = z.object({
  products: z.array(productOfferSchema),
  subtotal: z.number(),
  volumeDiscount: z.number(),
  volumeDiscountPercent: z.number(),
  unitPrice: z.number(),
  leadTimeDays: z.number(),
  paymentTerms: z.string(),
});

const negotiationResultSchema = z.object({
  supplierId: z.number(),
  status: z.enum(["completed", "active"]),
  messages: z.array(messageSchema),
  finalOffer: offerSchema,
  roundCount: z.number(),
});

// ============================================================================
// Agent-Based Message Generation
// ============================================================================

/**
 * Generate brand message using brand agent with tools
 */
async function generateBrandAgentMessage(context: {
  supplierId: SupplierId;
  supplierName: string;
  round: number;
  maxRounds: number;
  totalQuantity: number;
  productSummary: string;
  priorities: BrandAgentContext["priorities"];
  products: BrandAgentContext["products"];
  userConstraints: string;
  previousMessages: WorkflowMessage[];
  currentOffer?: { avgPrice: number; leadTime: number; paymentTerms: string };
  userGuidance?: FormattedGuidance;
}): Promise<AgentResponse> {
  // Create brand agent with context (including user guidance if available)
  const brandAgent = createBrandAgentWithContext({
    priorities: context.priorities,
    products: context.products,
    userNotes: context.userConstraints || undefined,
    currentSupplierId: context.supplierId,
    userGuidance: context.userGuidance,
  });

  // Build messages for agent
  let agentMessages;
  if (context.round === 0) {
    // Initial message - prompt agent to start negotiation
    agentMessages = [
      createInitialMessage(
        context.productSummary,
        context.totalQuantity,
        context.priorities
      ),
    ];
  } else if (context.previousMessages.length > 0 && context.currentOffer) {
    // Response to supplier offer
    const lastSupplierMessage = context.previousMessages
      .filter((m) => m.sender === "supplier")
      .pop();

    agentMessages = [
      createSupplierOfferMessage(
        context.supplierName,
        lastSupplierMessage?.content ?? "Awaiting your response.",
        context.currentOffer,
        context.round,
        context.maxRounds
      ),
    ];
  } else {
    // Continue negotiation
    agentMessages = [
      {
        role: "user" as const,
        content: `Continue the negotiation with ${context.supplierName}. Round ${context.round + 1} of ${context.maxRounds}.`,
      },
    ];
  }

  try {
    // Use agent.generate with tool support
    const response = await brandAgent.generate(agentMessages, {
      maxSteps: 2, // Allow tool calls
    });

    // Extract tool calls if available - handle different response formats
    const toolCalls: ToolCallResult[] = [];
    if (response.toolCalls && Array.isArray(response.toolCalls)) {
      for (const tc of response.toolCalls) {
        // Access properties safely - cast through unknown first
        const toolCall = tc as unknown as Record<string, unknown>;
        if (toolCall.toolName && typeof toolCall.toolName === "string") {
          toolCalls.push({
            toolName: toolCall.toolName,
            toolCallId: (toolCall.toolCallId as string) ?? `call-${Date.now()}`,
            args: (toolCall.args as Record<string, unknown>) ?? {},
            result: toolCall.result as Record<string, unknown> | undefined,
          });
        }
      }
    }

    return {
      text: response.text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  } catch (error) {
    // Fallback to simple text generation
    console.warn("Brand agent generation failed, using fallback:", error);
    return {
      text: `We are interested in sourcing ${context.productSummary}. Please provide your best offer for ${context.totalQuantity.toLocaleString()} units.`,
    };
  }
}

/**
 * Generate supplier message using supplier agent with tools
 */
async function generateSupplierAgentMessage(context: {
  supplierId: SupplierId;
  supplierName: string;
  round: number;
  maxRounds: number;
  brandMessage: string;
  productOffers: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    materialSubstitution?: {
      original: string;
      suggested: string;
      savings: number;
    };
  }>;
  avgPrice: number;
  leadTime: number;
  paymentTerms: string;
  volumeDiscount: { percent: number; description: string };
}): Promise<AgentResponse> {
  // Create supplier agent
  const supplierAgent = createSupplierAgent(context.supplierId);

  // Build message for supplier to respond to
  const agentMessages = [
    createBrandRequestMessage(
      context.brandMessage,
      context.productOffers,
      context.volumeDiscount,
      context.round,
      context.maxRounds
    ),
  ];

  try {
    // Use agent.generate with tool support
    const response = await supplierAgent.generate(agentMessages, {
      maxSteps: 2, // Allow tool calls
    });

    // Extract tool calls if available - handle different response formats
    const toolCalls: ToolCallResult[] = [];
    if (response.toolCalls && Array.isArray(response.toolCalls)) {
      for (const tc of response.toolCalls) {
        // Access properties safely - cast through unknown first
        const toolCall = tc as unknown as Record<string, unknown>;
        if (toolCall.toolName && typeof toolCall.toolName === "string") {
          toolCalls.push({
            toolName: toolCall.toolName,
            toolCallId: (toolCall.toolCallId as string) ?? `call-${Date.now()}`,
            args: (toolCall.args as Record<string, unknown>) ?? {},
            result: toolCall.result as Record<string, unknown> | undefined,
          });
        }
      }
    }

    return {
      text: response.text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  } catch (error) {
    // Fallback to simple text generation
    console.warn("Supplier agent generation failed, using fallback:", error);
    const supplier = SUPPLIER_DATA[context.supplierId];
    return {
      text: `Thank you for your inquiry. We at ${supplier.name} can offer $${context.avgPrice.toFixed(2)}/unit with ${context.leadTime}-day delivery and ${context.paymentTerms} payment terms.`,
    };
  }
}

// ============================================================================
// Supplier Negotiation Context
// ============================================================================

interface SupplierNegotiationContext {
  supplierId: SupplierId;
  requestedProducts: Array<{ productId: string; quantity: number }>;
  priorities: {
    quality: number;
    cost: number;
    leadTime: number;
    paymentTerms: number;
  };
  totalQuantity: number;
  productSummary: string;
  userConstraints: string;
  volumeDiscount: { percent: number; description: string };
  negotiationId?: string;
  startTime?: number;
}

/**
 * Run a single supplier negotiation with optional real-time callbacks
 * Isolated function that can run in parallel with other suppliers
 * Includes intelligent impasse detection and offer tracking
 */
async function runSupplierNegotiation(
  context: SupplierNegotiationContext,
  callbacks: NegotiationCallbacks
): Promise<z.infer<typeof negotiationResultSchema>> {
  const {
    supplierId,
    requestedProducts,
    priorities,
    totalQuantity,
    productSummary,
    userConstraints,
    volumeDiscount,
  } = context;
  const supplier = SUPPLIER_DATA[supplierId];
  const messages: z.infer<typeof messageSchema>[] = [];
  const maxRounds = 3 + Math.floor(Math.random() * 2); // 3-4 rounds for variety

  // Initialize offer tracking
  const offerTracker = new OfferTracker(supplierId);

  // Calculate per-product pricing
  const productOffers: z.infer<typeof productOfferSchema>[] = [];

  for (const reqProduct of requestedProducts) {
    if (reqProduct.quantity <= 0) continue;

    const product = getProductById(reqProduct.productId);
    if (!product) continue;

    // Base price = targetFob * supplier margin
    const basePrice = product.targetFob * supplier.marginMultiplier;

    // Find material substitution opportunity
    const materialSub = findMaterialSubstitution(product.components);

    productOffers.push({
      productId: product.code,
      productName: product.name,
      quantity: reqProduct.quantity,
      unitPrice: Math.round(basePrice * 100) / 100,
      lineTotal: Math.round(basePrice * reqProduct.quantity * 100) / 100,
      materialSubstitution: materialSub || undefined,
    });
  }

  // No longer using impasse detection - all negotiations will reach a deal

  // Run negotiation rounds
  let currentDiscount = 0;
  const previousMessages: WorkflowMessage[] = [];
  let negotiationStatus: "active" | "completed" = "active";
  let latestParsedOffer: ParsedOffer | null = null;

  // User intervention tracking
  let lastProcessedTime = context.startTime ?? Date.now();
  let currentUserGuidance: FormattedGuidance | undefined;

  for (
    let round = 0;
    round < maxRounds && negotiationStatus === "active";
    round++
  ) {
    // Check for user interventions before brand turn
    if (context.negotiationId && callbacks.getUserInterventions) {
      try {
        const userInterventions = await callbacks.getUserInterventions(
          context.negotiationId,
          lastProcessedTime
        );

        if (userInterventions.length > 0) {
          // Format interventions for agent consumption
          const newGuidance = formatUserGuidance(
            userInterventions.map((i) => ({
              content: i.content,
              timestamp: i.timestamp,
              messageId: i.messageId,
            }))
          );
          currentUserGuidance = newGuidance;
          lastProcessedTime = Date.now();

          // User guidance is incorporated but won't cause negotiation to end
          // All negotiations must reach a deal
        }
      } catch (error) {
        console.warn("Failed to fetch user interventions:", error);
      }
    }
    // Apply progressive discount based on round
    currentDiscount = Math.min(
      round * supplier.priceFlexibility * 0.5,
      supplier.priceFlexibility
    );

    // Update product prices with current discount
    const roundProductOffers = productOffers.map((p) => ({
      ...p,
      unitPrice: Math.round(p.unitPrice * (1 - currentDiscount) * 100) / 100,
      lineTotal:
        Math.round(p.unitPrice * (1 - currentDiscount) * p.quantity * 100) /
        100,
    }));

    const subtotal = roundProductOffers.reduce(
      (sum, p) => sum + p.lineTotal,
      0
    );
    const discountAmount = subtotal * (volumeDiscount.percent / 100);
    const finalTotal = subtotal - discountAmount;
    const avgPrice = finalTotal / totalQuantity;

    // Generate brand message using agent (with user guidance if available)
    const brandResponse = await generateBrandAgentMessage({
      supplierId,
      supplierName: supplier.name,
      round,
      maxRounds,
      totalQuantity,
      productSummary,
      priorities,
      products: requestedProducts,
      userConstraints,
      previousMessages,
      currentOffer:
        round > 0
          ? {
              avgPrice,
              leadTime: supplier.leadTimeDays,
              paymentTerms: supplier.paymentTerms,
            }
          : undefined,
      userGuidance: currentUserGuidance,
    });

    const brandMessage: z.infer<typeof messageSchema> = {
      sender: "brand",
      content: brandResponse.text,
      timestamp: Date.now() + round * 2000,
    };
    messages.push(brandMessage);
    previousMessages.push(fromAgentResponse(brandResponse, "brand"));

    // Extract and track offer from brand's tool calls
    const brandOffer = extractOfferFromToolCall({
      toolCalls: brandResponse.toolCalls,
    });
    if (brandOffer) {
      offerTracker.addOffer({
        round,
        source: "brand",
        offer: brandOffer,
        toolCallId: brandResponse.toolCalls?.[0]?.toolCallId,
      });
      latestParsedOffer = brandOffer;
    }

    // Check for explicit brand outcome (accept only)
    const brandOutcome = extractNegotiationOutcome({
      toolCalls: brandResponse.toolCalls,
    });
    if (brandOutcome.status === "accepted" && brandOutcome.offer) {
      negotiationStatus = "completed";
      latestParsedOffer = brandOutcome.offer;
      break;
    }
    // Ignore brand rejections - continue negotiating to reach a deal

    // Persist brand message via callback
    if (context.negotiationId) {
      await callbacks.onMessage(context.negotiationId, {
        sender: "brand",
        content: brandResponse.text,
        timestamp: brandMessage.timestamp,
        metadata: brandResponse.toolCalls
          ? { toolCalls: brandResponse.toolCalls.map((tc) => tc.toolName) }
          : undefined,
      });
    }

    // Generate supplier response using agent
    const supplierResponse = await generateSupplierAgentMessage({
      supplierId,
      supplierName: supplier.name,
      round,
      maxRounds,
      brandMessage: brandResponse.text,
      productOffers: roundProductOffers,
      avgPrice,
      leadTime: supplier.leadTimeDays,
      paymentTerms: supplier.paymentTerms,
      volumeDiscount,
    });

    const supplierMessage: z.infer<typeof messageSchema> = {
      sender: "supplier",
      content: supplierResponse.text,
      timestamp: Date.now() + round * 2000 + 1000,
    };
    messages.push(supplierMessage);
    previousMessages.push(fromAgentResponse(supplierResponse, "supplier"));

    // Extract and track offer from supplier's tool calls
    const supplierOffer = extractOfferFromToolCall({
      toolCalls: supplierResponse.toolCalls,
    });
    if (supplierOffer) {
      offerTracker.addOffer({
        round,
        source: "supplier",
        offer: supplierOffer,
        toolCallId: supplierResponse.toolCalls?.[0]?.toolCallId,
      });
      latestParsedOffer = supplierOffer;

      // Notify about offer received
      if (context.negotiationId && callbacks.onOfferReceived) {
        await callbacks.onOfferReceived(context.negotiationId, {
          supplierId,
          avgPrice: supplierOffer.unitPrice,
          leadTime: supplierOffer.leadTimeDays,
          paymentTerms: supplierOffer.paymentTerms,
        });
      }
    } else if (context.negotiationId && callbacks.onOfferReceived) {
      // Fallback to calculated offer if no tool call
      await callbacks.onOfferReceived(context.negotiationId, {
        supplierId,
        avgPrice,
        leadTime: supplier.leadTimeDays,
        paymentTerms: supplier.paymentTerms,
      });
    }

    // Check for explicit supplier outcome (accept only)
    const supplierOutcome = extractNegotiationOutcome({
      toolCalls: supplierResponse.toolCalls,
    });
    if (supplierOutcome.status === "accepted" && supplierOutcome.offer) {
      negotiationStatus = "completed";
      latestParsedOffer = supplierOutcome.offer;
      break;
    }
    // Ignore supplier rejections - continue negotiating to reach a deal

    // Persist supplier message via callback
    if (context.negotiationId) {
      await callbacks.onMessage(context.negotiationId, {
        sender: "supplier",
        content: supplierResponse.text,
        timestamp: supplierMessage.timestamp,
        metadata: supplierResponse.toolCalls
          ? { toolCalls: supplierResponse.toolCalls.map((tc) => tc.toolName) }
          : undefined,
      });
    }

    // No impasse detection - continue negotiating until max rounds or explicit acceptance
  }

  // Handle max rounds reached without agreement - auto-complete with best offer
  if (negotiationStatus === "active") {
    // Auto-complete the deal with the latest offer or calculated offer
    negotiationStatus = "completed";
    // If no explicit offer was captured, use calculated values
    if (!latestParsedOffer) {
      const finalDiscount = currentDiscount;
      const roundProductOffers = productOffers.map((p) => ({
        ...p,
        unitPrice: Math.round(p.unitPrice * (1 - finalDiscount) * 100) / 100,
        lineTotal:
          Math.round(p.unitPrice * (1 - finalDiscount) * p.quantity * 100) /
          100,
      }));
      const subtotal = roundProductOffers.reduce(
        (sum, p) => sum + p.lineTotal,
        0
      );
      const discountAmount = subtotal * (volumeDiscount.percent / 100);
      const finalTotal = subtotal - discountAmount;

      latestParsedOffer = {
        unitPrice: Math.round((finalTotal / totalQuantity) * 100) / 100,
        leadTimeDays: supplier.leadTimeDays,
        paymentTerms: supplier.paymentTerms,
      };
    }
  }

  // Calculate final offer from latest parsed offer or fallback to calculated
  const finalDiscount = currentDiscount;
  const finalProductOffers = productOffers.map((p) => ({
    ...p,
    unitPrice:
      latestParsedOffer?.unitPrice ??
      Math.round(p.unitPrice * (1 - finalDiscount) * 100) / 100,
    lineTotal:
      (latestParsedOffer?.unitPrice ??
        Math.round(p.unitPrice * (1 - finalDiscount) * 100) / 100) * p.quantity,
  }));

  const subtotal = finalProductOffers.reduce((sum, p) => sum + p.lineTotal, 0);
  const discountAmount = subtotal * (volumeDiscount.percent / 100);
  const finalTotal = subtotal - discountAmount;

  const result: z.infer<typeof negotiationResultSchema> = {
    supplierId,
    status: negotiationStatus,
    messages,
    finalOffer: {
      products: finalProductOffers,
      subtotal,
      volumeDiscount: discountAmount,
      volumeDiscountPercent: volumeDiscount.percent,
      unitPrice:
        latestParsedOffer?.unitPrice ??
        Math.round((finalTotal / totalQuantity) * 100) / 100,
      leadTimeDays: latestParsedOffer?.leadTimeDays ?? supplier.leadTimeDays,
      paymentTerms: latestParsedOffer?.paymentTerms ?? supplier.paymentTerms,
    },
    roundCount: Math.ceil(messages.length / 2),
    // No impasse reasons - all negotiations complete successfully
  };

  // Update status via callback - always completed now
  if (context.negotiationId) {
    await callbacks.onStatusChange(
      context.negotiationId,
      "completed",
      result.roundCount,
      result.finalOffer as FinalOffer
    );
  }

  return result;
}

// ============================================================================
// Workflow Steps
// ============================================================================

const runNegotiations = createStep({
  id: "run-negotiations",
  inputSchema: workflowInputSchema,
  outputSchema: z.object({
    quoteId: z.string(),
    priorities: z.object({
      quality: z.number(),
      cost: z.number(),
      leadTime: z.number(),
      paymentTerms: z.number(),
    }),
    negotiations: z.array(negotiationResultSchema),
  }),
  execute: async ({ inputData }) => {
    const {
      quoteId,
      products: requestedProducts,
      priorities,
      userNotes,
      negotiationIds,
    } = inputData;

    // Calculate total quantity
    const totalQuantity = requestedProducts.reduce(
      (sum, p) => sum + p.quantity,
      0
    );
    const volumeDiscount = calculateVolumeDiscount(totalQuantity);

    // Build product summary for messages
    const productSummary = requestedProducts
      .filter((p) => p.quantity > 0)
      .map((p) => {
        const product = getProductById(p.productId);
        return product
          ? `${product.name} (${p.quantity.toLocaleString()} units)`
          : p.productId;
      })
      .join(", ");

    // Parse user constraints
    const userConstraints = userNotes || "";

    // Initialize persister if Convex URL available
    const persister = process.env.CONVEX_URL
      ? new MessagePersister({ convexUrl: process.env.CONVEX_URL })
      : null;

    // Create callbacks for each supplier
    const createCallbacksForSupplier = (
      index: number
    ): NegotiationCallbacks => {
      if (persister && negotiationIds && negotiationIds[index]) {
        return persister.createCallbacks(negotiationIds[index]);
      }
      return createNoOpCallbacks();
    };

    // Build negotiation contexts for each supplier
    const supplierIds: SupplierId[] = [1, 2, 3];
    const contexts: SupplierNegotiationContext[] = supplierIds.map(
      (supplierId, index) => ({
        supplierId,
        requestedProducts,
        priorities,
        totalQuantity,
        productSummary,
        userConstraints,
        volumeDiscount,
        negotiationId: negotiationIds?.[index],
      })
    );

    // Run all three negotiations in parallel
    const negotiations = await Promise.all(
      contexts.map((context, index) =>
        runSupplierNegotiation(context, createCallbacksForSupplier(index))
      )
    );

    return {
      quoteId,
      priorities,
      negotiations,
    };
  },
});

const evaluateOffers = createStep({
  id: "evaluate-offers",
  inputSchema: z.object({
    quoteId: z.string(),
    priorities: z.object({
      quality: z.number(),
      cost: z.number(),
      leadTime: z.number(),
      paymentTerms: z.number(),
    }),
    negotiations: z.array(negotiationResultSchema),
  }),
  outputSchema: z.object({
    quoteId: z.string(),
    priorities: z.object({
      quality: z.number(),
      cost: z.number(),
      leadTime: z.number(),
      paymentTerms: z.number(),
    }),
    negotiations: z.array(negotiationResultSchema),
    scores: z.record(
      z.string(),
      z.object({
        qualityScore: z.number(),
        costScore: z.number(),
        leadTimeScore: z.number(),
        paymentTermsScore: z.number(),
        totalScore: z.number(),
      })
    ),
    winner: z.object({
      supplierId: z.number(),
      totalScore: z.number(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { quoteId, priorities, negotiations } = inputData;

    // All negotiations now have finalOffer since we guarantee deals
    const allPrices = negotiations.map((n) => n.finalOffer.unitPrice);

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);

    const scores: Record<
      string,
      {
        qualityScore: number;
        costScore: number;
        leadTimeScore: number;
        paymentTermsScore: number;
        totalScore: number;
      }
    > = {};

    let winner = { supplierId: 1, totalScore: 0 };

    for (const neg of negotiations) {
      const supplier = SUPPLIER_DATA[neg.supplierId];

      const qualityScore = Math.round(((supplier.qualityRating - 3) / 2) * 100);
      const costScore =
        maxPrice === minPrice
          ? 100
          : Math.round(
              ((maxPrice - neg.finalOffer.unitPrice) / (maxPrice - minPrice)) *
                100
            );
      const leadTimeScore = Math.max(
        0,
        Math.round(((60 - neg.finalOffer.leadTimeDays) / 50) * 100)
      );

      const paymentScores: Record<string, number> = {
        "33/33/33": 100,
        "30/70": 60,
        "50/50": 80,
      };
      const paymentTermsScore =
        paymentScores[neg.finalOffer.paymentTerms] ?? 50;

      const totalScore =
        (qualityScore * priorities.quality +
          costScore * priorities.cost +
          leadTimeScore * priorities.leadTime +
          paymentTermsScore * priorities.paymentTerms) /
        100;

      scores[`supplier${neg.supplierId}`] = {
        qualityScore,
        costScore,
        leadTimeScore,
        paymentTermsScore,
        totalScore: Math.round(totalScore * 100) / 100,
      };

      if (totalScore > winner.totalScore) {
        winner = {
          supplierId: neg.supplierId,
          totalScore: Math.round(totalScore * 100) / 100,
        };
      }
    }

    return { quoteId, priorities, negotiations, scores, winner };
  },
});

/**
 * Build comprehensive supplier comparison data for AI reasoning
 */
function buildSupplierComparisonData(
  negotiations: z.infer<typeof negotiationResultSchema>[],
  scores: Record<
    string,
    {
      qualityScore: number;
      costScore: number;
      leadTimeScore: number;
      paymentTermsScore: number;
      totalScore: number;
    }
  >,
  winnerId: number
): string {
  return negotiations
    .map((n) => {
      const supplier = SUPPLIER_DATA[n.supplierId];
      const supplierScores = scores[`supplier${n.supplierId}`];
      const isWinner = n.supplierId === winnerId;
      return `
**${supplier.name}${isWinner ? " (SELECTED)" : ""}**
- Total Score: ${supplierScores.totalScore.toFixed(1)}/100
- Quality: ${supplier.qualityRating}/5 (score: ${supplierScores.qualityScore}/100)
- Unit Price: $${n.finalOffer.unitPrice.toFixed(2)} (score: ${supplierScores.costScore}/100)
- Lead Time: ${n.finalOffer.leadTimeDays} days (score: ${supplierScores.leadTimeScore}/100)
- Payment: ${n.finalOffer.paymentTerms} (score: ${supplierScores.paymentTermsScore}/100)
- Negotiation Rounds: ${n.roundCount}
- Supplier Personality: ${supplier.personality}`;
    })
    .join("\n");
}

/**
 * Analyze trade-offs for the selected supplier
 */
function analyzeTradeoffs(
  winnerId: number,
  negotiations: z.infer<typeof negotiationResultSchema>[],
  scores: Record<
    string,
    {
      qualityScore: number;
      costScore: number;
      leadTimeScore: number;
      paymentTermsScore: number;
      totalScore: number;
    }
  >
): string {
  const winnerScores = scores[`supplier${winnerId}`];
  const tradeoffs: string[] = [];

  for (const neg of negotiations) {
    if (neg.supplierId === winnerId) continue;

    const otherScores = scores[`supplier${neg.supplierId}`];
    const supplier = SUPPLIER_DATA[neg.supplierId];

    // Find where other supplier was better
    if (otherScores.qualityScore > winnerScores.qualityScore) {
      tradeoffs.push(
        `${supplier.name} had higher quality (${otherScores.qualityScore} vs ${winnerScores.qualityScore})`
      );
    }
    if (otherScores.costScore > winnerScores.costScore) {
      tradeoffs.push(
        `${supplier.name} offered better pricing (score ${otherScores.costScore} vs ${winnerScores.costScore})`
      );
    }
    if (otherScores.leadTimeScore > winnerScores.leadTimeScore) {
      tradeoffs.push(
        `${supplier.name} had faster delivery (score ${otherScores.leadTimeScore} vs ${winnerScores.leadTimeScore})`
      );
    }
    if (otherScores.paymentTermsScore > winnerScores.paymentTermsScore) {
      tradeoffs.push(
        `${supplier.name} offered better payment terms (score ${otherScores.paymentTermsScore} vs ${winnerScores.paymentTermsScore})`
      );
    }
  }

  return tradeoffs.length > 0
    ? `Trade-offs accepted:\n${tradeoffs.map((t) => `- ${t}`).join("\n")}`
    : "No significant trade-offs - winner excelled across all categories.";
}

/**
 * Generate AI-powered decision reasoning
 */
async function generateAIReasoning(context: {
  priorities: {
    quality: number;
    cost: number;
    leadTime: number;
    paymentTerms: number;
  };
  winnerName: string;
  winnerScore: number;
  supplierComparison: string;
  tradeoffs: string;
  winnerOffer: {
    unitPrice: number;
    leadTimeDays: number;
    paymentTerms: string;
    volumeDiscountPercent?: number;
  };
  scoreBreakdown: {
    quality: number;
    cost: number;
    leadTime: number;
    paymentTerms: number;
  };
}): Promise<string> {
  const systemPrompt = `You are an expert procurement analyst providing strategic recommendations. 
Write a comprehensive, insightful decision analysis that helps the buyer understand:
1. WHY this supplier was selected (not just the scores)
2. Strategic implications of this choice
3. Key strengths and potential risks
4. Actionable recommendations

Be specific, use concrete numbers, and provide genuine insights. 
Avoid generic statements. Write in a professional but accessible tone.
Format with markdown headers and bullet points for readability.
Keep the analysis concise but thorough (250-400 words).`;

  const userPrompt = `Analyze this supplier selection decision and provide strategic insights:

**Priority Weights Set by Buyer:**
- Quality: ${context.priorities.quality}%
- Cost: ${context.priorities.cost}%
- Lead Time: ${context.priorities.leadTime}%
- Payment Terms: ${context.priorities.paymentTerms}%

**Selected Supplier:** ${context.winnerName}
**Winning Score:** ${context.winnerScore.toFixed(1)}/100

**Selected Offer Details:**
- Unit Price: $${context.winnerOffer.unitPrice.toFixed(2)}
- Lead Time: ${context.winnerOffer.leadTimeDays} days
- Payment Terms: ${context.winnerOffer.paymentTerms}
${context.winnerOffer.volumeDiscountPercent ? `- Volume Discount Applied: ${context.winnerOffer.volumeDiscountPercent}%` : ""}

**Score Breakdown for Winner:**
- Quality Score: ${context.scoreBreakdown.quality}/100 (weighted ${context.priorities.quality}%)
- Cost Score: ${context.scoreBreakdown.cost}/100 (weighted ${context.priorities.cost}%)
- Lead Time Score: ${context.scoreBreakdown.leadTime}/100 (weighted ${context.priorities.leadTime}%)
- Payment Terms Score: ${context.scoreBreakdown.paymentTerms}/100 (weighted ${context.priorities.paymentTerms}%)

**Comparison with Other Suppliers:**
${context.supplierComparison}

**${context.tradeoffs}**

Provide:
1. Executive Summary (2-3 sentences on why this supplier)
2. Key Decision Drivers (what factors were decisive)
3. Competitive Analysis (how winner compares to alternatives)
4. Risk Considerations (potential concerns to monitor)
5. Strategic Recommendations (next steps and considerations)`;

  try {
    const result = await generateText({
      model: getModel() as Parameters<typeof generateText>[0]["model"],
      system: systemPrompt,
      prompt: userPrompt,
    });

    return result.text;
  } catch {
    // Fallback to template-based reasoning if AI fails
    return `## Decision Analysis: ${context.winnerName}

**Executive Summary:** ${context.winnerName} achieved the highest weighted score of ${context.winnerScore.toFixed(1)}/100, making it the recommended supplier based on your stated priorities.

**Score Breakdown:**
- Quality: ${context.scoreBreakdown.quality}/100 (${context.priorities.quality}% weight)
- Cost: ${context.scoreBreakdown.cost}/100 (${context.priorities.cost}% weight)
- Lead Time: ${context.scoreBreakdown.leadTime}/100 (${context.priorities.leadTime}% weight)
- Payment Terms: ${context.scoreBreakdown.paymentTerms}/100 (${context.priorities.paymentTerms}% weight)

**${context.tradeoffs}**

This selection aligns with your sourcing priorities.`;
  }
}

const generateDecision = createStep({
  id: "generate-decision",
  inputSchema: z.object({
    quoteId: z.string(),
    priorities: z.object({
      quality: z.number(),
      cost: z.number(),
      leadTime: z.number(),
      paymentTerms: z.number(),
    }),
    negotiations: z.array(negotiationResultSchema),
    scores: z.record(
      z.string(),
      z.object({
        qualityScore: z.number(),
        costScore: z.number(),
        leadTimeScore: z.number(),
        paymentTermsScore: z.number(),
        totalScore: z.number(),
      })
    ),
    winner: z.object({
      supplierId: z.number(),
      totalScore: z.number(),
    }),
  }),
  outputSchema: z.object({
    quoteId: z.string(),
    decision: z.object({
      selectedSupplierId: z.number(),
      reasoning: z.string(),
    }),
    negotiations: z.array(
      z.object({
        supplierId: z.number(),
        status: z.string(),
        messages: z.array(messageSchema),
        finalOffer: offerSchema,
        roundCount: z.number(),
      })
    ),
    evaluationScores: z.record(
      z.string(),
      z.object({
        qualityScore: z.number(),
        costScore: z.number(),
        leadTimeScore: z.number(),
        paymentTermsScore: z.number(),
        totalScore: z.number(),
      })
    ),
  }),
  execute: async ({ inputData }) => {
    const { quoteId, priorities, negotiations, scores, winner } = inputData;
    // Add defensive check for winnerScores
    const winnerScores = scores[`supplier${winner.supplierId}`] ?? {
      qualityScore: 50,
      costScore: 50,
      leadTimeScore: 50,
      paymentTermsScore: 50,
      totalScore: 50,
    };
    const winnerNeg = negotiations.find(
      (n) => n.supplierId === winner.supplierId
    );
    const supplier = SUPPLIER_DATA[winner.supplierId];

    // Build comprehensive comparison data
    const supplierComparison = buildSupplierComparisonData(
      negotiations,
      scores,
      winner.supplierId
    );

    // Analyze trade-offs
    const tradeoffs = analyzeTradeoffs(winner.supplierId, negotiations, scores);

    // Generate AI-powered reasoning
    const reasoning = await generateAIReasoning({
      priorities,
      winnerName: supplier.name,
      winnerScore: winner.totalScore,
      supplierComparison,
      tradeoffs,
      winnerOffer: {
        unitPrice: winnerNeg?.finalOffer.unitPrice ?? 0,
        leadTimeDays: winnerNeg?.finalOffer.leadTimeDays ?? 0,
        paymentTerms: winnerNeg?.finalOffer.paymentTerms ?? "",
        volumeDiscountPercent: winnerNeg?.finalOffer.volumeDiscountPercent,
      },
      scoreBreakdown: {
        quality: winnerScores.qualityScore,
        cost: winnerScores.costScore,
        leadTime: winnerScores.leadTimeScore,
        paymentTerms: winnerScores.paymentTermsScore,
      },
    });

    return {
      quoteId,
      decision: {
        selectedSupplierId: winner.supplierId,
        reasoning,
      },
      negotiations: negotiations.map((n) => ({
        supplierId: n.supplierId,
        status: n.status,
        messages: n.messages,
        finalOffer: n.finalOffer,
        roundCount: n.roundCount,
      })),
      evaluationScores: scores,
    };
  },
});

// ============================================================================
// Workflow Definition
// ============================================================================

export const negotiationWorkflow = createWorkflow({
  id: "negotiationWorkflow",
  inputSchema: workflowInputSchema,
  outputSchema: z.object({
    quoteId: z.string(),
    decision: z.object({
      selectedSupplierId: z.number(),
      reasoning: z.string(),
    }),
    negotiations: z.array(
      z.object({
        supplierId: z.number(),
        status: z.string(),
        messages: z.array(messageSchema),
        finalOffer: offerSchema,
        roundCount: z.number(),
      })
    ),
    evaluationScores: z.record(
      z.string(),
      z.object({
        qualityScore: z.number(),
        costScore: z.number(),
        leadTimeScore: z.number(),
        paymentTermsScore: z.number(),
        totalScore: z.number(),
      })
    ),
  }),
})
  .then(runNegotiations)
  .then(evaluateOffers)
  .then(generateDecision)
  .commit();

export const workflowSteps = {
  runNegotiations,
  evaluateOffers,
  generateDecision,
};

// Export functions for testing
export {
  generateBrandAgentMessage,
  generateSupplierAgentMessage,
  runSupplierNegotiation,
};

// Export context type for testing
export type { SupplierNegotiationContext };

// Re-export types under different names to avoid lint errors
export interface NegotiationMessage {
  sender: "brand" | "supplier" | "user";
  content: string;
  timestamp: number;
  metadata?: {
    toolCalls?: string[];
    model?: string;
  };
}

export interface NegotiationToolCallResult {
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export interface NegotiationAgentResponse {
  text: string;
  toolCalls?: NegotiationToolCallResult[];
  messages?: unknown[];
}
