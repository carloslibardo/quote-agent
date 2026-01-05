# Phase 4: Intelligent Impasse Detection

## Overview

Implement multi-condition impasse detection to properly identify and handle negotiation deadlocks, instead of always marking negotiations as "completed."

## Current Problem

Negotiations always end as "completed" regardless of outcome:

```typescript
// Current: Status is hardcoded
negotiations.push({
  supplierId,
  status: "completed", // Never "impasse"
  finalOffer: { ... },
  messages,
});
```

This means:
- Failed negotiations appear successful
- No way to distinguish good deals from deadlocks
- Decision logic may evaluate poor/non-existent offers

## Solution

Multi-condition impasse detection with clear thresholds:

```typescript
const impasseConditions = {
  maxRoundsReached: roundCount >= MAX_ROUNDS && !hasAgreement,
  rejectToolCalled: hasToolCall('reject-offer', { isNegotiationEnded: true }),
  noProgressInRounds: !hasOfferImproved(last3Offers),
  priceGapTooLarge: priceGapPercent > IMPASSE_THRESHOLD,
};

if (Object.values(impasseConditions).some(Boolean)) {
  return { status: 'impasse', reason: getImpasseReason(impasseConditions) };
}
```

## Implementation Details

### 1. Create Impasse Detector (`src/mastra/utils/impasse-detector.ts`)

```typescript
import { OfferTracker, ParsedOffer } from './offer-tracker';

export interface ImpasseConditions {
  maxRoundsReached: boolean;
  explicitRejection: boolean;
  noProgressInRounds: boolean;
  priceGapTooLarge: boolean;
  leadTimeUnacceptable: boolean;
}

export interface ImpasseResult {
  isImpasse: boolean;
  conditions: ImpasseConditions;
  primaryReason: string | null;
  details: string;
}

export interface ImpasseDetectorConfig {
  maxRounds: number;
  progressWindowSize: number;
  priceGapThreshold: number;      // Percentage (e.g., 0.20 = 20%)
  maxAcceptableLeadTime: number;  // Days
}

const DEFAULT_CONFIG: ImpasseDetectorConfig = {
  maxRounds: 10,
  progressWindowSize: 3,
  priceGapThreshold: 0.25,        // 25% gap = impasse
  maxAcceptableLeadTime: 60,      // 60 days
};

export class ImpasseDetector {
  private config: ImpasseDetectorConfig;

  constructor(config: Partial<ImpasseDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  detect(
    currentRound: number,
    offerTracker: OfferTracker,
    explicitRejection: boolean,
    targetPrice?: number
  ): ImpasseResult {
    const conditions = this.evaluateConditions(
      currentRound,
      offerTracker,
      explicitRejection,
      targetPrice
    );

    const isImpasse = Object.values(conditions).some(Boolean);
    const primaryReason = this.getPrimaryReason(conditions);
    const details = this.buildDetailsMessage(conditions, offerTracker);

    return {
      isImpasse,
      conditions,
      primaryReason,
      details,
    };
  }

  private evaluateConditions(
    currentRound: number,
    offerTracker: OfferTracker,
    explicitRejection: boolean,
    targetPrice?: number
  ): ImpasseConditions {
    const latestOffer = offerTracker.getLatestOffer();
    const priceGap = this.calculatePriceGapPercent(offerTracker, targetPrice);

    return {
      maxRoundsReached: currentRound >= this.config.maxRounds,
      explicitRejection,
      noProgressInRounds: !offerTracker.hasPriceImproved(this.config.progressWindowSize),
      priceGapTooLarge: priceGap !== null && priceGap > this.config.priceGapThreshold,
      leadTimeUnacceptable: 
        latestOffer !== null && 
        latestOffer.offer.leadTimeDays > this.config.maxAcceptableLeadTime,
    };
  }

  private calculatePriceGapPercent(
    offerTracker: OfferTracker,
    targetPrice?: number
  ): number | null {
    const latestOffer = offerTracker.getLatestOffer();
    if (!latestOffer) return null;

    // Use brand's latest offer or target price as reference
    const brandOffer = offerTracker.getOfferBySource('brand');
    const referencePrice = brandOffer?.offer.unitPrice ?? targetPrice;
    
    if (!referencePrice) return null;

    const gap = Math.abs(latestOffer.offer.unitPrice - referencePrice);
    return gap / referencePrice;
  }

  private getPrimaryReason(conditions: ImpasseConditions): string | null {
    if (conditions.explicitRejection) return 'Explicit rejection by party';
    if (conditions.priceGapTooLarge) return 'Price gap exceeds threshold';
    if (conditions.noProgressInRounds) return 'No progress in recent rounds';
    if (conditions.maxRoundsReached) return 'Maximum rounds reached';
    if (conditions.leadTimeUnacceptable) return 'Lead time exceeds maximum';
    return null;
  }

  private buildDetailsMessage(
    conditions: ImpasseConditions,
    offerTracker: OfferTracker
  ): string {
    const parts: string[] = [];

    if (conditions.explicitRejection) {
      parts.push('Negotiation explicitly ended by one party.');
    }
    if (conditions.priceGapTooLarge) {
      const gap = offerTracker.calculatePriceGap();
      parts.push(`Price gap of $${gap?.toFixed(2)} exceeds acceptable threshold.`);
    }
    if (conditions.noProgressInRounds) {
      parts.push(`No price improvement in last ${this.config.progressWindowSize} rounds.`);
    }
    if (conditions.maxRoundsReached) {
      parts.push(`Maximum ${this.config.maxRounds} rounds reached without agreement.`);
    }
    if (conditions.leadTimeUnacceptable) {
      const offer = offerTracker.getLatestOffer();
      parts.push(`Lead time of ${offer?.offer.leadTimeDays} days exceeds ${this.config.maxAcceptableLeadTime}-day limit.`);
    }

    return parts.join(' ');
  }
}

/**
 * Quick check for impasse conditions
 */
export function checkForImpasse(
  round: number,
  offerTracker: OfferTracker,
  explicitRejection: boolean = false,
  config?: Partial<ImpasseDetectorConfig>
): ImpasseResult {
  const detector = new ImpasseDetector(config);
  return detector.detect(round, offerTracker, explicitRejection);
}
```

### 2. Track Rejection Reasons in Tools

Update `rejectOfferTool` to include rejection metadata:

```typescript
// In negotiation-tools.ts
export const rejectOfferTool = createTool({
  id: "reject-offer",
  inputSchema: z.object({
    offerId: z.string(),
    reason: z.string(),
    isNegotiationEnded: z.boolean(),
    rejectionCategory: z.enum([
      'price_too_high',
      'lead_time_too_long', 
      'payment_terms_unacceptable',
      'quality_concerns',
      'other',
    ]).optional(),
    message: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    offerId: z.string(),
    reason: z.string(),
    rejectionCategory: z.string().optional(),
    status: z.union([z.literal("rejected"), z.literal("impasse")]),
    message: z.string(),
  }),
  execute: async (input) => ({
    success: true,
    offerId: input.offerId,
    reason: input.reason,
    rejectionCategory: input.rejectionCategory,
    status: input.isNegotiationEnded ? "impasse" : "rejected",
    message: input.message,
  }),
});
```

### 3. Integrate with Negotiation Flow

```typescript
// In runSupplierNegotiation
async function runSupplierNegotiation(
  supplierId: SupplierId,
  context: NegotiationContext,
  callbacks: NegotiationCallbacks
): Promise<NegotiationResult> {
  const offerTracker = new OfferTracker(supplierId);
  const impasseDetector = new ImpasseDetector({
    maxRounds: context.maxRounds ?? 10,
    priceGapThreshold: 0.25,
  });

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // ... generate messages and extract offers ...

    // Check for explicit rejection
    const outcome = extractNegotiationOutcome(supplierResponse);
    if (outcome.status === 'impasse') {
      return {
        supplierId,
        status: 'impasse',
        roundCount: round + 1,
        impasseReason: 'Explicit rejection by supplier',
        offerHistory: offerTracker.getHistory(),
      };
    }

    // Check for implicit impasse conditions
    const impasseResult = impasseDetector.detect(
      round + 1,
      offerTracker,
      false,
      context.targetPrice
    );

    if (impasseResult.isImpasse) {
      return {
        supplierId,
        status: 'impasse',
        roundCount: round + 1,
        impasseReason: impasseResult.primaryReason ?? 'Unknown',
        impasseDetails: impasseResult.details,
        finalOffer: offerTracker.getLatestOffer()?.offer,
        offerHistory: offerTracker.getHistory(),
      };
    }
  }

  // Max rounds without agreement
  const finalOffer = offerTracker.getLatestOffer();
  return {
    supplierId,
    status: finalOffer ? 'completed' : 'impasse',
    roundCount: MAX_ROUNDS,
    finalOffer: finalOffer?.offer,
    offerHistory: offerTracker.getHistory(),
  };
}
```

### 4. Update Schema for Impasse Details

```typescript
const negotiationResultSchema = z.object({
  supplierId: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  status: z.union([
    z.literal('completed'),
    z.literal('impasse'),
    z.literal('active'),
  ]),
  roundCount: z.number(),
  finalOffer: offerSchema.optional(),
  impasseReason: z.string().optional(),
  impasseDetails: z.string().optional(),
  offerHistory: z.array(offerHistoryEntrySchema).optional(),
});
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/mastra/workflows/negotiation-workflow.ts` | Integrate impasse detection |
| `src/mastra/tools/negotiation-tools.ts` | Add rejection categories |

## New Files

| File | Purpose |
|------|---------|
| `src/mastra/utils/impasse-detector.ts` | Multi-condition impasse detection |

## Test Requirements

### Unit Tests (`src/__tests__/utils/impasse-detector.test.ts`)

```typescript
describe('Impasse Detector', () => {
  describe('maxRoundsReached', () => {
    it('should detect impasse when max rounds exceeded', () => {
      const detector = new ImpasseDetector({ maxRounds: 5 });
      const tracker = new OfferTracker(1);
      
      const result = detector.detect(6, tracker, false);
      
      expect(result.isImpasse).toBe(true);
      expect(result.conditions.maxRoundsReached).toBe(true);
    });
  });

  describe('explicitRejection', () => {
    it('should detect impasse on explicit rejection', () => {
      const detector = new ImpasseDetector();
      const tracker = new OfferTracker(1);
      
      const result = detector.detect(2, tracker, true);
      
      expect(result.isImpasse).toBe(true);
      expect(result.conditions.explicitRejection).toBe(true);
      expect(result.primaryReason).toContain('rejection');
    });
  });

  describe('noProgressInRounds', () => {
    it('should detect impasse when prices stagnate', () => {
      const detector = new ImpasseDetector({ progressWindowSize: 3 });
      const tracker = new OfferTracker(1);
      
      // Add stagnant offers
      tracker.addOffer({ round: 0, source: 'supplier', offer: { unitPrice: 30, ... } });
      tracker.addOffer({ round: 1, source: 'supplier', offer: { unitPrice: 30, ... } });
      tracker.addOffer({ round: 2, source: 'supplier', offer: { unitPrice: 30, ... } });
      
      const result = detector.detect(3, tracker, false);
      
      expect(result.conditions.noProgressInRounds).toBe(true);
    });

    it('should not flag impasse when prices improve', () => {
      const detector = new ImpasseDetector({ progressWindowSize: 3 });
      const tracker = new OfferTracker(1);
      
      tracker.addOffer({ round: 0, source: 'supplier', offer: { unitPrice: 30, ... } });
      tracker.addOffer({ round: 1, source: 'supplier', offer: { unitPrice: 28, ... } });
      tracker.addOffer({ round: 2, source: 'supplier', offer: { unitPrice: 26, ... } });
      
      const result = detector.detect(3, tracker, false);
      
      expect(result.conditions.noProgressInRounds).toBe(false);
    });
  });

  describe('priceGapTooLarge', () => {
    it('should detect impasse when price gap exceeds threshold', () => {
      const detector = new ImpasseDetector({ priceGapThreshold: 0.20 });
      const tracker = new OfferTracker(1);
      
      tracker.addOffer({ round: 0, source: 'brand', offer: { unitPrice: 20, ... } });
      tracker.addOffer({ round: 0, source: 'supplier', offer: { unitPrice: 30, ... } });
      
      const result = detector.detect(1, tracker, false);
      
      // Gap is 50%, threshold is 20%
      expect(result.conditions.priceGapTooLarge).toBe(true);
    });
  });

  describe('leadTimeUnacceptable', () => {
    it('should detect impasse when lead time exceeds limit', () => {
      const detector = new ImpasseDetector({ maxAcceptableLeadTime: 45 });
      const tracker = new OfferTracker(1);
      
      tracker.addOffer({ 
        round: 0, 
        source: 'supplier', 
        offer: { unitPrice: 25, leadTimeDays: 60, paymentTerms: '30/70' } 
      });
      
      const result = detector.detect(1, tracker, false);
      
      expect(result.conditions.leadTimeUnacceptable).toBe(true);
    });
  });

  describe('combined conditions', () => {
    it('should report multiple impasse reasons', () => {
      const detector = new ImpasseDetector({
        maxRounds: 5,
        priceGapThreshold: 0.10,
      });
      const tracker = new OfferTracker(1);
      
      tracker.addOffer({ round: 0, source: 'brand', offer: { unitPrice: 20, ... } });
      tracker.addOffer({ round: 0, source: 'supplier', offer: { unitPrice: 30, ... } });
      
      const result = detector.detect(6, tracker, false);
      
      expect(result.isImpasse).toBe(true);
      expect(result.conditions.maxRoundsReached).toBe(true);
      expect(result.conditions.priceGapTooLarge).toBe(true);
    });
  });
});
```

### Integration Tests (`src/__tests__/workflows/negotiation-termination.test.ts`)

```typescript
describe('Negotiation Termination', () => {
  it('should mark negotiation as impasse on explicit rejection', async () => {
    // Mock supplier agent to use reject-offer tool with isNegotiationEnded: true
    const result = await runSupplierNegotiation(1, mockContext, mockCallbacks);
    
    expect(result.status).toBe('impasse');
    expect(result.impasseReason).toContain('rejection');
  });

  it('should complete negotiation on accept-offer', async () => {
    // Mock supplier agent to use accept-offer tool
    const result = await runSupplierNegotiation(1, mockContext, mockCallbacks);
    
    expect(result.status).toBe('completed');
    expect(result.finalOffer).toBeDefined();
  });

  it('should detect impasse after max rounds with no agreement', async () => {
    // Mock agents to never reach agreement
    const result = await runSupplierNegotiation(1, mockContext, mockCallbacks);
    
    expect(result.roundCount).toBe(MAX_ROUNDS);
    expect(result.status).toBe('impasse');
  });
});
```

## Acceptance Criteria

1. [ ] Multiple impasse conditions are evaluated
2. [ ] Explicit rejections immediately end negotiation as impasse
3. [ ] Stagnant prices trigger impasse detection
4. [ ] Large price gaps are detected
5. [ ] Lead time limits are enforced
6. [ ] Impasse reasons are clearly documented in results
7. [ ] All tests pass

## Dependencies

- Phase 3: Dynamic Pricing (for OfferTracker)

## Estimated Effort

1 day

