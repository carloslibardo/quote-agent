# Phase 6: Material Substitution Negotiation

## Overview

Enable suppliers to propose material substitutions as part of negotiations, and allow the brand agent to evaluate and respond to these proposals.

## Current Problem

Material substitutions exist in the tools but are never actively negotiated:

```typescript
// Current: Substitutions only mentioned in prompts
const materialSubs = context.productOffers
  .filter(p => p.materialSubstitution)
  .map(p => `${p.materialSubstitution!.original} -> ${p.materialSubstitution!.suggested}`)

// Never actually negotiated or tracked
```

Suppliers can mention alternatives, but there's no structured way to:
- Propose specific substitutions with trade-offs
- Track acceptance/rejection of substitutions
- Apply substitution effects to pricing

## Solution

Dedicated tools for substitution negotiation:

```typescript
// Supplier proposes substitution
const substitutionProposal = await supplierAgent.generate(messages);
// Tool call: suggest-substitution { productId, original, suggested, costReduction, qualityImpact }

// Brand evaluates and responds
const brandResponse = await brandAgent.generate(messages);
// Tool call: accept-substitution { substitutionId } 
// OR: reject-substitution { substitutionId, reason }
```

## Implementation Details

### 1. Update Material Substitution Tool (`src/mastra/tools/material-substitution-tool.ts`)

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Substitution proposal schema
 */
export const substitutionProposalSchema = z.object({
  productId: z.string().describe("Product ID for this substitution"),
  originalMaterial: z.string().describe("Current material specification"),
  suggestedMaterial: z.string().describe("Proposed alternative material"),
  costReductionPercent: z.number().min(0).max(50)
    .describe("Percentage cost reduction (0-50%)"),
  qualityImpact: z.enum(["none", "minor", "moderate", "significant"])
    .describe("Expected impact on quality"),
  qualityJustification: z.string()
    .describe("Explanation of quality impact or equivalence"),
  leadTimeChange: z.number().optional()
    .describe("Change in lead time (positive = longer, negative = shorter)"),
});

export type SubstitutionProposal = z.infer<typeof substitutionProposalSchema>;

/**
 * Suggest Material Substitution Tool
 * Used by supplier agents to propose alternative materials
 */
export const suggestSubstitutionTool = createTool({
  id: "suggest-substitution",
  description: `Propose a material substitution to reduce costs while maintaining quality.
Use this when you can offer a cost-effective alternative material.
Be specific about quality implications.`,
  inputSchema: z.object({
    proposal: substitutionProposalSchema,
    message: z.string().describe("Explanation of the substitution benefits"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    substitutionId: z.string(),
    proposal: substitutionProposalSchema,
    message: z.string(),
  }),
  execute: async (input) => {
    const substitutionId = `sub-${Date.now()}-${input.proposal.productId}`;
    return {
      success: true,
      substitutionId,
      proposal: input.proposal,
      message: input.message,
    };
  },
});

/**
 * Accept Substitution Tool
 * Used by brand agent to accept a proposed substitution
 */
export const acceptSubstitutionTool = createTool({
  id: "accept-substitution",
  description: `Accept a proposed material substitution.
Use when the cost savings justify any quality impact.`,
  inputSchema: z.object({
    substitutionId: z.string().describe("ID of the substitution to accept"),
    conditions: z.string().optional()
      .describe("Any conditions for acceptance (e.g., quality testing required)"),
    message: z.string().describe("Confirmation message"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    substitutionId: z.string(),
    status: z.literal("accepted"),
    conditions: z.string().optional(),
    message: z.string(),
  }),
  execute: async (input) => ({
    success: true,
    substitutionId: input.substitutionId,
    status: "accepted" as const,
    conditions: input.conditions,
    message: input.message,
  }),
});

/**
 * Reject Substitution Tool
 * Used by brand agent to reject a proposed substitution
 */
export const rejectSubstitutionTool = createTool({
  id: "reject-substitution",
  description: `Reject a proposed material substitution.
Use when quality concerns outweigh cost savings or substitution is inappropriate.`,
  inputSchema: z.object({
    substitutionId: z.string().describe("ID of the substitution to reject"),
    reason: z.enum([
      "quality_concerns",
      "customer_requirements",
      "certification_issues",
      "insufficient_savings",
      "other",
    ]).describe("Primary reason for rejection"),
    explanation: z.string().describe("Detailed explanation"),
    message: z.string().describe("Response message"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    substitutionId: z.string(),
    status: z.literal("rejected"),
    reason: z.string(),
    explanation: z.string(),
    message: z.string(),
  }),
  execute: async (input) => ({
    success: true,
    substitutionId: input.substitutionId,
    status: "rejected" as const,
    reason: input.reason,
    explanation: input.explanation,
    message: input.message,
  }),
});

export const materialSubstitutionTools = {
  suggestSubstitutionTool,
  acceptSubstitutionTool,
  rejectSubstitutionTool,
};
```

### 2. Create Substitution Tracker

```typescript
// In src/mastra/utils/substitution-tracker.ts

export interface SubstitutionRecord {
  substitutionId: string;
  productId: string;
  proposal: SubstitutionProposal;
  status: 'pending' | 'accepted' | 'rejected';
  response?: {
    acceptedAt?: number;
    rejectedAt?: number;
    reason?: string;
    conditions?: string;
  };
}

export class SubstitutionTracker {
  private substitutions: Map<string, SubstitutionRecord> = new Map();

  propose(proposal: SubstitutionProposal, substitutionId: string): SubstitutionRecord {
    const record: SubstitutionRecord = {
      substitutionId,
      productId: proposal.productId,
      proposal,
      status: 'pending',
    };
    this.substitutions.set(substitutionId, record);
    return record;
  }

  accept(substitutionId: string, conditions?: string): SubstitutionRecord | null {
    const record = this.substitutions.get(substitutionId);
    if (!record) return null;

    record.status = 'accepted';
    record.response = {
      acceptedAt: Date.now(),
      conditions,
    };
    return record;
  }

  reject(substitutionId: string, reason: string): SubstitutionRecord | null {
    const record = this.substitutions.get(substitutionId);
    if (!record) return null;

    record.status = 'rejected';
    record.response = {
      rejectedAt: Date.now(),
      reason,
    };
    return record;
  }

  getAcceptedSubstitutions(): SubstitutionRecord[] {
    return Array.from(this.substitutions.values())
      .filter(s => s.status === 'accepted');
  }

  getPendingSubstitutions(): SubstitutionRecord[] {
    return Array.from(this.substitutions.values())
      .filter(s => s.status === 'pending');
  }

  calculateTotalSavings(): number {
    return this.getAcceptedSubstitutions()
      .reduce((total, sub) => total + sub.proposal.costReductionPercent, 0);
  }

  getSubstitutionSummary(): string {
    const accepted = this.getAcceptedSubstitutions();
    if (accepted.length === 0) return 'No material substitutions accepted.';

    const lines = accepted.map(sub => 
      `- ${sub.proposal.originalMaterial} → ${sub.proposal.suggestedMaterial} ` +
      `(${sub.proposal.costReductionPercent}% savings, ${sub.proposal.qualityImpact} quality impact)`
    );

    return `Accepted substitutions:\n${lines.join('\n')}`;
  }
}
```

### 3. Update Supplier Agent Instructions

```typescript
// In supplier-agent.ts

function buildSupplierInstructions(supplierId: SupplierId): string {
  const supplier = SUPPLIER_CHARACTERISTICS[supplierId];
  
  let substitutionGuidance = '';
  
  // Supplier-specific substitution behavior
  switch (supplierId) {
    case 1: // Value-focused
      substitutionGuidance = `
## Material Substitution Strategy
- Proactively suggest substitutions for cost savings
- Focus on equivalent-quality alternatives
- Aim for 5-15% cost reductions through material optimization
- Use suggest-substitution tool when discussing alternatives
`;
      break;
    case 2: // Quality-focused
      substitutionGuidance = `
## Material Substitution Strategy
- Only suggest substitutions when quality is maintained or improved
- Emphasize quality certifications for alternatives
- Be conservative - prefer "none" or "minor" quality impact options
- May suggest premium materials if quality is a priority
`;
      break;
    case 3: // Speed-focused
      substitutionGuidance = `
## Material Substitution Strategy
- Suggest substitutions that improve lead time
- Prefer materials with better availability
- Balance cost savings with delivery speed
- Highlight inventory advantages of alternatives
`;
      break;
  }

  return `...existing instructions...

${substitutionGuidance}

When proposing substitutions, always use the suggest-substitution tool with:
- Specific materials (original and suggested)
- Honest quality impact assessment
- Clear cost reduction percentage
`;
}
```

### 4. Update Brand Agent for Substitution Handling

```typescript
// In brand-agent.ts

export function buildBrandAgentInstructions(context: BrandAgentContext): string {
  const qualityPriority = context.priorities.quality;
  
  let substitutionPolicy = '';
  
  if (qualityPriority >= 40) {
    substitutionPolicy = `
## Material Substitution Policy (Quality Priority: High)
- ONLY accept substitutions with "none" quality impact
- Require justification for any material changes
- Use reject-substitution tool for any quality concerns
- May accept if savings exceed 15% with "minor" impact and conditions
`;
  } else if (qualityPriority >= 25) {
    substitutionPolicy = `
## Material Substitution Policy (Quality Priority: Medium)
- Accept substitutions with "none" or "minor" quality impact
- Consider "moderate" impact only if savings exceed 20%
- Use accept-substitution with conditions for testing if uncertain
- Balance cost savings against quality requirements
`;
  } else {
    substitutionPolicy = `
## Material Substitution Policy (Quality Priority: Lower)
- Accept substitutions that offer meaningful cost savings
- "Minor" and "moderate" quality impacts are acceptable
- Focus on overall value proposition
- Require "significant" impact substitutions to provide 25%+ savings
`;
  }

  return `...existing instructions...

${substitutionPolicy}

When responding to substitution proposals:
- Use accept-substitution tool to approve with optional conditions
- Use reject-substitution tool with clear reason and explanation
- Consider substitutions in context of overall negotiation
`;
}
```

### 5. Integrate with Negotiation Flow

```typescript
// In negotiation-workflow.ts

async function runSupplierNegotiation(
  supplierId: SupplierId,
  context: NegotiationContext,
  callbacks: NegotiationCallbacks
): Promise<NegotiationResult> {
  const offerTracker = new OfferTracker(supplierId);
  const substitutionTracker = new SubstitutionTracker();
  
  // ... existing negotiation loop ...

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const supplierResponse = await supplierAgent.generate(messages);
    
    // Check for substitution proposal
    const substitutionCall = extractToolCall(supplierResponse, 'suggest-substitution');
    if (substitutionCall?.result) {
      const proposal = substitutionCall.result.proposal as SubstitutionProposal;
      substitutionTracker.propose(proposal, substitutionCall.result.substitutionId as string);
    }
    
    const brandResponse = await brandAgent.generate(messages);
    
    // Check for substitution acceptance
    const acceptCall = extractToolCall(brandResponse, 'accept-substitution');
    if (acceptCall?.result) {
      substitutionTracker.accept(
        acceptCall.result.substitutionId as string,
        acceptCall.result.conditions as string | undefined
      );
    }
    
    // Check for substitution rejection
    const rejectCall = extractToolCall(brandResponse, 'reject-substitution');
    if (rejectCall?.result) {
      substitutionTracker.reject(
        rejectCall.result.substitutionId as string,
        rejectCall.result.reason as string
      );
    }
  }

  // Include substitutions in final result
  return {
    supplierId,
    status: 'completed',
    finalOffer: offerTracker.getLatestOffer()?.offer,
    acceptedSubstitutions: substitutionTracker.getAcceptedSubstitutions(),
    substitutionSavings: substitutionTracker.calculateTotalSavings(),
    // ...other fields
  };
}
```

### 6. Update Result Schema

```typescript
const substitutionRecordSchema = z.object({
  substitutionId: z.string(),
  productId: z.string(),
  originalMaterial: z.string(),
  suggestedMaterial: z.string(),
  costReductionPercent: z.number(),
  qualityImpact: z.string(),
  status: z.literal('accepted'),
  conditions: z.string().optional(),
});

const negotiationResultSchema = z.object({
  // ... existing fields ...
  acceptedSubstitutions: z.array(substitutionRecordSchema).optional(),
  substitutionSavings: z.number().optional(),
});
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/mastra/tools/material-substitution-tool.ts` | Add suggest/accept/reject tools |
| `src/mastra/agents/supplier-agent.ts` | Add substitution instructions |
| `src/mastra/agents/brand-agent.ts` | Add substitution evaluation logic |
| `src/mastra/workflows/negotiation-workflow.ts` | Track substitutions |

## New Files

| File | Purpose |
|------|---------|
| `src/mastra/utils/substitution-tracker.ts` | Track substitution proposals and responses |

## Test Requirements

### Unit Tests (`src/__tests__/tools/substitution-tools.test.ts`)

```typescript
describe('Material Substitution Tools', () => {
  describe('suggestSubstitutionTool', () => {
    it('should create substitution proposal with unique ID', async () => {
      const input = {
        proposal: {
          productId: 'FSH013',
          originalMaterial: 'Premium Cotton',
          suggestedMaterial: 'Organic Cotton Blend',
          costReductionPercent: 12,
          qualityImpact: 'minor' as const,
          qualityJustification: 'Similar thread count and durability',
        },
        message: 'We can offer a more cost-effective alternative.',
      };
      
      const result = await suggestSubstitutionTool.execute?.(input);
      
      expect(result?.success).toBe(true);
      expect(result?.substitutionId).toMatch(/^sub-/);
      expect(result?.proposal.costReductionPercent).toBe(12);
    });
  });

  describe('acceptSubstitutionTool', () => {
    it('should accept substitution with conditions', async () => {
      const input = {
        substitutionId: 'sub-123',
        conditions: 'Requires sample approval before production',
        message: 'We accept this substitution pending quality verification.',
      };
      
      const result = await acceptSubstitutionTool.execute?.(input);
      
      expect(result?.status).toBe('accepted');
      expect(result?.conditions).toBe('Requires sample approval before production');
    });
  });

  describe('rejectSubstitutionTool', () => {
    it('should reject with categorized reason', async () => {
      const input = {
        substitutionId: 'sub-456',
        reason: 'customer_requirements' as const,
        explanation: 'Our customer specifically requires the original material.',
        message: 'Unable to accept this substitution.',
      };
      
      const result = await rejectSubstitutionTool.execute?.(input);
      
      expect(result?.status).toBe('rejected');
      expect(result?.reason).toBe('customer_requirements');
    });
  });
});
```

### Unit Tests (`src/__tests__/utils/substitution-tracker.test.ts`)

```typescript
describe('Substitution Tracker', () => {
  it('should track proposed substitution', () => {
    const tracker = new SubstitutionTracker();
    const proposal = mockSubstitutionProposal();
    
    tracker.propose(proposal, 'sub-1');
    
    expect(tracker.getPendingSubstitutions()).toHaveLength(1);
  });

  it('should calculate total savings from accepted substitutions', () => {
    const tracker = new SubstitutionTracker();
    
    tracker.propose({ ...mockProposal, costReductionPercent: 10 }, 'sub-1');
    tracker.propose({ ...mockProposal, costReductionPercent: 8 }, 'sub-2');
    
    tracker.accept('sub-1');
    tracker.accept('sub-2');
    
    expect(tracker.calculateTotalSavings()).toBe(18);
  });

  it('should not include rejected substitutions in savings', () => {
    const tracker = new SubstitutionTracker();
    
    tracker.propose({ ...mockProposal, costReductionPercent: 15 }, 'sub-1');
    tracker.reject('sub-1', 'quality_concerns');
    
    expect(tracker.calculateTotalSavings()).toBe(0);
  });
});
```

### Integration Tests (`src/__tests__/workflows/substitution-negotiation.test.ts`)

```typescript
describe('Substitution Negotiation Flow', () => {
  it('should track supplier substitution proposal', async () => {
    // Mock supplier to propose substitution
    const result = await runSupplierNegotiation(1, mockContext, mockCallbacks);
    
    // Verify substitution was tracked
    expect(result.acceptedSubstitutions).toBeDefined();
  });

  it('should apply savings for accepted substitutions', async () => {
    // Mock brand to accept substitution
    const result = await runSupplierNegotiation(1, mockContext, mockCallbacks);
    
    expect(result.substitutionSavings).toBeGreaterThan(0);
  });

  it('should respect quality priority in substitution decisions', async () => {
    // High quality priority - should reject moderate impact
    const highQualityContext = { ...mockContext, priorities: { quality: 50, ... } };
    // Low quality priority - should accept for savings
    const costFocusedContext = { ...mockContext, priorities: { quality: 15, ... } };
    
    // Verify different outcomes
  });
});
```

## Acceptance Criteria

1. [ ] Suppliers can propose substitutions using suggest-substitution tool
2. [ ] Brand agent evaluates proposals based on quality priority
3. [ ] Accepted substitutions are tracked with conditions
4. [ ] Rejected substitutions include categorized reasons
5. [ ] Total savings are calculated for accepted substitutions
6. [ ] Substitution results are included in negotiation outcome
7. [ ] All tests pass

## Dependencies

- Phase 1: Agent Integration (for tool usage)
- Phase 3: Dynamic Pricing (for tool parsing)

## Estimated Effort

2 days

