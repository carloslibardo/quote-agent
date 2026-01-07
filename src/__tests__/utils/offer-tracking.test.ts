/**
 * Offer Tracker Tests
 *
 * Tests for tracking offer history and analysis.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  OfferTracker,
  createOfferTracker,
  type OfferHistoryEntry,
} from "../../mastra/utils/offer-tracker";
import type { ParsedOffer } from "../../mastra/utils/tool-parser";

const mockOffer1: ParsedOffer = {
  unitPrice: 30.0,
  leadTimeDays: 45,
  paymentTerms: "33/33/33",
};

const mockOffer2: ParsedOffer = {
  unitPrice: 28.0,
  leadTimeDays: 42,
  paymentTerms: "33/33/33",
};

const mockOffer3: ParsedOffer = {
  unitPrice: 26.0,
  leadTimeDays: 40,
  paymentTerms: "33/33/33",
};

const mockBrandOffer: ParsedOffer = {
  unitPrice: 25.0,
  leadTimeDays: 35,
  paymentTerms: "30/70",
};

describe("OfferTracker", () => {
  let tracker: OfferTracker;

  beforeEach(() => {
    tracker = new OfferTracker(1);
  });

  describe("constructor", () => {
    it("should create tracker with supplier ID", () => {
      const tracker = new OfferTracker(2);
      expect(tracker.getSupplierId()).toBe(2);
    });
  });

  describe("addOffer", () => {
    it("should add offer to history", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });

      expect(tracker.getOfferCount()).toBe(1);
    });

    it("should add timestamp automatically", () => {
      const before = Date.now();
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      const after = Date.now();

      const entry = tracker.getLatestOffer();
      expect(entry?.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry?.timestamp).toBeLessThanOrEqual(after);
    });

    it("should track multiple offers", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 0, source: "brand", offer: mockBrandOffer });
      tracker.addOffer({ round: 1, source: "supplier", offer: mockOffer2 });

      expect(tracker.getOfferCount()).toBe(3);
    });
  });

  describe("getLatestOffer", () => {
    it("should return null for empty history", () => {
      expect(tracker.getLatestOffer()).toBeNull();
    });

    it("should return most recent offer", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 1, source: "supplier", offer: mockOffer2 });

      const latest = tracker.getLatestOffer();
      expect(latest?.offer.unitPrice).toBe(28.0);
    });
  });

  describe("getFirstOffer", () => {
    it("should return null for empty history", () => {
      expect(tracker.getFirstOffer()).toBeNull();
    });

    it("should return first offer", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 1, source: "supplier", offer: mockOffer2 });

      const first = tracker.getFirstOffer();
      expect(first?.offer.unitPrice).toBe(30.0);
    });
  });

  describe("getOfferBySource", () => {
    it("should return latest offer from supplier", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 0, source: "brand", offer: mockBrandOffer });
      tracker.addOffer({ round: 1, source: "supplier", offer: mockOffer2 });

      const supplierOffer = tracker.getOfferBySource("supplier");
      expect(supplierOffer?.offer.unitPrice).toBe(28.0);
    });

    it("should return latest offer from brand", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 0, source: "brand", offer: mockBrandOffer });

      const brandOffer = tracker.getOfferBySource("brand");
      expect(brandOffer?.offer.unitPrice).toBe(25.0);
    });

    it("should return null for missing source", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });

      const brandOffer = tracker.getOfferBySource("brand");
      expect(brandOffer).toBeNull();
    });
  });

  describe("getOffersBySource", () => {
    it("should return all offers from a source", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 0, source: "brand", offer: mockBrandOffer });
      tracker.addOffer({ round: 1, source: "supplier", offer: mockOffer2 });
      tracker.addOffer({ round: 2, source: "supplier", offer: mockOffer3 });

      const supplierOffers = tracker.getOffersBySource("supplier");
      expect(supplierOffers).toHaveLength(3);
    });

    it("should return empty array for no matches", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });

      const brandOffers = tracker.getOffersBySource("brand");
      expect(brandOffers).toHaveLength(0);
    });
  });

  describe("getPriceProgression", () => {
    it("should return all prices in order", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 0, source: "brand", offer: mockBrandOffer });
      tracker.addOffer({ round: 1, source: "supplier", offer: mockOffer2 });

      const prices = tracker.getPriceProgression();
      expect(prices).toEqual([30.0, 25.0, 28.0]);
    });

    it("should return empty array for no offers", () => {
      const prices = tracker.getPriceProgression();
      expect(prices).toEqual([]);
    });
  });

  describe("hasPriceImproved", () => {
    it("should return true when price decreased", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 1, source: "supplier", offer: mockOffer2 });
      tracker.addOffer({ round: 2, source: "supplier", offer: mockOffer3 });

      expect(tracker.hasPriceImproved(3)).toBe(true);
    });

    it("should return true when not enough data", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });

      expect(tracker.hasPriceImproved(3)).toBe(true);
    });

    it("should return false when price not improving", () => {
      const staleOffer = { ...mockOffer1, unitPrice: 30.0 };
      tracker.addOffer({ round: 0, source: "supplier", offer: staleOffer });
      tracker.addOffer({ round: 1, source: "supplier", offer: staleOffer });
      tracker.addOffer({ round: 2, source: "supplier", offer: staleOffer });

      expect(tracker.hasPriceImproved(3)).toBe(false);
    });
  });

  describe("isStalled", () => {
    it("should return false for improving prices", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 1, source: "supplier", offer: mockOffer2 });
      tracker.addOffer({ round: 2, source: "supplier", offer: mockOffer3 });

      expect(tracker.isStalled(3, 1)).toBe(false);
    });

    it("should return true for stale prices", () => {
      const staleOffer = { ...mockOffer1, unitPrice: 30.0 };
      tracker.addOffer({ round: 0, source: "supplier", offer: staleOffer });
      tracker.addOffer({ round: 1, source: "supplier", offer: staleOffer });
      tracker.addOffer({ round: 2, source: "supplier", offer: staleOffer });

      expect(tracker.isStalled(3, 1)).toBe(true);
    });

    it("should return false for insufficient data", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });

      expect(tracker.isStalled(3)).toBe(false);
    });
  });

  describe("calculatePriceGap", () => {
    it("should calculate gap between brand and supplier", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 0, source: "brand", offer: mockBrandOffer });

      const gap = tracker.calculatePriceGap();
      expect(gap).toBe(5.0); // 30 - 25
    });

    it("should return null when missing party", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });

      const gap = tracker.calculatePriceGap();
      expect(gap).toBeNull();
    });

    it("should use latest offers from each party", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 0, source: "brand", offer: mockBrandOffer });
      tracker.addOffer({ round: 1, source: "supplier", offer: mockOffer2 });

      const gap = tracker.calculatePriceGap();
      expect(gap).toBe(3.0); // 28 - 25
    });
  });

  describe("calculatePriceGapPercent", () => {
    it("should calculate gap as percentage", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 0, source: "brand", offer: mockBrandOffer });

      const gapPercent = tracker.calculatePriceGapPercent();
      expect(gapPercent).toBeCloseTo(16.67, 1); // (5 / 30) * 100
    });

    it("should return null when missing party", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });

      const gapPercent = tracker.calculatePriceGapPercent();
      expect(gapPercent).toBeNull();
    });
  });

  describe("getHistory", () => {
    it("should return copy of history", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 1, source: "supplier", offer: mockOffer2 });

      const history = tracker.getHistory();
      expect(history).toHaveLength(2);

      // Modify returned array
      history.push({} as OfferHistoryEntry);

      // Original should be unchanged
      expect(tracker.getHistory()).toHaveLength(2);
    });
  });

  describe("getOffersByRound", () => {
    it("should return offers for specific round", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 0, source: "brand", offer: mockBrandOffer });
      tracker.addOffer({ round: 1, source: "supplier", offer: mockOffer2 });

      const round0 = tracker.getOffersByRound(0);
      expect(round0).toHaveLength(2);

      const round1 = tracker.getOffersByRound(1);
      expect(round1).toHaveLength(1);
    });

    it("should return empty array for nonexistent round", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });

      const round5 = tracker.getOffersByRound(5);
      expect(round5).toHaveLength(0);
    });
  });

  describe("getStats", () => {
    it("should calculate comprehensive stats", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 0, source: "brand", offer: mockBrandOffer });
      tracker.addOffer({ round: 1, source: "supplier", offer: mockOffer2 });
      tracker.addOffer({ round: 2, source: "supplier", offer: mockOffer3 });

      const stats = tracker.getStats();

      expect(stats.totalRounds).toBe(3);
      expect(stats.totalOffers).toBe(4);
      expect(stats.priceRange.min).toBe(25.0);
      expect(stats.priceRange.max).toBe(30.0);
      expect(stats.priceImprovement).toBeCloseTo(13.33, 1); // (30-26)/30 * 100
      expect(stats.finalOffer?.unitPrice).toBe(26.0);
    });

    it("should handle empty history", () => {
      const stats = tracker.getStats();

      expect(stats.totalRounds).toBe(1); // round 0 + 1
      expect(stats.totalOffers).toBe(0);
      expect(stats.priceRange.min).toBe(0);
      expect(stats.priceRange.max).toBe(0);
      expect(stats.priceImprovement).toBe(0);
      expect(stats.finalOffer).toBeUndefined();
    });
  });

  describe("clear", () => {
    it("should clear all history", () => {
      tracker.addOffer({ round: 0, source: "supplier", offer: mockOffer1 });
      tracker.addOffer({ round: 1, source: "supplier", offer: mockOffer2 });

      tracker.clear();

      expect(tracker.getOfferCount()).toBe(0);
      expect(tracker.getHistory()).toHaveLength(0);
    });
  });
});

describe("createOfferTracker", () => {
  it("should create tracker with supplier ID", () => {
    const tracker = createOfferTracker(3);

    expect(tracker).toBeInstanceOf(OfferTracker);
    expect(tracker.getSupplierId()).toBe(3);
  });
});

