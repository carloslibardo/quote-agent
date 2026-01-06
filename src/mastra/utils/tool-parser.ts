/**
 * Tool Parser Utility
 *
 * Extracts and parses tool calls from agent responses
 * to track actual negotiated offers.
 */

import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

/**
 * Parsed offer structure from tool calls
 */
export interface ParsedOffer {
  unitPrice: number;
  leadTimeDays: number;
  paymentTerms: string;
  notes?: string;
}

/**
 * Tool call result structure
 */
export interface ToolCallResult {
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
}

/**
 * Response with optional tool calls
 */
export interface ResponseWithToolCalls {
  text?: string;
  toolCalls?: ToolCallResult[];
}

/**
 * Negotiation outcome status
 */
export type NegotiationOutcome = "accepted" | "rejected" | "impasse" | "ongoing";

/**
 * Offer validation result
 */
export interface OfferValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Offer validation constraints
 */
export interface OfferConstraints {
  minPrice?: number;
  maxPrice?: number;
  maxLeadTime?: number;
  allowedPaymentTerms?: string[];
}

// ============================================================================
// Schemas
// ============================================================================

const parsedOfferSchema = z.object({
  unitPrice: z.number(),
  leadTimeDays: z.number(),
  paymentTerms: z.string(),
  notes: z.string().optional(),
});

// ============================================================================
// Functions
// ============================================================================

/**
 * Extract a specific tool call from agent response
 */
export function extractToolCall(
  response: ResponseWithToolCalls,
  toolName: string
): ToolCallResult | null {
  if (!response.toolCalls || response.toolCalls.length === 0) {
    return null;
  }

  const toolCall = response.toolCalls.find((tc) => tc.toolName === toolName);
  if (!toolCall) return null;

  return toolCall;
}

/**
 * Extract all tool calls from agent response
 */
export function extractAllToolCalls(
  response: ResponseWithToolCalls
): ToolCallResult[] {
  return response.toolCalls ?? [];
}

/**
 * Extract offer from propose-offer or counter-offer tool call
 */
export function extractOfferFromToolCall(
  response: ResponseWithToolCalls
): ParsedOffer | null {
  // Check for propose-offer
  const proposeCall = extractToolCall(response, "propose-offer");
  if (proposeCall?.result?.offer) {
    try {
      return parsedOfferSchema.parse(proposeCall.result.offer);
    } catch {
      // Invalid offer structure, try args instead
      if (proposeCall.args?.offer) {
        try {
          return parsedOfferSchema.parse(proposeCall.args.offer);
        } catch {
          return null;
        }
      }
    }
  }

  // Check for counter-offer
  const counterCall = extractToolCall(response, "counter-offer");
  if (counterCall?.result?.counterOffer) {
    try {
      return parsedOfferSchema.parse(counterCall.result.counterOffer);
    } catch {
      // Try args
      if (counterCall.args?.counterOffer) {
        try {
          return parsedOfferSchema.parse(counterCall.args.counterOffer);
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

/**
 * Extract offer from tool call args (before execution)
 */
export function extractOfferFromArgs(
  response: ResponseWithToolCalls
): ParsedOffer | null {
  // Check propose-offer args
  const proposeCall = extractToolCall(response, "propose-offer");
  if (proposeCall?.args?.offer) {
    try {
      return parsedOfferSchema.parse(proposeCall.args.offer);
    } catch {
      return null;
    }
  }

  // Check counter-offer args
  const counterCall = extractToolCall(response, "counter-offer");
  if (counterCall?.args?.counterOffer) {
    try {
      return parsedOfferSchema.parse(counterCall.args.counterOffer);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Check if negotiation ended with accept or reject
 */
export function extractNegotiationOutcome(response: ResponseWithToolCalls): {
  status: NegotiationOutcome;
  offer?: ParsedOffer;
  reason?: string;
} {
  // Check for accept
  const acceptCall = extractToolCall(response, "accept-offer");
  if (acceptCall) {
    const acceptedTerms = acceptCall.result?.acceptedTerms ?? acceptCall.args?.acceptedTerms;
    return {
      status: "accepted",
      offer: acceptedTerms ? tryParseOffer(acceptedTerms) : undefined,
    };
  }

  // Check for reject
  const rejectCall = extractToolCall(response, "reject-offer");
  if (rejectCall) {
    const isNegotiationEnded = 
      rejectCall.result?.isNegotiationEnded ?? 
      rejectCall.args?.isNegotiationEnded;
    const reason = 
      (rejectCall.result?.reason as string) ?? 
      (rejectCall.args?.reason as string);

    if (isNegotiationEnded) {
      return { status: "impasse", reason };
    }
    return { status: "rejected", reason };
  }

  return { status: "ongoing" };
}

/**
 * Try to parse an unknown value as an offer
 */
function tryParseOffer(value: unknown): ParsedOffer | undefined {
  try {
    return parsedOfferSchema.parse(value);
  } catch {
    return undefined;
  }
}

/**
 * Validate offer is within acceptable bounds
 */
export function validateOffer(
  offer: ParsedOffer,
  constraints: OfferConstraints
): OfferValidationResult {
  const errors: string[] = [];

  if (constraints.minPrice !== undefined && offer.unitPrice < constraints.minPrice) {
    errors.push(
      `Unit price $${offer.unitPrice} below minimum $${constraints.minPrice}`
    );
  }
  if (constraints.maxPrice !== undefined && offer.unitPrice > constraints.maxPrice) {
    errors.push(
      `Unit price $${offer.unitPrice} above maximum $${constraints.maxPrice}`
    );
  }
  if (constraints.maxLeadTime !== undefined && offer.leadTimeDays > constraints.maxLeadTime) {
    errors.push(
      `Lead time ${offer.leadTimeDays} days exceeds maximum ${constraints.maxLeadTime} days`
    );
  }
  if (
    constraints.allowedPaymentTerms &&
    !constraints.allowedPaymentTerms.includes(offer.paymentTerms)
  ) {
    errors.push(
      `Payment terms "${offer.paymentTerms}" not in allowed list: ${constraints.allowedPaymentTerms.join(", ")}`
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if response contains any negotiation tool call
 */
export function hasNegotiationToolCall(response: ResponseWithToolCalls): boolean {
  const toolNames = ["propose-offer", "counter-offer", "accept-offer", "reject-offer"];
  return toolNames.some((name) => extractToolCall(response, name) !== null);
}

/**
 * Get the primary negotiation action from response
 */
export function getPrimaryNegotiationAction(
  response: ResponseWithToolCalls
): "propose" | "counter" | "accept" | "reject" | null {
  if (extractToolCall(response, "accept-offer")) return "accept";
  if (extractToolCall(response, "reject-offer")) return "reject";
  if (extractToolCall(response, "counter-offer")) return "counter";
  if (extractToolCall(response, "propose-offer")) return "propose";
  return null;
}

