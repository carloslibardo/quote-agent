/**
 * User Guidance Utility
 *
 * Format and parse user interventions for agent consumption.
 * Enables users to influence negotiation strategy in real-time.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Raw user intervention message
 */
export interface UserIntervention {
  content: string;
  timestamp: number;
  messageId: string;
}

/**
 * Formatted guidance for agent consumption
 */
export interface FormattedGuidance {
  summary: string;
  interventions: UserIntervention[];
  hasUrgentRequest: boolean;
}

/**
 * Parsed instructions from user message
 */
export interface ParsedInstructions {
  priceLimit?: number;
  leadTimeLimit?: number;
  acceptIfMet?: boolean;
  walkAway?: boolean;
  focusAreas?: string[];
}

// ============================================================================
// Constants
// ============================================================================

const URGENCY_KEYWORDS = [
  "urgent",
  "immediately",
  "stop",
  "cancel",
  "must",
  "required",
  "asap",
  "now",
  "critical",
];

const WALK_AWAY_PATTERNS = [
  /walk\s*away/i,
  /end\s*(the\s*)?negotiation/i,
  /stop\s*(negotiating|talking)/i,
  /cancel\s*(the\s*)?(deal|negotiation)/i,
  /terminate/i,
  /abort/i,
];

const ACCEPT_PATTERNS = [
  /accept\s*(if|when)/i,
  /take\s*(the\s*)?(deal|offer)/i,
  /go\s*ahead/i,
  /agree\s*(to|if)/i,
  /approve/i,
  /close\s*(the\s*)?deal/i,
];

// ============================================================================
// Functions
// ============================================================================

/**
 * Format user interventions for agent consumption
 */
export function formatUserGuidance(
  interventions: UserIntervention[]
): FormattedGuidance {
  if (interventions.length === 0) {
    return {
      summary: "",
      interventions: [],
      hasUrgentRequest: false,
    };
  }

  // Detect urgency keywords
  const hasUrgentRequest = interventions.some((i) =>
    URGENCY_KEYWORDS.some((keyword) =>
      i.content.toLowerCase().includes(keyword)
    )
  );

  // Build summary for agent
  const guidancePoints = interventions.map((i) => `- ${i.content}`);
  const messageLabel = interventions.length === 1 ? "message" : "messages";

  let summary = `## User Guidance (${interventions.length} ${messageLabel})\n`;

  if (hasUrgentRequest) {
    summary += "\n⚠️ URGENT REQUEST - Prioritize user guidance\n";
  }

  summary += `\n${guidancePoints.join("\n")}\n`;
  summary += "\nYou MUST incorporate this guidance into your negotiation strategy.";

  return {
    summary: summary.trim(),
    interventions,
    hasUrgentRequest,
  };
}

/**
 * Parse specific instructions from user message
 */
export function parseUserInstructions(message: string): ParsedInstructions {
  const instructions: ParsedInstructions = {};

  // Parse price limit (e.g., "don't go above $25")
  const pricePatterns = [
    /(?:max(?:imum)?|limit|no more than|under|below|less than)\s*\$?(\d+(?:\.\d{2})?)/i,
    /\$(\d+(?:\.\d{2})?)\s*(?:max|limit|or less|or under)/i,
    /price\s*(?:limit|cap)\s*(?:of|at)?\s*\$?(\d+(?:\.\d{2})?)/i,
  ];

  for (const pattern of pricePatterns) {
    const match = message.match(pattern);
    if (match) {
      instructions.priceLimit = parseFloat(match[1]);
      break;
    }
  }

  // Parse lead time limit (e.g., "need it within 30 days")
  const leadTimePatterns = [
    /(?:within|under|less than|no more than|max(?:imum)?)\s*(\d+)\s*days?/i,
    /(\d+)\s*days?\s*(?:max|or less|or faster)/i,
    /delivery\s*(?:by|within)?\s*(\d+)\s*days?/i,
  ];

  for (const pattern of leadTimePatterns) {
    const match = message.match(pattern);
    if (match) {
      instructions.leadTimeLimit = parseInt(match[1], 10);
      break;
    }
  }

  // Parse acceptance instruction
  if (ACCEPT_PATTERNS.some((pattern) => pattern.test(message))) {
    instructions.acceptIfMet = true;
  }

  // Parse walkaway instruction
  if (WALK_AWAY_PATTERNS.some((pattern) => pattern.test(message))) {
    instructions.walkAway = true;
  }

  // Parse focus areas
  const focusAreas: string[] = [];
  if (/(?:focus|prioritize|emphasize)\s*(?:on\s*)?(?:the\s*)?price/i.test(message)) {
    focusAreas.push("price");
  }
  if (/(?:focus|prioritize|emphasize)\s*(?:on\s*)?(?:the\s*)?(?:lead\s*time|delivery|speed)/i.test(message)) {
    focusAreas.push("lead_time");
  }
  if (/(?:focus|prioritize|emphasize)\s*(?:on\s*)?(?:the\s*)?quality/i.test(message)) {
    focusAreas.push("quality");
  }
  if (/(?:focus|prioritize|emphasize)\s*(?:on\s*)?(?:the\s*)?payment/i.test(message)) {
    focusAreas.push("payment_terms");
  }

  if (focusAreas.length > 0) {
    instructions.focusAreas = focusAreas;
  }

  return instructions;
}

/**
 * Check if message contains urgent content
 */
export function isUrgentMessage(message: string): boolean {
  return URGENCY_KEYWORDS.some((keyword) =>
    message.toLowerCase().includes(keyword)
  );
}

/**
 * Check if message contains walkaway instruction
 */
export function isWalkAwayInstruction(message: string): boolean {
  return WALK_AWAY_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Combine multiple interventions into a single guidance
 */
export function combineGuidance(
  existing: FormattedGuidance | undefined,
  newInterventions: UserIntervention[]
): FormattedGuidance {
  const allInterventions = [
    ...(existing?.interventions ?? []),
    ...newInterventions,
  ];
  return formatUserGuidance(allInterventions);
}

/**
 * Build agent context string from user guidance
 */
export function buildGuidanceContextString(guidance: FormattedGuidance): string {
  if (!guidance.summary) {
    return "";
  }

  return `
---
${guidance.summary}
---

${guidance.hasUrgentRequest 
  ? "CRITICAL: The user has provided urgent instructions. Follow them precisely."
  : "Consider the above guidance when making your next move."
}
`;
}

