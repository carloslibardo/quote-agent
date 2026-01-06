/**
 * Offer Tracker Utility
 *
 * Tracks offer history and progression throughout a negotiation.
 * Enables price gap analysis and improvement detection.
 */

import type { ParsedOffer } from "./tool-parser";

// ============================================================================
// Types
// ============================================================================

/**
 * Single entry in the offer history
 */
export interface OfferHistoryEntry {
  round: number;
  timestamp: number;
  source: "brand" | "supplier";
  offer: ParsedOffer;
  toolCallId?: string;
}

/**
 * Summary statistics for the negotiation
 */
export interface NegotiationStats {
  totalRounds: number;
  totalOffers: number;
  priceRange: { min: number; max: number };
  priceImprovement: number; // Percentage improvement from first to last offer
  averagePrice: number;
  finalOffer?: ParsedOffer;
}

// ============================================================================
// OfferTracker Class
// ============================================================================

/**
 * Tracks offer history and provides analysis methods
 */
export class OfferTracker {
  private history: OfferHistoryEntry[] = [];
  private supplierId: number;

  constructor(supplierId: number) {
    this.supplierId = supplierId;
  }

  /**
   * Get the supplier ID for this tracker
   */
  getSupplierId(): number {
    return this.supplierId;
  }

  /**
   * Add an offer to the history
   */
  addOffer(entry: Omit<OfferHistoryEntry, "timestamp">): void {
    this.history.push({
      ...entry,
      timestamp: Date.now(),
    });
  }

  /**
   * Get the most recent offer
   */
  getLatestOffer(): OfferHistoryEntry | null {
    return this.history.length > 0
      ? this.history[this.history.length - 1]
      : null;
  }

  /**
   * Get the first offer
   */
  getFirstOffer(): OfferHistoryEntry | null {
    return this.history.length > 0 ? this.history[0] : null;
  }

  /**
   * Get the most recent offer from a specific source
   */
  getOfferBySource(source: "brand" | "supplier"): OfferHistoryEntry | null {
    const filtered = this.history.filter((h) => h.source === source);
    return filtered.length > 0 ? filtered[filtered.length - 1] : null;
  }

  /**
   * Get all offers from a specific source
   */
  getOffersBySource(source: "brand" | "supplier"): OfferHistoryEntry[] {
    return this.history.filter((h) => h.source === source);
  }

  /**
   * Get the price progression over time
   */
  getPriceProgression(): number[] {
    return this.history.map((h) => h.offer.unitPrice);
  }

  /**
   * Check if price has improved within a window
   * For the buyer, improvement means price is decreasing
   */
  hasPriceImproved(windowSize: number = 3): boolean {
    if (this.history.length < windowSize) return true; // Not enough data

    const recent = this.history.slice(-windowSize);
    const supplierOffers = recent.filter((h) => h.source === "supplier");

    if (supplierOffers.length < 2) return true; // Not enough supplier offers

    // Check if any price is lower than the previous one
    for (let i = 1; i < supplierOffers.length; i++) {
      if (supplierOffers[i].offer.unitPrice < supplierOffers[i - 1].offer.unitPrice) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if negotiation is stalled (no price movement)
   */
  isStalled(windowSize: number = 3, tolerancePercent: number = 1): boolean {
    if (this.history.length < windowSize) return false;

    const recent = this.history.slice(-windowSize);
    const supplierOffers = recent.filter((h) => h.source === "supplier");

    if (supplierOffers.length < 2) return false;

    const prices = supplierOffers.map((o) => o.offer.unitPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const variation = ((maxPrice - minPrice) / minPrice) * 100;

    return variation <= tolerancePercent;
  }

  /**
   * Calculate the gap between brand and supplier offers
   */
  calculatePriceGap(): number | null {
    const brandOffer = this.getOfferBySource("brand");
    const supplierOffer = this.getOfferBySource("supplier");

    if (!brandOffer || !supplierOffer) return null;

    return Math.abs(brandOffer.offer.unitPrice - supplierOffer.offer.unitPrice);
  }

  /**
   * Calculate price gap as a percentage
   */
  calculatePriceGapPercent(): number | null {
    const gap = this.calculatePriceGap();
    const supplierOffer = this.getOfferBySource("supplier");

    if (gap === null || !supplierOffer) return null;

    return (gap / supplierOffer.offer.unitPrice) * 100;
  }

  /**
   * Get the complete offer history
   */
  getHistory(): OfferHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get the number of offers in history
   */
  getOfferCount(): number {
    return this.history.length;
  }

  /**
   * Get offers for a specific round
   */
  getOffersByRound(round: number): OfferHistoryEntry[] {
    return this.history.filter((h) => h.round === round);
  }

  /**
   * Get negotiation statistics
   */
  getStats(): NegotiationStats {
    const prices = this.getPriceProgression();
    const supplierPrices = this.getOffersBySource("supplier").map(
      (o) => o.offer.unitPrice
    );

    const firstSupplierPrice = supplierPrices[0];
    const lastSupplierPrice = supplierPrices[supplierPrices.length - 1];
    const priceImprovement =
      firstSupplierPrice && lastSupplierPrice
        ? ((firstSupplierPrice - lastSupplierPrice) / firstSupplierPrice) * 100
        : 0;

    const maxRound = this.history.reduce(
      (max, entry) => Math.max(max, entry.round),
      0
    );

    return {
      totalRounds: maxRound + 1,
      totalOffers: this.history.length,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      },
      priceImprovement,
      averagePrice:
        prices.length > 0
          ? prices.reduce((a, b) => a + b, 0) / prices.length
          : 0,
      finalOffer: this.getLatestOffer()?.offer,
    };
  }

  /**
   * Clear the history
   */
  clear(): void {
    this.history = [];
  }
}

/**
 * Create a new offer tracker for a supplier
 */
export function createOfferTracker(supplierId: number): OfferTracker {
  return new OfferTracker(supplierId);
}

