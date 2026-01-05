# Phase 2: Parallel Negotiations + Real-Time Persistence

## Overview

Run supplier negotiations concurrently instead of sequentially, with real-time message persistence to Convex for live UI updates.

## Current Problem

Negotiations run sequentially in a for loop:

```typescript
// Current: Sequential processing
for (const supplierId of [1, 2, 3] as const) {
  const supplier = SUPPLIER_DATA[supplierId];
  const messages = [];
  
  for (let round = 0; round < maxRounds; round++) {
    // Generate brand message
    // Generate supplier response
    // Add to messages array
  }
  
  negotiations.push({...});
}
```

This means:
- Supplier 3 waits for Suppliers 1 and 2 to complete
- Total time = sum of all negotiations
- No real-time UI updates during workflow execution

## Solution

### Parallel Execution

```typescript
// New: Parallel with callbacks
const negotiations = await Promise.all([
  runSupplierNegotiation(1, context, callbacks),
  runSupplierNegotiation(2, context, callbacks),
  runSupplierNegotiation(3, context, callbacks),
]);
```

### Real-Time Persistence

```typescript
interface NegotiationCallbacks {
  onMessage: (negotiationId: string, message: Message) => Promise<void>;
  onStatusChange: (negotiationId: string, status: NegotiationStatus) => Promise<void>;
  onOfferReceived: (negotiationId: string, offer: Offer) => Promise<void>;
}

async function runSupplierNegotiation(
  supplierId: SupplierId,
  context: NegotiationContext,
  callbacks: NegotiationCallbacks
): Promise<NegotiationResult> {
  const negotiationId = context.negotiationIds[supplierId];
  
  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Generate brand message
    const brandResponse = await generateBrandResponse(context, round);
    await callbacks.onMessage(negotiationId, {
      sender: 'brand',
      content: brandResponse.text,
      timestamp: Date.now(),
    });
    
    // Generate supplier response
    const supplierResponse = await generateSupplierResponse(supplierId, context, round);
    await callbacks.onMessage(negotiationId, {
      sender: 'supplier',
      content: supplierResponse.text,
      timestamp: Date.now(),
    });
    
    // Check for completion
    if (isNegotiationComplete(supplierResponse)) {
      await callbacks.onStatusChange(negotiationId, 'completed');
      break;
    }
  }
  
  return buildNegotiationResult(supplierId, context);
}
```

## Implementation Details

### 1. Create Message Persister (`src/mastra/storage/message-persister.ts`)

```typescript
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../server/_generated/api';

export interface MessagePersisterConfig {
  convexUrl: string;
}

export class MessagePersister {
  private client: ConvexHttpClient;

  constructor(config: MessagePersisterConfig) {
    this.client = new ConvexHttpClient(config.convexUrl);
  }

  async persistMessage(
    negotiationId: string,
    sender: 'brand' | 'supplier' | 'user',
    content: string,
    metadata?: {
      model?: string;
      tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
      toolCalls?: string[];
    }
  ): Promise<string> {
    return await this.client.mutation(api.negotiations.addMessage, {
      negotiationId: negotiationId as Id<'negotiations'>,
      sender,
      content,
      metadata,
    });
  }

  async updateNegotiationStatus(
    negotiationId: string,
    status: 'active' | 'completed' | 'impasse',
    roundCount?: number,
    finalOffer?: FinalOffer
  ): Promise<void> {
    await this.client.mutation(api.negotiations.updateNegotiationStatus, {
      negotiationId: negotiationId as Id<'negotiations'>,
      status,
      roundCount,
      finalOffer,
    });
  }
}
```

### 2. Update Workflow Step (`negotiation-workflow.ts`)

```typescript
const runNegotiations = createStep({
  id: "run-negotiations",
  inputSchema: workflowInputSchema,
  outputSchema: negotiationsOutputSchema,
  execute: async ({ inputData }) => {
    const { quoteId, products, priorities, userNotes, negotiationIds } = inputData;
    
    // Initialize persister if Convex URL available
    const persister = process.env.CONVEX_URL 
      ? new MessagePersister({ convexUrl: process.env.CONVEX_URL })
      : null;

    // Create callbacks
    const createCallbacks = (negotiationId: string): NegotiationCallbacks => ({
      onMessage: async (nId, message) => {
        if (persister) {
          await persister.persistMessage(nId, message.sender, message.content);
        }
      },
      onStatusChange: async (nId, status) => {
        if (persister) {
          await persister.updateNegotiationStatus(nId, status);
        }
      },
      onOfferReceived: async (nId, offer) => {
        // Store offer for later evaluation
      },
    });

    // Run negotiations in parallel
    const context = buildNegotiationContext(inputData);
    
    const results = await Promise.all([
      runSupplierNegotiation(1, context, createCallbacks(negotiationIds[0])),
      runSupplierNegotiation(2, context, createCallbacks(negotiationIds[1])),
      runSupplierNegotiation(3, context, createCallbacks(negotiationIds[2])),
    ]);

    return {
      quoteId,
      priorities,
      negotiations: results,
    };
  },
});
```

### 3. Add Streaming Message Mutation (`src/server/negotiations.ts`)

```typescript
/**
 * Stream a message to a negotiation with immediate persistence
 * Optimized for real-time updates during workflow execution
 */
export const streamMessage = mutation({
  args: {
    negotiationId: v.id("negotiations"),
    sender: v.union(v.literal("brand"), v.literal("supplier")),
    content: v.string(),
    isPartial: v.optional(v.boolean()), // For streaming partial messages
    metadata: v.optional(v.object({
      model: v.optional(v.string()),
      toolCalls: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    const negotiation = await ctx.db.get(args.negotiationId);
    if (!negotiation) throw new Error("Negotiation not found");

    const messageId = await ctx.db.insert("messages", {
      negotiationId: args.negotiationId,
      sender: args.sender,
      content: args.content,
      timestamp: Date.now(),
      metadata: args.metadata,
    });

    return { messageId, timestamp: Date.now() };
  },
});
```

### 4. Input Schema Update

Add negotiation IDs to workflow input:

```typescript
const workflowInputSchema = z.object({
  quoteId: z.string(),
  userId: z.string(),
  products: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
  })),
  userNotes: z.string().optional(),
  priorities: prioritiesSchema,
  negotiationIds: z.array(z.string()).length(3), // NEW: Pre-created negotiation IDs
});
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/mastra/workflows/negotiation-workflow.ts` | Parallel execution, callback integration |
| `src/server/negotiations.ts` | Add streamMessage mutation |
| `src/server/quotes.ts` | Pass negotiationIds to workflow |

## New Files

| File | Purpose |
|------|---------|
| `src/mastra/storage/message-persister.ts` | Real-time Convex message persistence |

## Test Requirements

### Unit Tests (`src/__tests__/workflows/parallel-execution.test.ts`)

```typescript
describe('Parallel Negotiation Execution', () => {
  it('should run all three supplier negotiations concurrently', async () => {
    const startTime = Date.now();
    const results = await runParallelNegotiations(mockContext);
    const duration = Date.now() - startTime;
    
    // Should complete in roughly the time of one negotiation, not three
    expect(results).toHaveLength(3);
    expect(duration).toBeLessThan(SINGLE_NEGOTIATION_TIME * 1.5);
  });

  it('should isolate failures between suppliers', async () => {
    // Mock supplier 2 to fail
    // Suppliers 1 and 3 should still complete
  });

  it('should call onMessage callback for each message', async () => {
    const onMessageMock = vi.fn();
    await runSupplierNegotiation(1, context, { onMessage: onMessageMock });
    
    // At least 2 messages per round (brand + supplier)
    expect(onMessageMock).toHaveBeenCalledTimes(expect.any(Number));
    expect(onMessageMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
```

### Unit Tests (`src/__tests__/storage/message-persistence.test.ts`)

```typescript
describe('Message Persister', () => {
  it('should persist message to Convex', async () => {
    const persister = new MessagePersister({ convexUrl: 'mock://url' });
    // Mock Convex client
    
    await persister.persistMessage('neg-123', 'brand', 'Test message');
    
    // Verify mutation was called
  });

  it('should update negotiation status', async () => {
    const persister = new MessagePersister({ convexUrl: 'mock://url' });
    
    await persister.updateNegotiationStatus('neg-123', 'completed', 3, mockFinalOffer);
    
    // Verify status update mutation
  });

  it('should handle connection errors gracefully', async () => {
    // Mock connection failure
    // Should not throw, but log error
  });
});
```

## Acceptance Criteria

1. [ ] All three supplier negotiations run concurrently
2. [ ] Messages are persisted to Convex as they are generated
3. [ ] UI receives real-time updates during negotiation
4. [ ] Failures in one negotiation don't affect others
5. [ ] Total execution time is reduced compared to sequential
6. [ ] All tests pass with mocked Convex client

## Dependencies

- Phase 1: Agent Integration (for agent.generate usage)

## Estimated Effort

2 days

