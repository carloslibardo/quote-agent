import { describe, it, expect } from "vitest";
import {
  formatUserGuidance,
  parseUserInstructions,
  isUrgentMessage,
  isWalkAwayInstruction,
  combineGuidance,
  buildGuidanceContextString,
  type UserIntervention,
  type FormattedGuidance,
} from "../../mastra/utils/user-guidance";

describe("User Guidance", () => {
  describe("formatUserGuidance", () => {
    it("should return empty summary for no interventions", () => {
      const result = formatUserGuidance([]);

      expect(result.summary).toBe("");
      expect(result.interventions).toHaveLength(0);
      expect(result.hasUrgentRequest).toBe(false);
    });

    it("should format single intervention", () => {
      const interventions: UserIntervention[] = [
        {
          content: "Try to get a better price",
          timestamp: Date.now(),
          messageId: "msg-1",
        },
      ];

      const result = formatUserGuidance(interventions);

      expect(result.summary).toContain("Try to get a better price");
      expect(result.summary).toContain("1 message");
      expect(result.hasUrgentRequest).toBe(false);
      expect(result.interventions).toHaveLength(1);
    });

    it("should format multiple interventions", () => {
      const interventions: UserIntervention[] = [
        {
          content: "Push harder on price",
          timestamp: Date.now(),
          messageId: "msg-1",
        },
        {
          content: "Lead time is flexible",
          timestamp: Date.now(),
          messageId: "msg-2",
        },
      ];

      const result = formatUserGuidance(interventions);

      expect(result.summary).toContain("2 messages");
      expect(result.summary).toContain("Push harder on price");
      expect(result.summary).toContain("Lead time is flexible");
      expect(result.interventions).toHaveLength(2);
    });

    it("should detect urgent requests - 'urgent'", () => {
      const interventions: UserIntervention[] = [
        {
          content: "URGENT: Stop negotiating immediately",
          timestamp: Date.now(),
          messageId: "msg-1",
        },
      ];

      const result = formatUserGuidance(interventions);

      expect(result.hasUrgentRequest).toBe(true);
      expect(result.summary).toContain("URGENT REQUEST");
    });

    it("should detect urgent requests - 'immediately'", () => {
      const interventions: UserIntervention[] = [
        {
          content: "Accept immediately if under $25",
          timestamp: Date.now(),
          messageId: "msg-1",
        },
      ];

      const result = formatUserGuidance(interventions);

      expect(result.hasUrgentRequest).toBe(true);
    });

    it("should detect urgent requests - 'must'", () => {
      const interventions: UserIntervention[] = [
        {
          content: "We must close this deal today",
          timestamp: Date.now(),
          messageId: "msg-1",
        },
      ];

      const result = formatUserGuidance(interventions);

      expect(result.hasUrgentRequest).toBe(true);
    });

    it("should detect urgent requests - 'critical'", () => {
      const interventions: UserIntervention[] = [
        {
          content: "This is critical for the project",
          timestamp: Date.now(),
          messageId: "msg-1",
        },
      ];

      const result = formatUserGuidance(interventions);

      expect(result.hasUrgentRequest).toBe(true);
    });

    it("should include instruction for agent", () => {
      const interventions: UserIntervention[] = [
        {
          content: "Focus on payment terms",
          timestamp: Date.now(),
          messageId: "msg-1",
        },
      ];

      const result = formatUserGuidance(interventions);

      expect(result.summary).toContain("MUST incorporate");
    });
  });

  describe("parseUserInstructions", () => {
    it("should parse price limit - 'below'", () => {
      const result = parseUserInstructions("Keep it below $25 per unit");
      expect(result.priceLimit).toBe(25);
    });

    it("should parse price limit - 'max'", () => {
      const result = parseUserInstructions("Max $30 is acceptable");
      expect(result.priceLimit).toBe(30);
    });

    it("should parse price limit - 'no more than'", () => {
      const result = parseUserInstructions("No more than $22.50");
      expect(result.priceLimit).toBe(22.5);
    });

    it("should parse price limit - 'under'", () => {
      const result = parseUserInstructions("Stay under $28");
      expect(result.priceLimit).toBe(28);
    });

    it("should parse price limit - 'less than'", () => {
      const result = parseUserInstructions("Less than 35");
      expect(result.priceLimit).toBe(35);
    });

    it("should parse price limit - price first format", () => {
      const result = parseUserInstructions("$24 max is our budget");
      expect(result.priceLimit).toBe(24);
    });

    it("should parse lead time limit - 'within'", () => {
      const result = parseUserInstructions("We need it within 30 days");
      expect(result.leadTimeLimit).toBe(30);
    });

    it("should parse lead time limit - 'under X days'", () => {
      const result = parseUserInstructions("Delivery under 45 days");
      expect(result.leadTimeLimit).toBe(45);
    });

    it("should parse lead time limit - 'X days max'", () => {
      const result = parseUserInstructions("25 days max for delivery");
      expect(result.leadTimeLimit).toBe(25);
    });

    it("should detect acceptance instruction - 'accept if'", () => {
      const result = parseUserInstructions("Accept if they offer under $23");
      expect(result.acceptIfMet).toBe(true);
    });

    it("should detect acceptance instruction - 'take the deal'", () => {
      const result = parseUserInstructions("Take the deal at $24");
      expect(result.acceptIfMet).toBe(true);
    });

    it("should detect acceptance instruction - 'go ahead'", () => {
      const result = parseUserInstructions("Go ahead with Supplier 2");
      expect(result.acceptIfMet).toBe(true);
    });

    it("should detect acceptance instruction - 'close the deal'", () => {
      const result = parseUserInstructions("Close the deal now");
      expect(result.acceptIfMet).toBe(true);
    });

    it("should detect walkaway instruction - 'walk away'", () => {
      const result = parseUserInstructions("Walk away from this deal");
      expect(result.walkAway).toBe(true);
    });

    it("should detect walkaway instruction - 'end negotiation'", () => {
      const result = parseUserInstructions("End the negotiation now");
      expect(result.walkAway).toBe(true);
    });

    it("should detect walkaway instruction - 'stop negotiating'", () => {
      const result = parseUserInstructions("Stop negotiating with them");
      expect(result.walkAway).toBe(true);
    });

    it("should detect walkaway instruction - 'cancel'", () => {
      const result = parseUserInstructions("Cancel the deal");
      expect(result.walkAway).toBe(true);
    });

    it("should detect walkaway instruction - 'terminate'", () => {
      const result = parseUserInstructions("Terminate negotiations");
      expect(result.walkAway).toBe(true);
    });

    it("should parse focus areas - price", () => {
      const result = parseUserInstructions("Focus on price reduction");
      expect(result.focusAreas).toContain("price");
    });

    it("should parse focus areas - lead time", () => {
      const result = parseUserInstructions("Prioritize lead time");
      expect(result.focusAreas).toContain("lead_time");
    });

    it("should parse focus areas - quality", () => {
      const result = parseUserInstructions("Emphasize quality");
      expect(result.focusAreas).toContain("quality");
    });

    it("should parse focus areas - payment terms", () => {
      const result = parseUserInstructions("Focus on payment terms");
      expect(result.focusAreas).toContain("payment_terms");
    });

    it("should parse multiple instructions", () => {
      const result = parseUserInstructions(
        "Accept if under $25 within 30 days. Walk away otherwise."
      );

      expect(result.priceLimit).toBe(25);
      expect(result.leadTimeLimit).toBe(30);
      expect(result.acceptIfMet).toBe(true);
      expect(result.walkAway).toBe(true);
    });

    it("should return empty object for no special instructions", () => {
      const result = parseUserInstructions("Good luck with the negotiation");

      expect(result.priceLimit).toBeUndefined();
      expect(result.leadTimeLimit).toBeUndefined();
      expect(result.acceptIfMet).toBeUndefined();
      expect(result.walkAway).toBeUndefined();
      expect(result.focusAreas).toBeUndefined();
    });
  });

  describe("isUrgentMessage", () => {
    it("should return true for urgent keywords", () => {
      expect(isUrgentMessage("This is urgent")).toBe(true);
      expect(isUrgentMessage("Do this immediately")).toBe(true);
      expect(isUrgentMessage("ASAP please")).toBe(true);
      expect(isUrgentMessage("Must have now")).toBe(true);
      expect(isUrgentMessage("Critical issue")).toBe(true);
    });

    it("should return false for normal messages", () => {
      expect(isUrgentMessage("Try to get a better price")).toBe(false);
      expect(isUrgentMessage("Consider this option")).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(isUrgentMessage("URGENT")).toBe(true);
      expect(isUrgentMessage("Urgent")).toBe(true);
      expect(isUrgentMessage("urgent")).toBe(true);
    });
  });

  describe("isWalkAwayInstruction", () => {
    it("should detect various walkaway phrases", () => {
      expect(isWalkAwayInstruction("Walk away")).toBe(true);
      expect(isWalkAwayInstruction("End negotiation")).toBe(true);
      expect(isWalkAwayInstruction("Stop negotiating")).toBe(true);
      expect(isWalkAwayInstruction("Cancel the deal")).toBe(true);
      expect(isWalkAwayInstruction("Terminate")).toBe(true);
      expect(isWalkAwayInstruction("Abort mission")).toBe(true);
    });

    it("should return false for non-walkaway messages", () => {
      expect(isWalkAwayInstruction("Push harder on price")).toBe(false);
      expect(isWalkAwayInstruction("Keep trying")).toBe(false);
    });
  });

  describe("combineGuidance", () => {
    it("should combine existing and new interventions", () => {
      const existing: FormattedGuidance = {
        summary: "Previous guidance",
        interventions: [
          { content: "Old guidance", timestamp: 1000, messageId: "msg-1" },
        ],
        hasUrgentRequest: false,
      };

      const newInterventions: UserIntervention[] = [
        { content: "New guidance", timestamp: 2000, messageId: "msg-2" },
      ];

      const result = combineGuidance(existing, newInterventions);

      expect(result.interventions).toHaveLength(2);
      expect(result.summary).toContain("Old guidance");
      expect(result.summary).toContain("New guidance");
    });

    it("should handle undefined existing guidance", () => {
      const newInterventions: UserIntervention[] = [
        { content: "New guidance", timestamp: 2000, messageId: "msg-2" },
      ];

      const result = combineGuidance(undefined, newInterventions);

      expect(result.interventions).toHaveLength(1);
      expect(result.summary).toContain("New guidance");
    });

    it("should handle empty new interventions", () => {
      const existing: FormattedGuidance = {
        summary: "Existing",
        interventions: [
          { content: "Existing", timestamp: 1000, messageId: "msg-1" },
        ],
        hasUrgentRequest: false,
      };

      const result = combineGuidance(existing, []);

      expect(result.interventions).toHaveLength(1);
    });
  });

  describe("buildGuidanceContextString", () => {
    it("should return empty string for empty guidance", () => {
      const guidance: FormattedGuidance = {
        summary: "",
        interventions: [],
        hasUrgentRequest: false,
      };

      const result = buildGuidanceContextString(guidance);

      expect(result).toBe("");
    });

    it("should include summary in context", () => {
      const guidance: FormattedGuidance = {
        summary: "## User Guidance\n- Focus on price",
        interventions: [
          { content: "Focus on price", timestamp: Date.now(), messageId: "1" },
        ],
        hasUrgentRequest: false,
      };

      const result = buildGuidanceContextString(guidance);

      expect(result).toContain("Focus on price");
      expect(result).toContain("Consider the above guidance");
    });

    it("should include critical message for urgent requests", () => {
      const guidance: FormattedGuidance = {
        summary: "## User Guidance\n- URGENT: Accept now",
        interventions: [
          { content: "URGENT: Accept now", timestamp: Date.now(), messageId: "1" },
        ],
        hasUrgentRequest: true,
      };

      const result = buildGuidanceContextString(guidance);

      expect(result).toContain("CRITICAL");
      expect(result).toContain("Follow them precisely");
    });
  });
});

