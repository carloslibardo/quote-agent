/**
 * Message Persister
 *
 * Handles real-time message persistence to Convex during workflow execution.
 * Enables live UI updates as negotiations progress.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../server/_generated/api";
import type { Id } from "../../server/_generated/dataModel";

/**
 * Configuration for the MessagePersister
 */
export interface MessagePersisterConfig {
  convexUrl: string;
}

/**
 * Message metadata for persistence
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
 * Final offer structure for status updates
 */
export interface FinalOffer {
  products: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    materialSubstitution?: {
      original: string;
      suggested: string;
      savingsPercent: number;
      description: string;
    };
  }>;
  subtotal: number;
  volumeDiscount: number;
  volumeDiscountPercent: number;
  unitPrice: number;
  leadTimeDays: number;
  paymentTerms: string;
}

/**
 * Negotiation status types
 */
export type NegotiationStatus = "active" | "completed" | "impasse";

/**
 * User intervention message structure
 */
export interface UserInterventionMessage {
  content: string;
  timestamp: number;
  messageId: string;
}

/**
 * Callbacks for real-time negotiation updates
 */
export interface NegotiationCallbacks {
  onMessage: (
    negotiationId: string,
    message: {
      sender: "brand" | "supplier" | "user";
      content: string;
      timestamp: number;
      metadata?: MessageMetadata;
    }
  ) => Promise<void>;
  onStatusChange: (
    negotiationId: string,
    status: NegotiationStatus,
    roundCount?: number,
    finalOffer?: FinalOffer
  ) => Promise<void>;
  onOfferReceived?: (
    negotiationId: string,
    offer: {
      supplierId: number;
      avgPrice: number;
      leadTime: number;
      paymentTerms: string;
    }
  ) => Promise<void>;
  getUserInterventions?: (
    negotiationId: string,
    sinceTimestamp: number
  ) => Promise<UserInterventionMessage[]>;
}

/**
 * MessagePersister class for real-time Convex message persistence
 */
export class MessagePersister {
  private client: ConvexHttpClient;

  constructor(config: MessagePersisterConfig) {
    this.client = new ConvexHttpClient(config.convexUrl);
  }

  /**
   * Persist a message to a negotiation
   */
  async persistMessage(
    negotiationId: string,
    sender: "brand" | "supplier" | "user",
    content: string,
    metadata?: MessageMetadata
  ): Promise<string> {
    try {
      const messageId = await this.client.mutation(api.messages.addMessage, {
        negotiationId: negotiationId as Id<"negotiations">,
        sender,
        content,
        metadata: metadata
          ? {
              model: metadata.model,
              toolCalls: metadata.toolCalls,
            }
          : undefined,
      });

      return messageId;
    } catch (error) {
      console.error("Failed to persist message:", error);
      throw error;
    }
  }

  /**
   * Update the status of a negotiation
   */
  async updateNegotiationStatus(
    negotiationId: string,
    status: NegotiationStatus,
    roundCount?: number,
    finalOffer?: FinalOffer
  ): Promise<void> {
    try {
      await this.client.mutation(api.negotiations.updateNegotiation, {
        negotiationId: negotiationId as Id<"negotiations">,
        status,
        roundCount,
        finalOffer: finalOffer
          ? {
              products: finalOffer.products,
              subtotal: finalOffer.subtotal,
              volumeDiscount: finalOffer.volumeDiscount,
              volumeDiscountPercent: finalOffer.volumeDiscountPercent,
              unitPrice: finalOffer.unitPrice,
              leadTimeDays: finalOffer.leadTimeDays,
              paymentTerms: finalOffer.paymentTerms,
            }
          : undefined,
      });
    } catch (error) {
      console.error("Failed to update negotiation status:", error);
      throw error;
    }
  }

  /**
   * Get user intervention messages since a specific timestamp
   */
  async getUserInterventionsSince(
    negotiationId: string,
    sinceTimestamp: number
  ): Promise<UserInterventionMessage[]> {
    try {
      const messages = await this.client.query(api.messages.getMessagesSince, {
        negotiationId: negotiationId as Id<"negotiations">,
        sinceTimestamp,
        sender: "user",
      });

      return messages.map((msg) => ({
        content: msg.content,
        timestamp: msg.timestamp,
        messageId: msg._id,
      }));
    } catch (error) {
      console.error("Failed to get user interventions:", error);
      return [];
    }
  }

  /**
   * Create callbacks for a specific negotiation
   */
  createCallbacks(negotiationId: string): NegotiationCallbacks {
    return {
      onMessage: async (_nId, message) => {
        await this.persistMessage(
          negotiationId,
          message.sender,
          message.content,
          message.metadata
        );
      },
      onStatusChange: async (_nId, status, roundCount, finalOffer) => {
        await this.updateNegotiationStatus(
          negotiationId,
          status,
          roundCount,
          finalOffer
        );
      },
      onOfferReceived: async () => {
        // Offers are tracked as part of messages
        // Could add specific offer tracking here if needed
      },
      getUserInterventions: async (_nId, sinceTimestamp) => {
        return this.getUserInterventionsSince(negotiationId, sinceTimestamp);
      },
    };
  }
}

/**
 * Create a no-op callback set for when persistence is disabled
 */
export function createNoOpCallbacks(): NegotiationCallbacks {
  return {
    onMessage: async () => {},
    onStatusChange: async () => {},
    onOfferReceived: async () => {},
  };
}

