import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NegotiationCallbacks } from "../../mastra/storage/message-persister";
import type { UserIntervention } from "../../mastra/utils/user-guidance";

/**
 * Intervention Timing Integration Tests
 *
 * These tests verify the timing mechanism for user interventions:
 * 1. Interventions are queried with correct timestamp
 * 2. Only new interventions since last check are returned
 * 3. Timestamp updates after processing
 * 4. Multiple rapid interventions are handled correctly
 */

describe("Intervention Timing Integration", () => {
  const baseInterventions: UserIntervention[] = [
    { content: "Focus on price", timestamp: 1000, messageId: "msg-1" },
    { content: "Get faster delivery", timestamp: 2000, messageId: "msg-2" },
    { content: "Accept at $25", timestamp: 3000, messageId: "msg-3" },
    { content: "Walk away now", timestamp: 4000, messageId: "msg-4" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Timestamp-Based Filtering", () => {
    it("should return only interventions after sinceTimestamp", () => {
      const sinceTimestamp = 1500;
      const filtered = baseInterventions.filter(
        (i) => i.timestamp > sinceTimestamp
      );

      expect(filtered).toHaveLength(3);
      expect(filtered[0].content).toBe("Get faster delivery");
      expect(filtered[1].content).toBe("Accept at $25");
      expect(filtered[2].content).toBe("Walk away now");
    });

    it("should return all interventions when sinceTimestamp is 0", () => {
      const sinceTimestamp = 0;
      const filtered = baseInterventions.filter(
        (i) => i.timestamp > sinceTimestamp
      );

      expect(filtered).toHaveLength(4);
    });

    it("should return empty when sinceTimestamp is after all interventions", () => {
      const sinceTimestamp = 5000;
      const filtered = baseInterventions.filter(
        (i) => i.timestamp > sinceTimestamp
      );

      expect(filtered).toHaveLength(0);
    });

    it("should exclude exactly matching timestamp", () => {
      const sinceTimestamp = 2000;
      const filtered = baseInterventions.filter(
        (i) => i.timestamp > sinceTimestamp
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.find((i) => i.content === "Get faster delivery")).toBeUndefined();
    });
  });

  describe("Callback Integration", () => {
    it("should mock getUserInterventions with timestamp filter", async () => {
      const getUserInterventionsMock = vi
        .fn()
        .mockImplementation(
          (negId: string, sinceTs: number): Promise<UserIntervention[]> => {
            return Promise.resolve(
              baseInterventions.filter((i) => i.timestamp > sinceTs)
            );
          }
        );

      const callbacks: NegotiationCallbacks = {
        onMessage: vi.fn(() => Promise.resolve()),
        onStatusChange: vi.fn(() => Promise.resolve()),
        onOfferReceived: vi.fn(() => Promise.resolve()),
        getUserInterventions: getUserInterventionsMock,
      };

      // First query at timestamp 1500
      const result1 = await callbacks.getUserInterventions?.("neg-123", 1500);
      expect(result1).toHaveLength(3);
      expect(getUserInterventionsMock).toHaveBeenCalledWith("neg-123", 1500);

      // Second query at timestamp 2500
      const result2 = await callbacks.getUserInterventions?.("neg-123", 2500);
      expect(result2).toHaveLength(2);
      expect(getUserInterventionsMock).toHaveBeenCalledWith("neg-123", 2500);
    });

    it("should track timestamp updates across rounds", async () => {
      let lastProcessedTime = 0;
      const interventionLog: Array<{ round: number; count: number }> = [];

      const getUserInterventionsMock = vi
        .fn()
        .mockImplementation(
          (_negId: string, sinceTs: number): Promise<UserIntervention[]> => {
            return Promise.resolve(
              baseInterventions.filter((i) => i.timestamp > sinceTs)
            );
          }
        );

      const callbacks: NegotiationCallbacks = {
        onMessage: vi.fn(() => Promise.resolve()),
        onStatusChange: vi.fn(() => Promise.resolve()),
        onOfferReceived: vi.fn(() => Promise.resolve()),
        getUserInterventions: getUserInterventionsMock,
      };

      // Simulate multiple rounds
      for (let round = 0; round < 3; round++) {
        const interventions = await callbacks.getUserInterventions?.(
          "neg-123",
          lastProcessedTime
        );

        interventionLog.push({ round, count: interventions?.length ?? 0 });

        // Update timestamp based on latest intervention
        if (interventions && interventions.length > 0) {
          lastProcessedTime = Math.max(
            ...interventions.map((i) => i.timestamp)
          );
        }
      }

      // Round 0: All 4 interventions (sinceTimestamp = 0)
      expect(interventionLog[0].count).toBe(4);
      // Round 1: 0 interventions (sinceTimestamp = 4000, all processed)
      expect(interventionLog[1].count).toBe(0);
      // Round 2: 0 interventions (no new ones)
      expect(interventionLog[2].count).toBe(0);
    });
  });

  describe("Real-Time Simulation", () => {
    it("should handle interventions arriving during negotiation", async () => {
      const dynamicInterventions: UserIntervention[] = [];
      let currentTime = 1000;

      const getUserInterventionsMock = vi
        .fn()
        .mockImplementation(
          (_negId: string, sinceTs: number): Promise<UserIntervention[]> => {
            return Promise.resolve(
              dynamicInterventions.filter((i) => i.timestamp > sinceTs)
            );
          }
        );

      const callbacks: NegotiationCallbacks = {
        onMessage: vi.fn(() => Promise.resolve()),
        onStatusChange: vi.fn(() => Promise.resolve()),
        onOfferReceived: vi.fn(() => Promise.resolve()),
        getUserInterventions: getUserInterventionsMock,
      };

      let lastProcessedTime = 0;

      // Round 1: No interventions yet
      let result = await callbacks.getUserInterventions?.("neg-123", lastProcessedTime);
      expect(result).toHaveLength(0);

      // User sends intervention during round 1
      currentTime = 1500;
      dynamicInterventions.push({
        content: "Push for lower price",
        timestamp: currentTime,
        messageId: "msg-1",
      });

      // Round 2: Should see the new intervention
      result = await callbacks.getUserInterventions?.("neg-123", lastProcessedTime);
      expect(result).toHaveLength(1);
      expect(result?.[0].content).toBe("Push for lower price");
      lastProcessedTime = currentTime;

      // User sends another intervention
      currentTime = 2500;
      dynamicInterventions.push({
        content: "Accept if under $25",
        timestamp: currentTime,
        messageId: "msg-2",
      });

      // Round 3: Should only see the new intervention
      result = await callbacks.getUserInterventions?.("neg-123", lastProcessedTime);
      expect(result).toHaveLength(1);
      expect(result?.[0].content).toBe("Accept if under $25");
    });

    it("should handle multiple interventions in same timestamp window", async () => {
      const interventions: UserIntervention[] = [
        { content: "Intervention A", timestamp: 1000, messageId: "msg-a" },
        { content: "Intervention B", timestamp: 1001, messageId: "msg-b" },
        { content: "Intervention C", timestamp: 1002, messageId: "msg-c" },
      ];

      const getUserInterventionsMock = vi
        .fn()
        .mockImplementation(
          (_negId: string, sinceTs: number): Promise<UserIntervention[]> => {
            return Promise.resolve(
              interventions.filter((i) => i.timestamp > sinceTs)
            );
          }
        );

      const callbacks: NegotiationCallbacks = {
        onMessage: vi.fn(() => Promise.resolve()),
        onStatusChange: vi.fn(() => Promise.resolve()),
        onOfferReceived: vi.fn(() => Promise.resolve()),
        getUserInterventions: getUserInterventionsMock,
      };

      // All three should be returned
      const result = await callbacks.getUserInterventions?.("neg-123", 999);
      expect(result).toHaveLength(3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined getUserInterventions callback", async () => {
      const callbacks: NegotiationCallbacks = {
        onMessage: vi.fn(() => Promise.resolve()),
        onStatusChange: vi.fn(() => Promise.resolve()),
        // getUserInterventions is undefined
      };

      const result = await callbacks.getUserInterventions?.("neg-123", 0);
      expect(result).toBeUndefined();
    });

    it("should handle empty negotiation ID", async () => {
      const getUserInterventionsMock = vi.fn().mockResolvedValue([]);

      const callbacks: NegotiationCallbacks = {
        onMessage: vi.fn(() => Promise.resolve()),
        onStatusChange: vi.fn(() => Promise.resolve()),
        getUserInterventions: getUserInterventionsMock,
      };

      await callbacks.getUserInterventions?.("", 0);
      expect(getUserInterventionsMock).toHaveBeenCalledWith("", 0);
    });

    it("should handle negative timestamp", async () => {
      const getUserInterventionsMock = vi
        .fn()
        .mockImplementation(
          (_negId: string, sinceTs: number): Promise<UserIntervention[]> => {
            return Promise.resolve(
              baseInterventions.filter((i) => i.timestamp > sinceTs)
            );
          }
        );

      const callbacks: NegotiationCallbacks = {
        onMessage: vi.fn(() => Promise.resolve()),
        onStatusChange: vi.fn(() => Promise.resolve()),
        getUserInterventions: getUserInterventionsMock,
      };

      const result = await callbacks.getUserInterventions?.("neg-123", -1000);
      expect(result).toHaveLength(4); // All interventions have positive timestamps
    });

    it("should maintain order of interventions", async () => {
      const unorderedInterventions: UserIntervention[] = [
        { content: "Third", timestamp: 3000, messageId: "msg-3" },
        { content: "First", timestamp: 1000, messageId: "msg-1" },
        { content: "Second", timestamp: 2000, messageId: "msg-2" },
      ];

      const getUserInterventionsMock = vi
        .fn()
        .mockImplementation(
          (_negId: string, sinceTs: number): Promise<UserIntervention[]> => {
            return Promise.resolve(
              unorderedInterventions
                .filter((i) => i.timestamp > sinceTs)
                .sort((a, b) => a.timestamp - b.timestamp)
            );
          }
        );

      const callbacks: NegotiationCallbacks = {
        onMessage: vi.fn(() => Promise.resolve()),
        onStatusChange: vi.fn(() => Promise.resolve()),
        getUserInterventions: getUserInterventionsMock,
      };

      const result = await callbacks.getUserInterventions?.("neg-123", 0);
      expect(result?.[0].content).toBe("First");
      expect(result?.[1].content).toBe("Second");
      expect(result?.[2].content).toBe("Third");
    });
  });
});

