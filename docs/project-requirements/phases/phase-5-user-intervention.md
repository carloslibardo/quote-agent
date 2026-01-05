# Phase 5: User Intervention Integration

## Overview

Enable users to inject guidance during active negotiations, influencing the brand agent's behavior in real-time.

## Current Problem

The schema supports user messages, but the workflow ignores them:

```typescript
// Schema defines user as sender
sender: v.union(v.literal("brand"), v.literal("supplier"), v.literal("user"))

// But workflow never reads user messages
async function generateBrandMessage(context) {
  // Only uses previous brand/supplier messages
  // User interventions are ignored
}
```

Users can submit interventions through the UI, but they have no effect on the negotiation.

## Solution

Query and inject user messages before each brand agent turn:

```typescript
async function processRound(negotiationId, context, round) {
  // Check for user interventions since last round
  const userMessages = await getNewUserMessages(
    negotiationId, 
    context.lastProcessedTime
  );
  
  if (userMessages.length > 0) {
    // Inject user guidance into brand agent context
    context.userGuidance = formatUserGuidance(userMessages);
    context.lastProcessedTime = Date.now();
  }
  
  // Brand agent now considers user guidance
  const brandAgent = createBrandAgentWithContext({
    ...context,
    userGuidance: context.userGuidance,
  });
  
  return await brandAgent.generate(messages);
}
```

## Implementation Details

### 1. Add User Message Query (`src/server/negotiations.ts`)

```typescript
/**
 * Get user intervention messages since a specific timestamp
 */
export const getUserInterventionsSince = query({
  args: {
    negotiationId: v.id("negotiations"),
    sinceTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_negotiation", (q) => 
        q.eq("negotiationId", args.negotiationId)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("sender"), "user"),
          q.gt(q.field("timestamp"), args.sinceTimestamp)
        )
      )
      .order("asc")
      .collect();

    return messages;
  },
});

/**
 * Mark user interventions as processed
 */
export const markInterventionsProcessed = mutation({
  args: {
    negotiationId: v.id("negotiations"),
    messageIds: v.array(v.id("messages")),
    processedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Update each message with processed timestamp
    for (const messageId of args.messageIds) {
      await ctx.db.patch(messageId, {
        metadata: {
          processedAt: args.processedAt,
        },
      });
    }
  },
});
```

### 2. Create User Guidance Formatter

```typescript
// In src/mastra/utils/user-guidance.ts

export interface UserIntervention {
  content: string;
  timestamp: number;
  messageId: string;
}

export interface FormattedGuidance {
  summary: string;
  interventions: UserIntervention[];
  hasUrgentRequest: boolean;
}

/**
 * Format user interventions for agent consumption
 */
export function formatUserGuidance(interventions: UserIntervention[]): FormattedGuidance {
  if (interventions.length === 0) {
    return {
      summary: '',
      interventions: [],
      hasUrgentRequest: false,
    };
  }

  // Detect urgency keywords
  const urgencyKeywords = ['urgent', 'immediately', 'stop', 'cancel', 'must', 'required'];
  const hasUrgentRequest = interventions.some(i => 
    urgencyKeywords.some(keyword => 
      i.content.toLowerCase().includes(keyword)
    )
  );

  // Build summary for agent
  const guidancePoints = interventions.map(i => `- ${i.content}`);
  const summary = `
## User Guidance (${interventions.length} message${interventions.length > 1 ? 's' : ''})
${hasUrgentRequest ? '⚠️ URGENT REQUEST - Prioritize user guidance\n' : ''}
${guidancePoints.join('\n')}

You MUST incorporate this guidance into your negotiation strategy.
`;

  return {
    summary: summary.trim(),
    interventions,
    hasUrgentRequest,
  };
}

/**
 * Parse specific instructions from user message
 */
export function parseUserInstructions(message: string): {
  priceLimit?: number;
  leadTimeLimit?: number;
  acceptIfMet?: boolean;
  walkAway?: boolean;
} {
  const instructions: Record<string, unknown> = {};

  // Parse price limit (e.g., "don't go above $25")
  const priceMatch = message.match(/(?:max|limit|no more than|under|below)\s*\$?(\d+(?:\.\d{2})?)/i);
  if (priceMatch) {
    instructions.priceLimit = parseFloat(priceMatch[1]);
  }

  // Parse lead time limit (e.g., "need it within 30 days")
  const leadTimeMatch = message.match(/(?:within|under|less than|no more than)\s*(\d+)\s*days?/i);
  if (leadTimeMatch) {
    instructions.leadTimeLimit = parseInt(leadTimeMatch[1], 10);
  }

  // Parse acceptance instruction
  if (/accept\s+if|take\s+the\s+deal|go\s+ahead/i.test(message)) {
    instructions.acceptIfMet = true;
  }

  // Parse walkaway instruction
  if (/walk\s+away|end\s+negotiation|stop\s+talking/i.test(message)) {
    instructions.walkAway = true;
  }

  return instructions;
}
```

### 3. Update Brand Agent Instructions

```typescript
// In brand-agent.ts
export interface BrandAgentContext {
  priorities: Priorities;
  products: ProductSelection[];
  userNotes?: string;
  userGuidance?: FormattedGuidance;  // NEW
}

export function buildBrandAgentInstructions(context: BrandAgentContext): string {
  let instructions = `...existing base instructions...`;

  // Add user guidance section if present
  if (context.userGuidance && context.userGuidance.summary) {
    instructions += `

---
${context.userGuidance.summary}
---

${context.userGuidance.hasUrgentRequest ? 
  'CRITICAL: The user has provided urgent instructions. Follow them precisely.' : 
  'Consider the above guidance when making your next move.'
}
`;
  }

  return instructions;
}
```

### 4. Integrate with Negotiation Flow

```typescript
// In negotiation-workflow.ts

interface RoundContext {
  negotiationId: string;
  lastProcessedTime: number;
  userGuidance?: FormattedGuidance;
}

async function runSupplierNegotiation(
  supplierId: SupplierId,
  context: NegotiationContext,
  callbacks: NegotiationCallbacks
): Promise<NegotiationResult> {
  const roundContext: RoundContext = {
    negotiationId: context.negotiationIds[supplierId - 1],
    lastProcessedTime: context.startTime ?? Date.now(),
    userGuidance: undefined,
  };

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Check for user interventions before brand turn
    const userInterventions = await callbacks.getUserInterventions?.(
      roundContext.negotiationId,
      roundContext.lastProcessedTime
    );

    if (userInterventions && userInterventions.length > 0) {
      roundContext.userGuidance = formatUserGuidance(userInterventions);
      roundContext.lastProcessedTime = Date.now();
      
      // Check for walkaway instruction
      for (const intervention of userInterventions) {
        const parsed = parseUserInstructions(intervention.content);
        if (parsed.walkAway) {
          return {
            supplierId,
            status: 'impasse',
            roundCount: round + 1,
            impasseReason: 'User requested to end negotiation',
          };
        }
      }
    }

    // Create brand agent with current guidance
    const brandAgent = createBrandAgentWithContext({
      priorities: context.priorities,
      products: context.products,
      userNotes: context.userNotes,
      userGuidance: roundContext.userGuidance,
    });

    const brandResponse = await brandAgent.generate(messages);
    // ... rest of round logic
  }
}
```

### 5. Update Callbacks Interface

```typescript
interface NegotiationCallbacks {
  onMessage: (negotiationId: string, message: Message) => Promise<void>;
  onStatusChange: (negotiationId: string, status: NegotiationStatus) => Promise<void>;
  onOfferReceived: (negotiationId: string, offer: Offer) => Promise<void>;
  getUserInterventions?: (
    negotiationId: string, 
    sinceTimestamp: number
  ) => Promise<UserIntervention[]>;  // NEW
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/server/negotiations.ts` | Add getUserInterventionsSince query |
| `src/mastra/agents/brand-agent.ts` | Handle userGuidance in context |
| `src/mastra/workflows/negotiation-workflow.ts` | Query and process interventions |

## New Files

| File | Purpose |
|------|---------|
| `src/mastra/utils/user-guidance.ts` | Format and parse user interventions |

## Test Requirements

### Unit Tests (`src/__tests__/utils/user-guidance.test.ts`)

```typescript
describe('User Guidance', () => {
  describe('formatUserGuidance', () => {
    it('should format single intervention', () => {
      const interventions = [{
        content: 'Try to get a better price',
        timestamp: Date.now(),
        messageId: 'msg-1',
      }];
      
      const result = formatUserGuidance(interventions);
      
      expect(result.summary).toContain('Try to get a better price');
      expect(result.hasUrgentRequest).toBe(false);
    });

    it('should detect urgent requests', () => {
      const interventions = [{
        content: 'URGENT: Stop negotiating immediately',
        timestamp: Date.now(),
        messageId: 'msg-1',
      }];
      
      const result = formatUserGuidance(interventions);
      
      expect(result.hasUrgentRequest).toBe(true);
      expect(result.summary).toContain('URGENT');
    });

    it('should format multiple interventions', () => {
      const interventions = [
        { content: 'Push harder on price', timestamp: Date.now(), messageId: 'msg-1' },
        { content: 'Lead time is flexible', timestamp: Date.now(), messageId: 'msg-2' },
      ];
      
      const result = formatUserGuidance(interventions);
      
      expect(result.summary).toContain('2 messages');
      expect(result.interventions).toHaveLength(2);
    });
  });

  describe('parseUserInstructions', () => {
    it('should parse price limit', () => {
      const result = parseUserInstructions("Don't go above $25 per unit");
      expect(result.priceLimit).toBe(25);
    });

    it('should parse lead time limit', () => {
      const result = parseUserInstructions("We need it within 30 days");
      expect(result.leadTimeLimit).toBe(30);
    });

    it('should detect acceptance instruction', () => {
      const result = parseUserInstructions("Accept if they offer under $23");
      expect(result.acceptIfMet).toBe(true);
    });

    it('should detect walkaway instruction', () => {
      const result = parseUserInstructions("Walk away from this deal");
      expect(result.walkAway).toBe(true);
    });
  });
});
```

### Integration Tests (`src/__tests__/workflows/user-intervention.test.ts`)

```typescript
describe('User Intervention Integration', () => {
  it('should incorporate user guidance into brand agent response', async () => {
    const mockGetInterventions = vi.fn().mockResolvedValue([{
      content: 'Focus on getting a shorter lead time',
      timestamp: Date.now(),
      messageId: 'msg-1',
    }]);
    
    const callbacks = {
      ...mockCallbacks,
      getUserInterventions: mockGetInterventions,
    };
    
    await runSupplierNegotiation(1, mockContext, callbacks);
    
    expect(mockGetInterventions).toHaveBeenCalled();
    // Verify agent was created with guidance
  });

  it('should end negotiation on walkaway instruction', async () => {
    const mockGetInterventions = vi.fn().mockResolvedValue([{
      content: 'Stop negotiating, walk away',
      timestamp: Date.now(),
      messageId: 'msg-1',
    }]);
    
    const callbacks = {
      ...mockCallbacks,
      getUserInterventions: mockGetInterventions,
    };
    
    const result = await runSupplierNegotiation(1, mockContext, callbacks);
    
    expect(result.status).toBe('impasse');
    expect(result.impasseReason).toContain('User requested');
  });
});
```

### Timing Tests (`src/__tests__/workflows/intervention-timing.test.ts`)

```typescript
describe('Intervention Timing', () => {
  it('should only process new interventions since last round', async () => {
    // Round 1: No interventions
    // Round 2: Intervention added
    // Verify intervention is processed in round 2 only
  });

  it('should process interventions before each brand turn', async () => {
    // Verify timing of getUserInterventions calls
    // Should be called at start of each round
  });

  it('should update lastProcessedTime after processing', async () => {
    // Verify old interventions aren't re-processed
  });
});
```

## Acceptance Criteria

1. [ ] User interventions are queried before each brand turn
2. [ ] Interventions are formatted and included in agent instructions
3. [ ] Urgent requests are flagged and prioritized
4. [ ] Walkaway instructions immediately end negotiation
5. [ ] Price/lead time limits are parsed and respected
6. [ ] Processed interventions are tracked to avoid re-processing
7. [ ] All tests pass

## Dependencies

- Phase 1: Agent Integration (for dynamic agent instructions)

## Estimated Effort

1-2 days

