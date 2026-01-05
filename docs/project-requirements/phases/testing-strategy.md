# Testing Strategy

## Overview

Comprehensive testing approach for the agent negotiation system using Vitest, mocked LLM responses, and Mastra evaluation scorers.

## Testing Framework

### Technology Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit and integration testing |
| **@mastra/evals** | Agent quality evaluation scorers |
| **vi.mock()** | Mocking LLM and external services |
| **ConvexTestClient** | Testing Convex mutations/queries |

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    setupFiles: ["src/__tests__/setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/mastra/**/*.ts"],
    },
    testTimeout: 30000,
  },
});
```

## Test Types

### 1. Unit Tests

Test individual functions and classes in isolation with mocked dependencies.

**Focus Areas:**
- Tool execution logic
- Offer parsing and validation
- Impasse detection conditions
- User guidance formatting
- Substitution tracking

**Example:**
```typescript
describe('Tool Parser', () => {
  it('should extract offer from propose-offer tool call', () => {
    const response = mockProposeResponse();
    const offer = extractOfferFromToolCall(response);
    
    expect(offer).toEqual({
      unitPrice: 25.00,
      leadTimeDays: 30,
      paymentTerms: '30/70',
    });
  });
});
```

### 2. Integration Tests

Test component interactions with mocked external services.

**Focus Areas:**
- Full negotiation flow with mocked agents
- Parallel execution behavior
- Message persistence callbacks
- Workflow step transitions

**Example:**
```typescript
describe('Negotiation Flow', () => {
  it('should complete multi-round negotiation', async () => {
    const mockBrandAgent = createMockAgent(brandResponses);
    const mockSupplierAgent = createMockAgent(supplierResponses);
    
    const result = await runSupplierNegotiation(1, context, callbacks);
    
    expect(result.status).toBe('completed');
    expect(result.roundCount).toBeGreaterThan(0);
    expect(result.finalOffer).toBeDefined();
  });
});
```

### 3. Evaluation Tests

Assess agent output quality using Mastra scorers.

**Available Scorers:**
- `AnswerRelevancyScorer` - Response relevance to query
- `ToolCallAccuracyScorer` - Correct tool usage
- `ToxicityScorer` - Inappropriate content detection
- `ToneConsistencyScorer` - Professional tone maintenance

**Example:**
```typescript
import { createAnswerRelevancyScorer, runExperiment } from '@mastra/evals';

describe('Agent Quality Evaluation', () => {
  it('should maintain response relevancy', async () => {
    const scorer = createAnswerRelevancyScorer({
      model: openai('gpt-4o'),
    });
    
    const result = await runExperiment({
      experimentName: 'negotiation-relevancy',
      runs: testCases.map(tc => ({
        input: tc.userQuery,
        output: tc.agentResponse,
        expectedOutput: tc.expectedResponse,
      })),
      scorers: [scorer],
    });
    
    expect(result.averageScore).toBeGreaterThan(0.8);
  });
});
```

## Mocking Strategy

### LLM Response Mocks

Create deterministic agent responses for testing:

```typescript
// src/__tests__/mocks/llm-responses.ts

export const brandAgentMockResponses = {
  openingMessage: (productSummary: string) => ({
    text: `Hello, I'm interested in ${productSummary}. Please provide your best offer.`,
    toolCalls: [],
  }),
  
  counterOffer: (previousOfferId: string, newPrice: number) => ({
    text: 'We appreciate your offer but need better terms.',
    toolCalls: [{
      toolName: 'counter-offer',
      args: {
        previousOfferId,
        counterOffer: { unitPrice: newPrice, leadTimeDays: 28, paymentTerms: '30/70' },
        changesExplanation: 'Reduced price to match budget',
        message: 'Please consider our counter offer.',
      },
      result: { success: true, offerId: `counter-${Date.now()}` },
    }],
  }),
  
  accept: (offerId: string, terms: Offer) => ({
    text: 'We accept your terms.',
    toolCalls: [{
      toolName: 'accept-offer',
      args: { offerId, acceptedTerms: terms, confirmationMessage: 'Deal confirmed.' },
      result: { success: true, status: 'accepted' },
    }],
  }),
};
```

### Agent Mock Factory

```typescript
// src/__tests__/mocks/agent-factory.ts

export function createMockAgent(responses: MockAgentResponse[]) {
  let callIndex = 0;
  
  return {
    generate: vi.fn().mockImplementation(async () => {
      const response = responses[callIndex] ?? responses[responses.length - 1];
      callIndex++;
      return response;
    }),
    
    reset: () => { callIndex = 0; },
  };
}
```

### Convex Client Mock

```typescript
// src/__tests__/mocks/convex-client.ts

export function createMockConvexMutations() {
  const store = new Map();
  
  return {
    'negotiations.addMessage': vi.fn().mockImplementation(async (args) => {
      const id = `msg-${Date.now()}`;
      store.set(id, args);
      return id;
    }),
    
    'negotiations.updateNegotiationStatus': vi.fn().mockImplementation(async (args) => {
      store.set(`status-${args.negotiationId}`, args.status);
      return { success: true };
    }),
    
    getStore: () => store,
    reset: () => store.clear(),
  };
}
```

## Test Directory Structure

```
src/__tests__/
├── setup.ts                          # Global test configuration
├── mocks/
│   ├── llm-responses.ts              # Deterministic agent responses
│   ├── convex-client.ts              # Mocked Convex operations
│   └── agent-factory.ts              # Agent mock factory
├── tools/
│   ├── negotiation-tools.test.ts     # Propose, counter, accept, reject
│   └── substitution-tools.test.ts    # Material substitution tools
├── agents/
│   ├── brand-agent.test.ts           # Brand agent behavior
│   └── supplier-agent.test.ts        # Supplier agent personalities
├── workflows/
│   ├── negotiation-workflow.test.ts  # Main workflow integration
│   ├── parallel-execution.test.ts    # Concurrent negotiations
│   └── negotiation-termination.test.ts # Status outcomes
├── utils/
│   ├── tool-parser.test.ts           # Tool call extraction
│   ├── offer-tracker.test.ts         # Offer history tracking
│   ├── impasse-detector.test.ts      # Impasse conditions
│   ├── user-guidance.test.ts         # User intervention parsing
│   └── substitution-tracker.test.ts  # Substitution management
├── integration/
│   ├── full-negotiation.test.ts      # End-to-end scenarios
│   ├── user-intervention.test.ts     # User guidance flow
│   └── substitution-negotiation.test.ts # Material alternatives
└── evals/
    ├── agent-quality.eval.ts         # Quality metrics
    └── tool-accuracy.eval.ts         # Tool usage accuracy
```

## Key Testing Focus Areas

### 1. Tool Call Accuracy

Verify agents use the correct tools in appropriate situations:

```typescript
describe('Tool Call Accuracy', () => {
  it('should use proposeTool for initial offers', () => {
    // First message should include propose-offer
  });
  
  it('should use counterOfferTool when responding to offers', () => {
    // After receiving offer, counter-offer should be used
  });
  
  it('should use acceptOfferTool when terms are acceptable', () => {
    // Good offer should trigger acceptance
  });
});
```

### 2. Negotiation State Progression

Test state transitions throughout negotiation:

```typescript
describe('State Progression', () => {
  it('should progress from active to completed on acceptance', async () => {
    // Verify status transitions
  });
  
  it('should progress to impasse on explicit rejection', async () => {
    // Verify impasse detection
  });
  
  it('should track round count accurately', async () => {
    // Verify round incrementing
  });
});
```

### 3. Offer Parsing and Validation

Test extraction and validation of offer data:

```typescript
describe('Offer Parsing', () => {
  it('should extract offer from propose-offer result', () => {});
  it('should extract offer from counter-offer result', () => {});
  it('should validate offer bounds', () => {});
  it('should handle missing optional fields', () => {});
});
```

### 4. Impasse Detection Logic

Test all impasse conditions:

```typescript
describe('Impasse Detection', () => {
  it('should detect max rounds reached', () => {});
  it('should detect explicit rejection', () => {});
  it('should detect no progress in rounds', () => {});
  it('should detect price gap too large', () => {});
  it('should report multiple conditions', () => {});
});
```

### 5. Decision Scoring Calculations

Verify weighted scoring accuracy:

```typescript
describe('Scoring Calculations', () => {
  it('should calculate weighted scores correctly', () => {
    const priorities = { quality: 25, cost: 35, leadTime: 25, paymentTerms: 15 };
    const offer = { unitPrice: 25, leadTimeDays: 30, ... };
    
    const score = calculateScore(offer, priorities);
    
    expect(score).toBeCloseTo(expectedScore, 2);
  });
});
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/__tests__/tools/negotiation-tools.test.ts

# Run specific test pattern
pnpm test --testNamePattern="impasse"
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3
```

## Evaluation Metrics

For agent quality assessment beyond functional correctness:

| Metric | Target | Description |
|--------|--------|-------------|
| Tool Call Accuracy | >90% | Correct tool selection |
| Response Relevancy | >85% | On-topic responses |
| Negotiation Success Rate | >70% | Completed vs impasse |
| Average Rounds to Completion | <6 | Negotiation efficiency |
| Price Improvement % | >10% | Value captured |

## Best Practices

1. **Isolate Tests**: Each test should be independent and not rely on external state
2. **Mock External Services**: Always mock LLM calls and database operations
3. **Test Edge Cases**: Include boundary conditions and error scenarios
4. **Use Realistic Data**: Mock responses should mirror actual agent behavior
5. **Measure Coverage**: Aim for >80% coverage on core negotiation logic
6. **Document Expectations**: Clear test descriptions explain expected behavior

