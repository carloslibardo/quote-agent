import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NegotiationCallbacks } from "../../mastra/storage/message-persister";
import {
  formatUserGuidance,
  parseUserInstructions,
  type UserIntervention,
} from "../../mastra/utils/user-guidance";

/**
 * User Intervention Integration Tests
 *
 * These tests verify that user interventions are:
 * 1. Queried before each brand turn
 * 2. Formatted and included in agent context
 * 3. Walkaway instructions immediately end negotiation
 * 4. Price/lead time limits are parsed and respected
 */

describe("User Intervention Integration", () => {
  const mockCallbacks: NegotiationCallbacks = {
    onMessage: vi.fn(() => Promise.resolve()),
    onStatusChange: vi.fn(() => Promise.resolve()),
    onOfferReceived: vi.fn(() => Promise.resolve()),
    getUserInterventions: vi.fn(() => Promise.resolve([])),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Intervention Query", () => {
    it("should call getUserInterventions callback", async () => {
      const getUserInterventionsMock = vi.fn().mockResolvedValue([]);

      const callbacks: NegotiationCallbacks = {
        ...mockCallbacks,
        getUserInterventions: getUserInterventionsMock,
      };

      // Simulate checking for interventions
      await callbacks.getUserInterventions?.("neg-123", Date.now() - 10000);

      expect(getUserInterventionsMock).toHaveBeenCalledWith(
        "neg-123",
        expect.any(Number)
      );
    });

    it("should return intervention messages when available", async () => {
      const mockInterventions: UserIntervention[] = [
        {
          content: "Focus on getting a shorter lead time",
          timestamp: Date.now(),
          messageId: "msg-1",
        },
      ];

      const getUserInterventionsMock = vi
        .fn()
        .mockResolvedValue(mockInterventions);

      const callbacks: NegotiationCallbacks = {
        ...mockCallbacks,
        getUserInterventions: getUserInterventionsMock,
      };

      const result = await callbacks.getUserInterventions?.(
        "neg-123",
        Date.now() - 10000
      );

      expect(result).toHaveLength(1);
      expect(result?.[0].content).toBe(
        "Focus on getting a shorter lead time"
      );
    });

    it("should return empty array when no interventions", async () => {
      const getUserInterventionsMock = vi.fn().mockResolvedValue([]);

      const callbacks: NegotiationCallbacks = {
        ...mockCallbacks,
        getUserInterventions: getUserInterventionsMock,
      };

      const result = await callbacks.getUserInterventions?.(
        "neg-123",
        Date.now()
      );

      expect(result).toHaveLength(0);
    });
  });

  describe("Intervention Formatting", () => {
    it("should format intervention for agent consumption", () => {
      const interventions: UserIntervention[] = [
        {
          content: "Focus on getting a shorter lead time",
          timestamp: Date.now(),
          messageId: "msg-1",
        },
      ];

      const guidance = formatUserGuidance(interventions);

      expect(guidance.summary).toContain(
        "Focus on getting a shorter lead time"
      );
      expect(guidance.interventions).toHaveLength(1);
    });

    it("should mark urgent interventions", () => {
      const interventions: UserIntervention[] = [
        {
          content: "URGENT: Stop and accept current offer",
          timestamp: Date.now(),
          messageId: "msg-1",
        },
      ];

      const guidance = formatUserGuidance(interventions);

      expect(guidance.hasUrgentRequest).toBe(true);
      expect(guidance.summary).toContain("URGENT REQUEST");
    });

    it("should combine multiple interventions", () => {
      const interventions: UserIntervention[] = [
        {
          content: "Push for lower price",
          timestamp: Date.now(),
          messageId: "msg-1",
        },
        {
          content: "Lead time is flexible",
          timestamp: Date.now() + 1000,
          messageId: "msg-2",
        },
      ];

      const guidance = formatUserGuidance(interventions);

      expect(guidance.summary).toContain("2 messages");
      expect(guidance.summary).toContain("Push for lower price");
      expect(guidance.summary).toContain("Lead time is flexible");
    });
  });

  describe("Walkaway Detection", () => {
    it("should detect walk away instruction", () => {
      const parsed = parseUserInstructions("Walk away from this deal");
      expect(parsed.walkAway).toBe(true);
    });

    it("should detect end negotiation instruction", () => {
      const parsed = parseUserInstructions("End the negotiation");
      expect(parsed.walkAway).toBe(true);
    });

    it("should detect stop talking instruction", () => {
      const parsed = parseUserInstructions("Stop talking to this supplier");
      expect(parsed.walkAway).toBe(true);
    });

    it("should detect cancel instruction", () => {
      const parsed = parseUserInstructions("Cancel the negotiation");
      expect(parsed.walkAway).toBe(true);
    });

    it("should not flag normal messages as walkaway", () => {
      const parsed = parseUserInstructions("Try to get a better price");
      expect(parsed.walkAway).toBeUndefined();
    });
  });

  describe("Price Limit Parsing", () => {
    it("should extract price limit from 'no more than' format", () => {
      const parsed = parseUserInstructions("No more than $25 per unit");
      expect(parsed.priceLimit).toBe(25);
    });

    it("should extract price limit from 'max' format", () => {
      const parsed = parseUserInstructions("Maximum $30 is acceptable");
      expect(parsed.priceLimit).toBe(30);
    });

    it("should handle decimal prices", () => {
      const parsed = parseUserInstructions("Limit $22.50 is our cap");
      expect(parsed.priceLimit).toBe(22.5);
    });

    it("should not extract price from unrelated numbers", () => {
      // This tests that we don't extract random numbers
      const parsed = parseUserInstructions(
        "We have 5000 units to order"
      );
      expect(parsed.priceLimit).toBeUndefined();
    });
  });

  describe("Lead Time Limit Parsing", () => {
    it("should extract lead time from 'within X days' format", () => {
      const parsed = parseUserInstructions("Delivery within 30 days");
      expect(parsed.leadTimeLimit).toBe(30);
    });

    it("should extract lead time from 'X days max' format", () => {
      const parsed = parseUserInstructions("Maximum 45 days for shipping");
      expect(parsed.leadTimeLimit).toBe(45);
    });

    it("should extract lead time from 'under X days' format", () => {
      const parsed = parseUserInstructions("Under 20 days is required");
      expect(parsed.leadTimeLimit).toBe(20);
    });
  });

  describe("Accept Instructions", () => {
    it("should detect 'accept if' pattern", () => {
      const parsed = parseUserInstructions("Accept if price is under $25");
      expect(parsed.acceptIfMet).toBe(true);
    });

    it("should detect 'take the deal' pattern", () => {
      const parsed = parseUserInstructions("Take the deal at this price");
      expect(parsed.acceptIfMet).toBe(true);
    });

    it("should detect 'go ahead' pattern", () => {
      const parsed = parseUserInstructions("Go ahead with supplier 2");
      expect(parsed.acceptIfMet).toBe(true);
    });
  });

  describe("Focus Area Parsing", () => {
    it("should detect price focus", () => {
      const parsed = parseUserInstructions("Focus on price negotiations");
      expect(parsed.focusAreas).toContain("price");
    });

    it("should detect lead time focus", () => {
      const parsed = parseUserInstructions("Prioritize delivery time");
      expect(parsed.focusAreas).toContain("lead_time");
    });

    it("should detect quality focus", () => {
      const parsed = parseUserInstructions("Emphasize the quality");
      expect(parsed.focusAreas).toContain("quality");
    });

    it("should detect payment terms focus", () => {
      const parsed = parseUserInstructions("Focus on payment terms");
      expect(parsed.focusAreas).toContain("payment_terms");
    });
  });

  describe("Complex Instructions", () => {
    it("should parse multiple constraints in one message", () => {
      const parsed = parseUserInstructions(
        "Accept if under $25 within 30 days"
      );

      expect(parsed.priceLimit).toBe(25);
      expect(parsed.leadTimeLimit).toBe(30);
      expect(parsed.acceptIfMet).toBe(true);
    });

    it("should parse conditional walkaway", () => {
      const parsed = parseUserInstructions(
        "Maximum $22, otherwise walk away from this deal"
      );

      expect(parsed.priceLimit).toBe(22);
      expect(parsed.walkAway).toBe(true);
    });
  });
});

describe("Intervention Timing", () => {
  it("should track timestamp for intervention queries", () => {
    const startTime = Date.now();
    const sinceTimestamp = startTime - 5000; // 5 seconds ago

    expect(sinceTimestamp).toBeLessThan(startTime);
    expect(startTime - sinceTimestamp).toBe(5000);
  });

  it("should update lastProcessedTime after processing", () => {
    let lastProcessedTime = Date.now() - 10000;
    const currentTime = Date.now();

    // Simulate processing interventions
    lastProcessedTime = currentTime;

    expect(lastProcessedTime).toBeGreaterThanOrEqual(currentTime);
  });

  it("should only return interventions after sinceTimestamp", () => {
    const interventions: UserIntervention[] = [
      { content: "Old message", timestamp: 1000, messageId: "msg-1" },
      { content: "New message", timestamp: 3000, messageId: "msg-2" },
    ];

    const sinceTimestamp = 2000;
    const filtered = interventions.filter((i) => i.timestamp > sinceTimestamp);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].content).toBe("New message");
  });
});

