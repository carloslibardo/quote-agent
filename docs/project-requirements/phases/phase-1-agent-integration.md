# Phase 1: Agent Integration

## Overview

Replace the current `generateText()` direct calls with proper Mastra agent invocations, enabling tool usage and structured negotiation flows.

## Current Problem

The workflow in `src/mastra/workflows/negotiation-workflow.ts` defines agents but never uses them:

```typescript
// Current: Direct generateText calls bypass agents
async function generateBrandMessage(context) {
  const result = await generateText({
    model: getModel(),
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 250,
  });
  return result.text;
}
```

The agents defined in `brand-agent.ts` and `supplier-agent.ts` with their negotiation tools are completely unused.

## Solution

Use the agent's `generate()` method which enables tool calling:

```typescript
// New: Agent invocation with tool support
import { createBrandAgentWithContext } from '../agents/brand-agent';
import { createSupplierAgent } from '../agents/supplier-agent';

async function generateBrandMessage(context) {
  const brandAgent = createBrandAgentWithContext({
    priorities: context.priorities,
    userNotes: context.userNotes,
    products: context.products,
  });
  
  const result = await brandAgent.generate(messages, {
    maxSteps: 3, // Allow tool calls
  });
  
  return result;
}
```

## Implementation Details

### 1. Update `brand-agent.ts`

Add memory configuration for conversation context:

```typescript
export function createBrandAgentWithContext(context: BrandAgentContext): Agent {
  return new Agent({
    name: "Brand Negotiation Agent",
    instructions: buildBrandAgentInstructions(context),
    model: openai("gpt-4o"),
    tools: {
      proposeTool,
      counterOfferTool,
      acceptOfferTool,
      rejectOfferTool,
    },
    // Enable memory for multi-turn conversations
    memory: {
      lastMessages: 20, // Keep last 20 messages in context
    },
  });
}
```

Enhance instructions to encourage tool usage:

```typescript
## Tool Usage Guidelines
- ALWAYS use proposeTool when making an initial offer
- Use counterOfferTool when responding to supplier offers
- Use acceptOfferTool when terms are acceptable (do not continue negotiating)
- Use rejectOfferTool only when unable to reach agreement
- Include structured offer data in tool calls, not just text
```

### 2. Update `supplier-agent.ts`

Enable structured tool responses:

```typescript
function buildSupplierInstructions(supplierId: SupplierId): string {
  const supplier = SUPPLIER_CHARACTERISTICS[supplierId];

  return `...existing instructions...
  
## Tool Usage Requirements
- ALWAYS use proposeTool for your initial offer
- Use counterOfferTool when responding to brand counter-offers
- Include actual pricing calculations in tool parameters
- Set notes field for special conditions or volume discounts
- Use acceptOfferTool when you agree to terms
`;
}
```

### 3. Update `negotiation-workflow.ts`

Replace direct `generateText` calls:

```typescript
// Before (lines 334-379)
async function generateBrandMessage(context) {
  const result = await generateText({...});
  return result.text;
}

// After
async function generateBrandResponse(context) {
  const brandAgent = createBrandAgentWithContext({
    priorities: context.priorities,
    userNotes: context.userNotes,
    products: context.products,
  });

  const messages = buildConversationHistory(context.previousMessages);
  
  const response = await brandAgent.generate(messages, {
    maxSteps: 2,
  });

  return {
    text: response.text,
    toolCalls: response.toolCalls ?? [],
    messages: response.messages,
  };
}
```

### 4. Message Format Conversion

Convert between workflow messages and agent messages:

```typescript
interface WorkflowMessage {
  sender: 'brand' | 'supplier';
  content: string;
  timestamp: number;
}

function toAgentMessages(workflowMessages: WorkflowMessage[]): CoreMessage[] {
  return workflowMessages.map(msg => ({
    role: msg.sender === 'brand' ? 'assistant' : 'user',
    content: msg.content,
  }));
}

function fromAgentResponse(response: AgentResponse, sender: 'brand' | 'supplier'): WorkflowMessage {
  return {
    sender,
    content: response.text,
    timestamp: Date.now(),
  };
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/mastra/agents/brand-agent.ts` | Add memory config, enhance tool usage instructions |
| `src/mastra/agents/supplier-agent.ts` | Add tool usage instructions, structured responses |
| `src/mastra/workflows/negotiation-workflow.ts` | Replace generateText with agent.generate |

## New Files

| File | Purpose |
|------|---------|
| `src/mastra/utils/message-converter.ts` | Convert between message formats |

## Test Requirements

### Unit Tests (`src/__tests__/agents/brand-agent.test.ts`)

```typescript
describe('Brand Agent', () => {
  it('should generate response with tool call for initial offer request', async () => {
    // Mock the agent's generate method
    // Verify proposeTool is called with correct parameters
  });

  it('should use counterOfferTool when responding to supplier offer', async () => {
    // Provide conversation history with supplier offer
    // Verify counterOfferTool is invoked
  });

  it('should accept offer when terms meet priority thresholds', async () => {
    // Provide favorable offer in conversation
    // Verify acceptOfferTool is called
  });

  it('should adjust negotiation strategy based on priorities', async () => {
    // Test with cost-focused priorities (cost: 50%)
    // Verify agent pushes harder on price
  });
});
```

### Unit Tests (`src/__tests__/agents/supplier-agent.test.ts`)

```typescript
describe('Supplier Agent', () => {
  it('should make initial offer using proposeTool', async () => {
    // Verify initial response includes proposeTool call
  });

  it('should maintain pricing within flexibility bounds', async () => {
    // Verify counter offers respect priceFlexibility limits
  });

  it('should highlight supplier-specific strengths', async () => {
    // Supplier 2 should emphasize quality
    // Supplier 3 should emphasize speed
  });
});
```

### Integration Tests (`src/__tests__/agents/agent-integration.test.ts`)

```typescript
describe('Agent Integration', () => {
  it('should complete multi-turn negotiation with tool exchanges', async () => {
    // Run 3-round negotiation between brand and supplier agents
    // Verify tool calls at each step
    // Verify final status is completed or impasse
  });
});
```

## Acceptance Criteria

1. [ ] Agents are invoked using `agent.generate()` instead of `generateText()`
2. [ ] Tool calls are present in agent responses
3. [ ] Conversation history is properly maintained across rounds
4. [ ] Agent instructions explicitly guide tool usage
5. [ ] All unit tests pass with mocked LLM responses
6. [ ] Integration test demonstrates full negotiation flow

## Dependencies

- Vitest setup (Phase 0) - COMPLETED
- No external dependencies

## Estimated Effort

2-3 days

