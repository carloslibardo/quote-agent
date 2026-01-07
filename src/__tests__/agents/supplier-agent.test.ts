/**
 * Supplier Agent Unit Tests
 *
 * Tests for the supplier agent factory and individual supplier behaviors.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSupplierAgent,
  SUPPLIER_CHARACTERISTICS,
  getSupplierCharacteristics,
  getAllSupplierAgents,
  supplierAgent1,
  supplierAgent2,
  supplierAgent3,
  type SupplierId,
} from "../../mastra/agents/supplier-agent";

describe("Supplier Agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SUPPLIER_CHARACTERISTICS", () => {
    it("should define all 3 suppliers", () => {
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

    it("should have correct payment terms", () => {
      expect(SUPPLIER_CHARACTERISTICS[1].paymentTerms).toBe("33/33/33");
      expect(SUPPLIER_CHARACTERISTICS[2].paymentTerms).toBe("30/70");
      expect(SUPPLIER_CHARACTERISTICS[3].paymentTerms).toBe("30/70");
    });

    it("should define price flexibility for each supplier", () => {
      expect(SUPPLIER_CHARACTERISTICS[1].negotiationFlexibility.priceFlexibility).toBe(0.1);
      expect(SUPPLIER_CHARACTERISTICS[2].negotiationFlexibility.priceFlexibility).toBe(0.08);
      expect(SUPPLIER_CHARACTERISTICS[3].negotiationFlexibility.priceFlexibility).toBe(0.12);
    });

    it("should define lead time flexibility for each supplier", () => {
      expect(SUPPLIER_CHARACTERISTICS[1].negotiationFlexibility.leadTimeFlexibility).toBe(0.15);
      expect(SUPPLIER_CHARACTERISTICS[2].negotiationFlexibility.leadTimeFlexibility).toBe(0.2);
      expect(SUPPLIER_CHARACTERISTICS[3].negotiationFlexibility.leadTimeFlexibility).toBe(0.1);
    });

    it("should define payment flexibility for each supplier", () => {
      expect(SUPPLIER_CHARACTERISTICS[1].negotiationFlexibility.paymentFlexibility).toBe(true);
      expect(SUPPLIER_CHARACTERISTICS[2].negotiationFlexibility.paymentFlexibility).toBe(false);
      expect(SUPPLIER_CHARACTERISTICS[3].negotiationFlexibility.paymentFlexibility).toBe(true);
    });

    it("should have strengths defined for each supplier", () => {
      expect(SUPPLIER_CHARACTERISTICS[1].strengths.length).toBeGreaterThan(0);
      expect(SUPPLIER_CHARACTERISTICS[2].strengths.length).toBeGreaterThan(0);
      expect(SUPPLIER_CHARACTERISTICS[3].strengths.length).toBeGreaterThan(0);
    });

    it("should have limitations defined for each supplier", () => {
      expect(SUPPLIER_CHARACTERISTICS[1].limitations.length).toBeGreaterThan(0);
      expect(SUPPLIER_CHARACTERISTICS[2].limitations.length).toBeGreaterThan(0);
      expect(SUPPLIER_CHARACTERISTICS[3].limitations.length).toBeGreaterThan(0);
    });
  });

  describe("createSupplierAgent", () => {
    it("should create supplier 1 agent with correct ID", () => {
      const agent = createSupplierAgent(1);

      expect(agent.id).toBe("supplier-1-agent");
      expect(agent.name).toBe("Supplier 1");
    });

    it("should create supplier 2 agent with correct ID", () => {
      const agent = createSupplierAgent(2);

      expect(agent.id).toBe("supplier-2-agent");
      expect(agent.name).toBe("Supplier 2");
    });

    it("should create supplier 3 agent with correct ID", () => {
      const agent = createSupplierAgent(3);

      expect(agent.id).toBe("supplier-3-agent");
      expect(agent.name).toBe("Supplier 3");
    });

    it("should create agents with valid configuration", () => {
      const supplierIds: SupplierId[] = [1, 2, 3];

      for (const id of supplierIds) {
        const agent = createSupplierAgent(id);
        expect(agent).toBeDefined();
        expect(agent.id).toBe(`supplier-${id}-agent`);
      }
    });
  });

  describe("Pre-created Supplier Agents", () => {
    it("should have supplierAgent1 pre-created", () => {
      expect(supplierAgent1).toBeDefined();
      expect(supplierAgent1.id).toBe("supplier-1-agent");
      expect(supplierAgent1.name).toBe("Supplier 1");
    });

    it("should have supplierAgent2 pre-created", () => {
      expect(supplierAgent2).toBeDefined();
      expect(supplierAgent2.id).toBe("supplier-2-agent");
      expect(supplierAgent2.name).toBe("Supplier 2");
    });

    it("should have supplierAgent3 pre-created", () => {
      expect(supplierAgent3).toBeDefined();
      expect(supplierAgent3.id).toBe("supplier-3-agent");
      expect(supplierAgent3.name).toBe("Supplier 3");
    });
  });

  describe("getSupplierCharacteristics", () => {
    it("should return characteristics for supplier 1", () => {
      const chars = getSupplierCharacteristics(1);

      expect(chars.name).toBe("Supplier 1");
      expect(chars.pricingStrategy).toBe("Cheapest");
      expect(chars.qualityRating).toBe(4.0);
    });

    it("should return characteristics for supplier 2", () => {
      const chars = getSupplierCharacteristics(2);

      expect(chars.name).toBe("Supplier 2");
      expect(chars.pricingStrategy).toBe("Premium");
      expect(chars.qualityRating).toBe(4.7);
    });

    it("should return characteristics for supplier 3", () => {
      const chars = getSupplierCharacteristics(3);

      expect(chars.name).toBe("Supplier 3");
      expect(chars.pricingStrategy).toBe("Expensive");
      expect(chars.leadTimeDays).toBe(15);
    });
  });

  describe("getAllSupplierAgents", () => {
    it("should return all 3 supplier agents", () => {
      const agents = getAllSupplierAgents();

      expect(Object.keys(agents)).toHaveLength(3);
      expect(agents[1]).toBeDefined();
      expect(agents[2]).toBeDefined();
      expect(agents[3]).toBeDefined();
    });

    it("should return agents with correct IDs", () => {
      const agents = getAllSupplierAgents();

      expect(agents[1].id).toBe("supplier-1-agent");
      expect(agents[2].id).toBe("supplier-2-agent");
      expect(agents[3].id).toBe("supplier-3-agent");
    });

    it("should return the pre-created agents", () => {
      const agents = getAllSupplierAgents();

      expect(agents[1]).toBe(supplierAgent1);
      expect(agents[2]).toBe(supplierAgent2);
      expect(agents[3]).toBe(supplierAgent3);
    });
  });

  describe("Supplier Differentiation", () => {
    it("should have supplier 1 as the cheapest option", () => {
      const s1 = getSupplierCharacteristics(1);
      const s2 = getSupplierCharacteristics(2);
      const s3 = getSupplierCharacteristics(3);

      expect(s1.basePriceMultiplier).toBeLessThan(s2.basePriceMultiplier);
      expect(s1.basePriceMultiplier).toBeLessThan(s3.basePriceMultiplier);
    });

    it("should have supplier 2 as the highest quality", () => {
      const s1 = getSupplierCharacteristics(1);
      const s2 = getSupplierCharacteristics(2);
      const s3 = getSupplierCharacteristics(3);

      expect(s2.qualityRating).toBeGreaterThan(s1.qualityRating);
      expect(s2.qualityRating).toBeGreaterThan(s3.qualityRating);
    });

    it("should have supplier 3 as the fastest delivery", () => {
      const s1 = getSupplierCharacteristics(1);
      const s2 = getSupplierCharacteristics(2);
      const s3 = getSupplierCharacteristics(3);

      expect(s3.leadTimeDays).toBeLessThan(s1.leadTimeDays);
      expect(s3.leadTimeDays).toBeLessThan(s2.leadTimeDays);
    });

    it("should have supplier 1 with the most favorable payment terms", () => {
      const s1 = getSupplierCharacteristics(1);

      expect(s1.paymentTerms).toBe("33/33/33"); // Split payments
      expect(s1.negotiationFlexibility.paymentFlexibility).toBe(true);
    });
  });

  describe("Negotiation Flexibility Constraints", () => {
    it("should limit supplier 2 price flexibility due to premium positioning", () => {
      const s1 = getSupplierCharacteristics(1);
      const s2 = getSupplierCharacteristics(2);

      // Supplier 2 should have less price flexibility
      expect(s2.negotiationFlexibility.priceFlexibility).toBeLessThan(
        s1.negotiationFlexibility.priceFlexibility
      );
    });

    it("should limit supplier 3 lead time flexibility due to already fast delivery", () => {
      const s2 = getSupplierCharacteristics(2);
      const s3 = getSupplierCharacteristics(3);

      // Supplier 3 should have less lead time flexibility
      expect(s3.negotiationFlexibility.leadTimeFlexibility).toBeLessThan(
        s2.negotiationFlexibility.leadTimeFlexibility
      );
    });

    it("should restrict supplier 2 payment flexibility", () => {
      const s2 = getSupplierCharacteristics(2);

      expect(s2.negotiationFlexibility.paymentFlexibility).toBe(false);
    });
  });
});
