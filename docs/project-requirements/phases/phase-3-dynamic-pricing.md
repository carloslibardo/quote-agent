# Phase 3: Dynamic Pricing via Tool Outputs

## Overview

Parse actual negotiated offers from tool call outputs instead of using predetermined mathematical calculations. This makes negotiations genuinely dynamic.

## Current Problem

Prices are calculated mathematically, ignoring the conversation:

```typescript
// Current: Predetermined pricing
const basePrice = product.targetFob * supplier.marginMultiplier;
currentDiscount = Math.min(
  round * supplier.priceFlexibility * 0.5,
  supplier.priceFlexibility
);
const finalPrice = basePrice * (1 - currentDiscount);
```

The agent's messages are purely cosmetic - they don't influence the actual offer terms.

## Solution

Extract offers from tool calls and track offer history:

```typescript
// New: Parse tool outputs for actual terms
const toolResult = extractToolCall(agentResponse, 'propose-offer');
if (toolResult) {
  currentOffer = {
    unitPrice: toolResult.offer.unitPrice,
    leadTimeDays: toolResult.offer.leadTimeDays,
    paymentTerms: toolResult.offer.paymentTerms,
  };
  offerHistory.push({ round, offer: currentOffer, source: 'supplier' });
}
```

## Implementation Details

### 1. Create Tool Parser (`src/mastra/utils/tool-parser.ts`)

```typescript
import type { CoreToolResult } from 'ai';

export interface ParsedOffer {
  unitPrice: number;
  leadTimeDays: number;
  paymentTerms: string;
  notes?: string;
}

export interface ToolCallResult {
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

/**
 * Extract a specific tool call from agent response
 */
export function extractToolCall(
  response: { toolCalls?: CoreToolResult[] },
  toolName: string
): ToolCallResult | null {
  if (!response.toolCalls || response.toolCalls.length === 0) {
    return null;
  }

  const toolCall = response.toolCalls.find(tc => tc.toolName === toolName);
  if (!toolCall) return null;

  return {
    toolName: toolCall.toolName,
    toolCallId: toolCall.toolCallId,
    args: toolCall.args as Record<string, unknown>,
    result: toolCall.result as Record<string, unknown>,
  };
}

/**
 * Extract offer from propose-offer or counter-offer tool call
 */
export function extractOfferFromToolCall(
  response: { toolCalls?: CoreToolResult[] }
): ParsedOffer | null {
  // Check for propose-offer
  const proposeCall = extractToolCall(response, 'propose-offer');
  if (proposeCall?.result?.offer) {
    return proposeCall.result.offer as ParsedOffer;
  }

  // Check for counter-offer
  const counterCall = extractToolCall(response, 'counter-offer');
  if (counterCall?.result?.counterOffer) {
    return counterCall.result.counterOffer as ParsedOffer;
  }

  return null;
}

/**
 * Check if negotiation ended with accept or reject
 */
export function extractNegotiationOutcome(
  response: { toolCalls?: CoreToolResult[] }
): { status: 'accepted' | 'rejected' | 'impasse' | 'ongoing'; offer?: ParsedOffer } {
  // Check for accept
  const acceptCall = extractToolCall(response, 'accept-offer');
  if (acceptCall?.result?.status === 'accepted') {
    return {
      status: 'accepted',
      offer: acceptCall.result.acceptedTerms as ParsedOffer,
    };
  }

  // Check for reject
  const rejectCall = extractToolCall(response, 'reject-offer');
  if (rejectCall?.result?.status === 'impasse') {
    return { status: 'impasse' };
  }
  if (rejectCall?.result?.status === 'rejected') {
    return { status: 'rejected' };
  }

  return { status: 'ongoing' };
}

/**
 * Validate offer is within acceptable bounds
 */
export function validateOffer(
  offer: ParsedOffer,
  constraints: {
    minPrice?: number;
    maxPrice?: number;
    maxLeadTime?: number;
    allowedPaymentTerms?: string[];
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (constraints.minPrice && offer.unitPrice < constraints.minPrice) {
    errors.push(`Unit price ${offer.unitPrice} below minimum ${constraints.minPrice}`);
  }
  if (constraints.maxPrice && offer.unitPrice > constraints.maxPrice) {
    errors.push(`Unit price ${offer.unitPrice} above maximum ${constraints.maxPrice}`);
  }
  if (constraints.maxLeadTime && offer.leadTimeDays > constraints.maxLeadTime) {
    errors.push(`Lead time ${offer.leadTimeDays} days exceeds maximum ${constraints.maxLeadTime}`);
  }
  if (constraints.allowedPaymentTerms && !constraints.allowedPaymentTerms.includes(offer.paymentTerms)) {
    errors.push(`Payment terms ${offer.paymentTerms} not in allowed list`);
  }

  return { valid: errors.length === 0, errors };
}
```

### 2. Create Offer Tracker (`src/mastra/utils/offer-tracker.ts`)

```typescript
export interface OfferHistoryEntry {
  round: number;
  timestamp: number;
  source: 'brand' | 'supplier';
  offer: ParsedOffer;
  toolCallId?: string;
}

export class OfferTracker {
  private history: OfferHistoryEntry[] = [];
  private supplierId: number;

  constructor(supplierId: number) {
    this.supplierId = supplierId;
  }

  addOffer(entry: Omit<OfferHistoryEntry, 'timestamp'>): void {
    this.history.push({
      ...entry,
      timestamp: Date.now(),
    });
  }

  getLatestOffer(): OfferHistoryEntry | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  getOfferBySource(source: 'brand' | 'supplier'): OfferHistoryEntry | null {
    const filtered = this.history.filter(h => h.source === source);
    return filtered.length > 0 ? filtered[filtered.length - 1] : null;
  }

  getPriceProgression(): number[] {
    return this.history.map(h => h.offer.unitPrice);
  }

  hasPriceImproved(windowSize: number = 3): boolean {
    if (this.history.length < windowSize) return true;
    
    const recent = this.history.slice(-windowSize);
    const prices = recent.map(h => h.offer.unitPrice);
    
    // Price should be decreasing (improving for buyer)
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] < prices[i - 1]) return true;
    }
    return false;
  }

  calculatePriceGap(): number | null {
    const brandOffer = this.getOfferBySource('brand');
    const supplierOffer = this.getOfferBySource('supplier');
    
    if (!brandOffer || !supplierOffer) return null;
    
    return Math.abs(brandOffer.offer.unitPrice - supplierOffer.offer.unitPrice);
  }

  getHistory(): OfferHistoryEntry[] {
    return [...this.history];
  }
}
```

### 3. Update Negotiation Flow

```typescript
async function runSupplierNegotiation(
  supplierId: SupplierId,
  context: NegotiationContext,
  callbacks: NegotiationCallbacks
): Promise<NegotiationResult> {
  const offerTracker = new OfferTracker(supplierId);
  const supplierAgent = createSupplierAgent(supplierId);
  const brandAgent = createBrandAgentWithContext(context);
  
  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Brand turn
    const brandResponse = await brandAgent.generate(buildMessages(context, round));
    await callbacks.onMessage(context.negotiationId, {
      sender: 'brand',
      content: brandResponse.text,
    });
    
    // Extract brand offer if present
    const brandOffer = extractOfferFromToolCall(brandResponse);
    if (brandOffer) {
      offerTracker.addOffer({ round, source: 'brand', offer: brandOffer });
    }
    
    // Check for brand acceptance/rejection
    const brandOutcome = extractNegotiationOutcome(brandResponse);
    if (brandOutcome.status === 'accepted') {
      return buildCompletedResult(supplierId, brandOutcome.offer!, offerTracker);
    }
    if (brandOutcome.status === 'impasse') {
      return buildImpasseResult(supplierId, offerTracker);
    }
    
    // Supplier turn
    const supplierResponse = await supplierAgent.generate(
      buildMessages(context, round, brandResponse)
    );
    await callbacks.onMessage(context.negotiationId, {
      sender: 'supplier',
      content: supplierResponse.text,
    });
    
    // Extract supplier offer
    const supplierOffer = extractOfferFromToolCall(supplierResponse);
    if (supplierOffer) {
      offerTracker.addOffer({ round, source: 'supplier', offer: supplierOffer });
      await callbacks.onOfferReceived(context.negotiationId, supplierOffer);
    }
    
    // Check for supplier acceptance
    const supplierOutcome = extractNegotiationOutcome(supplierResponse);
    if (supplierOutcome.status === 'accepted') {
      return buildCompletedResult(supplierId, supplierOutcome.offer!, offerTracker);
    }
  }
  
  // Max rounds reached - use last offer
  return buildCompletedResult(supplierId, offerTracker.getLatestOffer()!.offer, offerTracker);
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/mastra/workflows/negotiation-workflow.ts` | Use tool parser, track offers |
| `src/mastra/tools/negotiation-tools.ts` | Add offer validation |

## New Files

| File | Purpose |
|------|---------|
| `src/mastra/utils/tool-parser.ts` | Extract tool calls from responses |
| `src/mastra/utils/offer-tracker.ts` | Track offer history and progression |

## Test Requirements

### Unit Tests (`src/__tests__/utils/tool-parser.test.ts`)

```typescript
describe('Tool Parser', () => {
  describe('extractToolCall', () => {
    it('should extract propose-offer tool call', () => {
      const response = {
        toolCalls: [{
          toolName: 'propose-offer',
          toolCallId: 'call-123',
          args: { supplierId: 1, offer: mockOffer },
          result: { success: true, offer: mockOffer },
        }],
      };
      
      const result = extractToolCall(response, 'propose-offer');
      expect(result?.toolName).toBe('propose-offer');
      expect(result?.result.offer).toEqual(mockOffer);
    });

    it('should return null for missing tool call', () => {
      const response = { toolCalls: [] };
      expect(extractToolCall(response, 'propose-offer')).toBeNull();
    });
  });

  describe('extractOfferFromToolCall', () => {
    it('should extract offer from propose-offer', () => {
      // ...
    });

    it('should extract offer from counter-offer', () => {
      // ...
    });
  });

  describe('validateOffer', () => {
    it('should validate offer within bounds', () => {
      const offer = { unitPrice: 25, leadTimeDays: 30, paymentTerms: '30/70' };
      const result = validateOffer(offer, { minPrice: 20, maxPrice: 50 });
      expect(result.valid).toBe(true);
    });

    it('should reject offer below minimum price', () => {
      const offer = { unitPrice: 10, leadTimeDays: 30, paymentTerms: '30/70' };
      const result = validateOffer(offer, { minPrice: 20 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('below minimum'));
    });
  });
});
```

### Unit Tests (`src/__tests__/utils/offer-tracking.test.ts`)

```typescript
describe('Offer Tracker', () => {
  it('should track offer history', () => {
    const tracker = new OfferTracker(1);
    tracker.addOffer({ round: 0, source: 'supplier', offer: mockOffer1 });
    tracker.addOffer({ round: 0, source: 'brand', offer: mockOffer2 });
    
    expect(tracker.getHistory()).toHaveLength(2);
  });

  it('should detect price improvement', () => {
    const tracker = new OfferTracker(1);
    tracker.addOffer({ round: 0, source: 'supplier', offer: { unitPrice: 30, ... } });
    tracker.addOffer({ round: 1, source: 'supplier', offer: { unitPrice: 28, ... } });
    tracker.addOffer({ round: 2, source: 'supplier', offer: { unitPrice: 26, ... } });
    
    expect(tracker.hasPriceImproved()).toBe(true);
  });

  it('should calculate price gap between parties', () => {
    const tracker = new OfferTracker(1);
    tracker.addOffer({ round: 0, source: 'supplier', offer: { unitPrice: 30, ... } });
    tracker.addOffer({ round: 0, source: 'brand', offer: { unitPrice: 25, ... } });
    
    expect(tracker.calculatePriceGap()).toBe(5);
  });
});
```

## Acceptance Criteria

1. [ ] Offers are extracted from tool call results
2. [ ] Offer history is tracked throughout negotiation
3. [ ] Final offer reflects actual negotiated terms, not calculations
4. [ ] Price progression can be analyzed
5. [ ] Invalid offers are detected and handled
6. [ ] All tests pass

## Dependencies

- Phase 1: Agent Integration (agents must use tools)
- Phase 2: Parallel + Persistence (for offer callbacks)

## Estimated Effort

2 days

