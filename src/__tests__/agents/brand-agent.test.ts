/**
 * Brand Agent Unit Tests
 *
 * Tests for the brand negotiation agent behavior, instructions, and tool usage.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  brandAgent,
  createBrandAgentWithContext,
  buildBrandAgentInstructions,
  SUPPLIER_CHARACTERISTICS,
  type BrandAgentContext,
} from "../../mastra/agents/brand-agent";

describe("Brand Agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Agent Configuration", () => {
    it("should have correct agent ID", () => {
      expect(brandAgent.id).toBe("brand-negotiation-agent");
    });

    it("should have correct agent name", () => {
      expect(brandAgent.name).toBe("Brand Negotiation Agent");
    });

    it("should create agent instance successfully", () => {
      expect(brandAgent).toBeDefined();
      expect(brandAgent.id).toBeTruthy();
      expect(brandAgent.name).toBeTruthy();
    });
  });

  describe("createBrandAgentWithContext", () => {
    it("should create agent with custom priorities", () => {
      const context: BrandAgentContext = {
        priorities: { quality: 50, cost: 20, leadTime: 20, paymentTerms: 10 },
      };

      const agent = createBrandAgentWithContext(context);

      expect(agent.id).toBe("brand-negotiation-agent");
      // Verify the agent is created successfully
      expect(agent).toBeDefined();
    });

    it("should create agent with user notes", () => {
      const context: BrandAgentContext = {
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
        userNotes: "Focus on eco-friendly materials only",
      };

      const agent = createBrandAgentWithContext(context);

      // Verify agent creation with user notes
      expect(agent).toBeDefined();
      expect(agent.id).toBe("brand-negotiation-agent");
    });

    it("should create agent with product information", () => {
      const context: BrandAgentContext = {
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
        products: [
          { productId: "FSH013", quantity: 5000 },
          { productId: "FSH014", quantity: 3000 },
        ],
      };

      const agent = createBrandAgentWithContext(context);

      expect(agent).toBeDefined();
      expect(agent.id).toBe("brand-negotiation-agent");
    });

    it("should create agent with current supplier ID", () => {
      const context: BrandAgentContext = {
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
        currentSupplierId: 2,
      };

      const agent = createBrandAgentWithContext(context);

      expect(agent).toBeDefined();
      expect(agent.id).toBe("brand-negotiation-agent");
    });

    it("should create agent with user guidance", () => {
      const context: BrandAgentContext = {
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
        userGuidance: {
          summary: "Push harder on price",
          interventions: [
            {
              content: "Push harder on price",
              timestamp: Date.now(),
              messageId: "msg-1",
            },
          ],
          hasUrgentRequest: false,
        },
      };

      const agent = createBrandAgentWithContext(context);

      expect(agent).toBeDefined();
    });

    it("should create agent with urgent user guidance", () => {
      const context: BrandAgentContext = {
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
        userGuidance: {
          summary: "URGENT: Stop negotiating immediately",
          interventions: [],
          hasUrgentRequest: true,
        },
      };

      const agent = createBrandAgentWithContext(context);

      expect(agent).toBeDefined();
    });
  });

  describe("buildBrandAgentInstructions", () => {
    it("should highlight high-priority quality", () => {
      const instructions = buildBrandAgentInstructions({
        priorities: { quality: 45, cost: 20, leadTime: 20, paymentTerms: 15 },
      });

      expect(instructions).toContain("Quality is highly important (45%)");
    });

    it("should highlight high-priority cost", () => {
      const instructions = buildBrandAgentInstructions({
        priorities: { quality: 20, cost: 50, leadTime: 20, paymentTerms: 10 },
      });

      expect(instructions).toContain("Cost is highly important (50%)");
    });

    it("should describe moderate priority", () => {
      const instructions = buildBrandAgentInstructions({
        priorities: { quality: 30, cost: 30, leadTime: 25, paymentTerms: 15 },
      });

      expect(instructions).toContain("Quality is moderately important (30%)");
      expect(instructions).toContain("Cost is moderately important (30%)");
    });

    it("should include all supplier characteristics", () => {
      const instructions = buildBrandAgentInstructions({
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
      });

      expect(instructions).toContain("Supplier 1");
      expect(instructions).toContain("Supplier 2");
      expect(instructions).toContain("Supplier 3");
      expect(instructions).toContain("4.7/5"); // Supplier 2 quality
      expect(instructions).toContain("15 days"); // Supplier 3 lead time
    });

    it("should include tool usage guidelines", () => {
      const instructions = buildBrandAgentInstructions({
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
      });

      expect(instructions).toContain("Tool Usage Guidelines");
      expect(instructions).toContain("propose-offer");
      expect(instructions).toContain("counter-offer");
      expect(instructions).toContain("accept-offer");
      expect(instructions).toContain("reject-offer");
      expect(instructions).toContain("MUST use tools");
    });

    it("should handle products with zero quantity", () => {
      const instructions = buildBrandAgentInstructions({
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
        products: [
          { productId: "FSH013", quantity: 5000 },
          { productId: "FSH014", quantity: 0 },
        ],
      });

      expect(instructions).toContain("FSH013: 5,000 units");
      expect(instructions).not.toContain("FSH014: 0");
    });

    it("should include user notes in instructions", () => {
      const instructions = buildBrandAgentInstructions({
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
        userNotes: "Focus on eco-friendly materials only",
      });

      expect(instructions).toContain("Focus on eco-friendly materials only");
      expect(instructions).toContain("Additional Guidance from User");
    });

    it("should include current supplier info when provided", () => {
      const instructions = buildBrandAgentInstructions({
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
        currentSupplierId: 2,
      });

      expect(instructions).toContain("Currently Negotiating With");
      expect(instructions).toContain("Supplier 2");
      expect(instructions).toContain("Highest quality supplier");
    });

    it("should include user guidance when provided", () => {
      const instructions = buildBrandAgentInstructions({
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
        userGuidance: {
          summary: "Push harder on price, consider other suppliers",
          interventions: [],
          hasUrgentRequest: false,
        },
      });

      expect(instructions).toContain("Push harder on price");
      expect(instructions).toContain("Consider the above guidance");
    });

    it("should flag urgent user guidance", () => {
      const instructions = buildBrandAgentInstructions({
        priorities: { quality: 25, cost: 25, leadTime: 25, paymentTerms: 25 },
        userGuidance: {
          summary: "URGENT: Stop negotiating immediately",
          interventions: [],
          hasUrgentRequest: true,
        },
      });

      expect(instructions).toContain("CRITICAL");
      expect(instructions).toContain("urgent");
    });
  });

  describe("SUPPLIER_CHARACTERISTICS", () => {
    it("should define characteristics for all 3 suppliers", () => {
      expect(SUPPLIER_CHARACTERISTICS[1]).toBeDefined();
      expect(SUPPLIER_CHARACTERISTICS[2]).toBeDefined();
      expect(SUPPLIER_CHARACTERISTICS[3]).toBeDefined();
    });

    it("should have correct quality ratings", () => {
      expect(SUPPLIER_CHARACTERISTICS[1].qualityRating).toBe(4.0);
      expect(SUPPLIER_CHARACTERISTICS[2].qualityRating).toBe(4.7);
      expect(SUPPLIER_CHARACTERISTICS[3].qualityRating).toBe(4.0);
    });

    it("should have correct pricing strategies", () => {
      expect(SUPPLIER_CHARACTERISTICS[1].pricingStrategy).toBe("Cheapest");
      expect(SUPPLIER_CHARACTERISTICS[2].pricingStrategy).toBe("Premium");
      expect(SUPPLIER_CHARACTERISTICS[3].pricingStrategy).toBe("Expensive");
    });

    it("should have correct lead times", () => {
      expect(SUPPLIER_CHARACTERISTICS[1].leadTimeDays).toBe(45);
      expect(SUPPLIER_CHARACTERISTICS[2].leadTimeDays).toBe(25);
      expect(SUPPLIER_CHARACTERISTICS[3].leadTimeDays).toBe(15);
    });
  });
});
