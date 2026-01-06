/**
 * Convex Storage Adapter for Mastra
 *
 * Bridges Mastra's storage interface with Convex database
 * for persisting agent conversations and message history.
 */

import type { ConvexClient } from "convex/browser";
import type { Id } from "../../server/_generated/dataModel";

/**
 * Message structure for storage
 */
export interface StoredMessage {
  id: string;
  negotiationId: string;
  sender: "brand" | "supplier" | "user";
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    toolCalls?: string[];
  };
}

/**
 * Mastra-compatible message format
 */
export interface MastraMessage {
  role: "user" | "assistant" | "system";
  content: string;
  id?: string;
  createdAt?: Date;
}

/**
 * ConvexStorageAdapter Configuration
 */
export interface ConvexStorageAdapterConfig {
  client: ConvexClient;
}

/**
 * Convex Storage Adapter
 *
 * Implements storage operations for Mastra using Convex backend
 */
export class ConvexStorageAdapter {
  private client: ConvexClient;

  constructor(config: ConvexStorageAdapterConfig) {
    this.client = config.client;
  }

  /**
   * Save a message to Convex
   */
  async saveMessage(
    negotiationId: string,
    message: {
      sender: "brand" | "supplier" | "user";
      content: string;
      metadata?: StoredMessage["metadata"];
    }
  ): Promise<string> {
    // Import the mutation dynamically to avoid circular dependencies
    const { api } = await import("../../server/_generated/api");

    const messageId = await this.client.mutation(api.messages.create, {
      negotiationId: negotiationId as Id<"negotiations">,
      sender: message.sender,
      content: message.content,
      metadata: message.metadata,
    });

    return messageId;
  }

  /**
   * Get all messages for a negotiation
   */
  async getMessages(negotiationId: string): Promise<StoredMessage[]> {
    const { api } = await import("../../server/_generated/api");

    const messages = await this.client.query(api.messages.getByNegotiation, {
      negotiationId: negotiationId as Id<"negotiations">,
    });

    return messages.map((msg) => ({
      id: msg._id,
      negotiationId: msg.negotiationId,
      sender: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp,
      metadata: msg.metadata,
    }));
  }

  /**
   * Clear all messages for a negotiation
   */
  async clearMessages(negotiationId: string): Promise<number> {
    const { api } = await import("../../server/_generated/api");

    const result = await this.client.mutation(api.messages.deleteByNegotiation, {
      negotiationId: negotiationId as Id<"negotiations">,
    });

    return result.deleted;
  }

  /**
   * Convert stored messages to Mastra format
   */
  toMastraMessages(messages: StoredMessage[]): MastraMessage[] {
    return messages.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.content,
      id: msg.id,
      createdAt: new Date(msg.timestamp),
    }));
  }

  /**
   * Convert Mastra message to storage format
   */
  fromMastraMessage(
    mastraMessage: MastraMessage,
    negotiationId: string,
    sender: "brand" | "supplier" | "user"
  ): Omit<StoredMessage, "id"> {
    return {
      negotiationId,
      sender,
      content: mastraMessage.content,
      timestamp: mastraMessage.createdAt?.getTime() ?? Date.now(),
    };
  }

  /**
   * Get conversation history for an agent
   *
   * Returns messages formatted for Mastra agent context
   */
  async getConversationHistory(
    negotiationId: string
  ): Promise<MastraMessage[]> {
    const messages = await this.getMessages(negotiationId);
    return this.toMastraMessages(messages);
  }

  /**
   * Append a message to conversation history
   */
  async appendMessage(
    negotiationId: string,
    _role: "user" | "assistant",
    content: string,
    sender: "brand" | "supplier" | "user"
  ): Promise<string> {
    return this.saveMessage(negotiationId, {
      sender,
      content,
    });
  }

  /**
   * Get the last N messages from a negotiation
   */
  async getRecentMessages(
    negotiationId: string,
    limit: number
  ): Promise<StoredMessage[]> {
    const { api } = await import("../../server/_generated/api");

    const messages = await this.client.query(api.messages.getLatestMessages, {
      negotiationId: negotiationId as Id<"negotiations">,
      limit,
    });

    return messages.map((msg) => ({
      id: msg._id,
      negotiationId: msg.negotiationId,
      sender: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp,
      metadata: msg.metadata,
    }));
  }
}

/**
 * Factory function to create storage adapter
 */
export function createConvexStorageAdapter(
  client: ConvexClient
): ConvexStorageAdapter {
  return new ConvexStorageAdapter({ client });
}

