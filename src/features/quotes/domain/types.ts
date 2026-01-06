/**
 * Quote Domain Types
 *
 * Type definitions for the quotes feature.
 */

import type { Id } from "../../../server/_generated/dataModel";

/**
 * Quote status type
 */
export type QuoteStatus = "pending" | "negotiating" | "completed" | "cancelled";

/**
 * Negotiation status type
 */
export type NegotiationStatus = "active" | "completed" | "impasse";

/**
 * Message sender type
 */
export type MessageSender = "brand" | "supplier" | "user";

/**
 * Supplier ID type (1, 2, or 3)
 */
export type SupplierId = 1 | 2 | 3;

/**
 * Product quantity for quotes
 */
export interface ProductQuantity {
  productId: string;
  quantity: number;
}

/**
 * Decision priorities (must sum to 100)
 */
export interface DecisionPriorities {
  quality: number;
  cost: number;
  leadTime: number;
  paymentTerms: number;
}

/**
 * Quote entity
 */
export interface Quote {
  _id: Id<"quotes">;
  userId: string;
  products: ProductQuantity[];
  userNotes?: string;
  decisionPriorities: DecisionPriorities;
  status: QuoteStatus;
  createdAt: number;
  completedAt?: number;
}

/**
 * Material substitution suggestion
 */
export interface MaterialSubstitution {
  original: string;
  suggested: string;
  savings: number;
}

/**
 * Product offer line item
 */
export interface ProductOffer {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  materialSubstitution?: MaterialSubstitution;
}

/**
 * Final offer from a supplier
 */
export interface FinalOffer {
  // Per-product breakdown
  products?: ProductOffer[];
  subtotal?: number;
  volumeDiscount?: number;
  volumeDiscountPercent?: number;
  // Aggregate pricing (always present)
  unitPrice: number;
  leadTimeDays: number;
  paymentTerms: string;
  notes?: string;
}

/**
 * Negotiation entity
 */
export interface Negotiation {
  _id: Id<"negotiations">;
  quoteId: Id<"quotes">;
  supplierId: SupplierId;
  status: NegotiationStatus;
  roundCount: number;
  finalOffer?: FinalOffer;
  createdAt: number;
  completedAt?: number;
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  model?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: string[];
}

/**
 * Message entity
 */
export interface Message {
  _id: Id<"messages">;
  negotiationId: Id<"negotiations">;
  sender: MessageSender;
  content: string;
  timestamp: number;
  metadata?: MessageMetadata;
}

/**
 * Evaluation scores for a supplier
 */
export interface EvaluationScores {
  qualityScore: number;
  costScore: number;
  leadTimeScore: number;
  paymentTermsScore: number;
  totalScore: number;
}

/**
 * Decision entity
 */
export interface Decision {
  _id: Id<"decisions">;
  quoteId: Id<"quotes">;
  selectedSupplierId: SupplierId;
  reasoning: string;
  evaluationScores: {
    supplier1: EvaluationScores;
    supplier2: EvaluationScores;
    supplier3: EvaluationScores;
  };
  createdAt: number;
}

/**
 * Negotiation with messages (denormalized for UI)
 */
export interface NegotiationWithMessages extends Negotiation {
  messages: Message[];
}

/**
 * Quote with all related data (denormalized for UI)
 */
export interface QuoteWithDetails extends Quote {
  negotiations: NegotiationWithMessages[];
  decision?: Decision;
}

/**
 * Supplier info for display
 */
export interface SupplierInfo {
  id: SupplierId;
  name: string;
  qualityRating: number;
  pricingStrategy: string;
  leadTimeDays: number;
  paymentTerms: string;
  description: string;
}

/**
 * Create quote form values
 */
export interface CreateQuoteFormValues {
  products: ProductQuantity[];
  userNotes: string;
  decisionPriorities: DecisionPriorities;
}

/**
 * Validate that priorities sum to 100
 */
export function validatePriorities(priorities: DecisionPriorities): boolean {
  const sum =
    priorities.quality +
    priorities.cost +
    priorities.leadTime +
    priorities.paymentTerms;
  return sum === 100;
}

/**
 * Get supplier name by ID
 */
export function getSupplierName(supplierId: SupplierId): string {
  const names: Record<SupplierId, string> = {
    1: "Supplier 1",
    2: "Supplier 2",
    3: "Supplier 3",
  };
  return names[supplierId];
}

/**
 * Get status display label
 */
export function getStatusLabel(status: QuoteStatus | NegotiationStatus): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    negotiating: "Negotiating",
    completed: "Completed",
    cancelled: "Cancelled",
    active: "Active",
    impasse: "Impasse",
  };
  return labels[status] || status;
}

/**
 * Get status color class
 */
export function getStatusColor(status: QuoteStatus | NegotiationStatus): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    negotiating: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
    active: "bg-blue-100 text-blue-800",
    impasse: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

