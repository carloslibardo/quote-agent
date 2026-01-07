/**
 * Agent Integration Tests
 *
 * Tests for agent interaction, message flow, and workflow integration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  toAgentMessages,
  createInitialMessage,
  createSupplierOfferMessage,
  createBrandRequestMessage,
  fromAgentResponse,
  buildConversationHistory,
  appendUserGuidance,
  type WorkflowMessage,
  type AgentResponse,
} from "../../mastra/utils/message-converter";

describe("Message Converter", () => {
  describe("toAgentMessages", () => {
    it("should convert brand perspective messages correctly", () => {
      const messages: WorkflowMessage[] = [
        { sender: "brand", content: "Hello", timestamp: 1000 },
        { sender: "supplier", content: "Hi there", timestamp: 2000 },
      ];

      const result = toAgentMessages(messages, "brand");

      expect(result[0].role).toBe("assistant"); // brand -> assistant
      expect(result[1].role).toBe("user"); // supplier -> user
    });

    it("should convert supplier perspective messages correctly", () => {
      const messages: WorkflowMessage[] = [
        { sender: "brand", content: "Hello", timestamp: 1000 },
        { sender: "supplier", content: "Hi there", timestamp: 2000 },
      ];

      const result = toAgentMessages(messages, "supplier");

      expect(result[0].role).toBe("user"); // brand -> user
      expect(result[1].role).toBe("assistant"); // supplier -> assistant
    });

    it("should preserve message content", () => {
      const messages: WorkflowMessage[] = [
        { sender: "brand", content: "Test content", timestamp: 1000 },
      ];

      const result = toAgentMessages(messages, "brand");

      expect(result[0].content).toBe("Test content");
    });

    it("should handle empty message array", () => {
      const result = toAgentMessages([], "brand");

      expect(result).toHaveLength(0);
    });
  });

  describe("createInitialMessage", () => {
    it("should include product summary and quantity", () => {
      const message = createInitialMessage(
        "Pulse Pro High-Top (5,000 units)",
        5000,
        { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 }
      );

      expect(message.role).toBe("user");
      expect(message.content).toContain("Pulse Pro High-Top");
      expect(message.content).toContain("5,000");
    });

    it("should highlight cost priority when cost is 30 or above", () => {
      const message = createInitialMessage("Test Product", 1000, {
        quality: 20,
        cost: 40,
        leadTime: 20,
        paymentTerms: 20,
      });

      expect(message.content).toContain("competitive pricing");
    });

    it("should highlight quality priority when quality is 30 or above", () => {
      const message = createInitialMessage("Test Product", 1000, {
        quality: 40,
        cost: 20,
        leadTime: 20,
        paymentTerms: 20,
      });

      expect(message.content).toContain("high quality");
    });

    it("should highlight lead time priority when lead time is 25 or above", () => {
      const message = createInitialMessage("Test Product", 1000, {
        quality: 20,
        cost: 20,
        leadTime: 35,
        paymentTerms: 25,
      });

      expect(message.content).toContain("fast delivery");
    });

    it("should show balanced message when no priorities exceed thresholds", () => {
      // All priorities below their thresholds (cost<30, quality<30, leadTime<25, paymentTerms<20)
      const message = createInitialMessage("Test Product", 1000, {
        quality: 20,
        cost: 20,
        leadTime: 20,
        paymentTerms: 15,
      });

      expect(message.content).toContain("balanced across all criteria");
    });

    it("should combine multiple priority focuses", () => {
      const message = createInitialMessage("Test Product", 1000, {
        quality: 35, // >= 30
        cost: 35, // >= 30
        leadTime: 15,
        paymentTerms: 15,
      });

      expect(message.content).toContain("high quality");
      expect(message.content).toContain("competitive pricing");
    });
  });

  describe("createSupplierOfferMessage", () => {
    it("should include supplier name and offer details", () => {
      const message = createSupplierOfferMessage(
        "ChinaFootwear Co.",
        "Here is our offer",
        { avgPrice: 25.5, leadTime: 30, paymentTerms: "30/70" },
        1,
        4
      );

      expect(message.content).toContain("ChinaFootwear Co.");
      expect(message.content).toContain("$25.50");
      expect(message.content).toContain("30 days");
      expect(message.content).toContain("30/70");
    });

    it("should indicate final round", () => {
      const message = createSupplierOfferMessage(
        "Supplier",
        "Offer",
        { avgPrice: 25, leadTime: 30, paymentTerms: "30/70" },
        3,
        4
      );

      expect(message.content).toContain("final round");
    });

    it("should encourage counter for non-final rounds", () => {
      const message = createSupplierOfferMessage(
        "Supplier",
        "Offer",
        { avgPrice: 25, leadTime: 30, paymentTerms: "30/70" },
        1,
        4
      );

      expect(message.content).toContain("counter");
    });
  });

  describe("createBrandRequestMessage", () => {
    it("should include brand message and product details", () => {
      const message = createBrandRequestMessage(
        "We need 5000 units",
        [{ productName: "Pulse Pro", quantity: 5000, unitPrice: 25 }],
        { percent: 5, description: "Volume Discount: 5%" },
        0,
        3
      );

      expect(message.content).toContain("We need 5000 units");
      expect(message.content).toContain("Pulse Pro");
      expect(message.content).toContain("5,000 units");
    });

    it("should include volume discount when applicable", () => {
      const message = createBrandRequestMessage(
        "Request",
        [{ productName: "Test", quantity: 10000, unitPrice: 20 }],
        { percent: 8, description: "Large Volume: 8% off" },
        0,
        3
      );

      expect(message.content).toContain("Large Volume: 8% off");
    });

    it("should indicate final round", () => {
      const message = createBrandRequestMessage(
        "Request",
        [{ productName: "Test", quantity: 1000, unitPrice: 20 }],
        { percent: 0, description: "" },
        2,
        3
      );

      expect(message.content).toContain("final opportunity");
    });
  });

  describe("fromAgentResponse", () => {
    it("should convert brand response to workflow message", () => {
      const response: AgentResponse = {
        text: "Here is my offer",
        toolCalls: [
          {
            toolName: "propose-offer",
            toolCallId: "call-1",
            args: {},
            result: {},
          },
        ],
      };

      const result = fromAgentResponse(response, "brand");

      expect(result.sender).toBe("brand");
      expect(result.content).toBe("Here is my offer");
      expect(result.metadata?.toolCalls).toContain("propose-offer");
    });

    it("should convert supplier response to workflow message", () => {
      const response: AgentResponse = {
        text: "Thank you for your interest",
      };

      const result = fromAgentResponse(response, "supplier");

      expect(result.sender).toBe("supplier");
      expect(result.content).toBe("Thank you for your interest");
      expect(result.metadata).toBeUndefined(); // No tool calls
    });

    it("should include timestamp", () => {
      const before = Date.now();
      const response: AgentResponse = { text: "Test" };

      const result = fromAgentResponse(response, "brand");
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("buildConversationHistory", () => {
    it("should convert messages with perspective", () => {
      const messages: WorkflowMessage[] = [
        { sender: "brand", content: "Hello", timestamp: 1000 },
        { sender: "supplier", content: "Hi", timestamp: 2000 },
      ];

      const result = buildConversationHistory(messages, "brand");

      expect(result).toHaveLength(2);
    });

    it("should prepend system context when provided", () => {
      const messages: WorkflowMessage[] = [
        { sender: "brand", content: "Hello", timestamp: 1000 },
      ];

      const result = buildConversationHistory(
        messages,
        "brand",
        "System instructions here"
      );

      expect(result[0].role).toBe("system");
      expect(result[0].content).toBe("System instructions here");
      expect(result).toHaveLength(2);
    });
  });

  describe("appendUserGuidance", () => {
    it("should return original messages if no guidance", () => {
      const messages = [{ role: "user" as const, content: "Hello" }];

      const result = appendUserGuidance(messages);

      expect(result).toEqual(messages);
    });

    it("should append guidance as system message", () => {
      const messages = [{ role: "user" as const, content: "Hello" }];

      const result = appendUserGuidance(messages, "Push harder on price");

      expect(result).toHaveLength(2);
      expect(result[1].role).toBe("system");
      expect(result[1].content).toContain("Push harder on price");
    });
  });
});

describe("Agent Response Handling", () => {
  it("should handle response without tool calls", () => {
    const response: AgentResponse = {
      text: "Plain text response",
    };

    const message = fromAgentResponse(response, "brand");

    expect(message.content).toBe("Plain text response");
    expect(message.metadata).toBeUndefined();
  });

  it("should handle response with single tool call", () => {
    const response: AgentResponse = {
      text: "Using a tool",
      toolCalls: [
        {
          toolName: "propose-offer",
          toolCallId: "call-1",
          args: { supplierId: 1 },
        },
      ],
    };

    const message = fromAgentResponse(response, "brand");

    expect(message.metadata?.toolCalls).toContain("propose-offer");
  });

  it("should handle response with multiple tool calls", () => {
    const response: AgentResponse = {
      text: "Multiple tools",
      toolCalls: [
        { toolName: "counter-offer", toolCallId: "call-1", args: {} },
        { toolName: "accept-offer", toolCallId: "call-2", args: {} },
      ],
    };

    const message = fromAgentResponse(response, "supplier");

    expect(message.metadata?.toolCalls).toHaveLength(2);
    expect(message.metadata?.toolCalls).toContain("counter-offer");
    expect(message.metadata?.toolCalls).toContain("accept-offer");
  });
});

describe("Conversation Flow", () => {
  it("should maintain message order in conversation history", () => {
    const messages: WorkflowMessage[] = [
      { sender: "brand", content: "First", timestamp: 1000 },
      { sender: "supplier", content: "Second", timestamp: 2000 },
      { sender: "brand", content: "Third", timestamp: 3000 },
    ];

    const result = toAgentMessages(messages, "brand");

    expect(result[0].content).toBe("First");
    expect(result[1].content).toBe("Second");
    expect(result[2].content).toBe("Third");
  });

  it("should handle user messages correctly", () => {
    const messages: WorkflowMessage[] = [
      { sender: "user", content: "User intervention", timestamp: 1000 },
      { sender: "brand", content: "Acknowledged", timestamp: 2000 },
    ];

    const brandResult = toAgentMessages(messages, "brand");

    // User messages should be treated as "user" role from brand perspective
    expect(brandResult[0].role).toBe("user");
    expect(brandResult[1].role).toBe("assistant");
  });
});
