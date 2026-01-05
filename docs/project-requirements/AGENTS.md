# AI-Driven Supplier Negotiation Platform with Multi-Agent Conversation System

## Overview

Build a web application that automates supplier sourcing through AI-driven negotiations. When a brand user initiates a quote request, AI agents conduct parallel negotiations with multiple suppliers, evaluating offers based on quality, lead time, cost, and payment terms to recommend the optimal supplier.

## Problem Statement

Manual supplier negotiations are time-consuming and require significant back-and-forth communication to compare offers across multiple criteria. Brands need an automated way to:
- Simultaneously negotiate with multiple suppliers
- Evaluate complex trade-offs between quality, cost, speed, and payment terms
- Make data-driven supplier selection decisions
- Maintain transparency in the negotiation process

## Jobs to be Done

When a brand needs to source products from suppliers, they want to automate the negotiation process so they can quickly identify the best supplier without manual back-and-forth communication.

## User Stories

**As a brand user**, I want to initiate a quote request with custom product quantities and priorities, so I can get tailored supplier recommendations.

**As a brand user**, I want to see real-time AI negotiations with each supplier, so I can understand how deals are being structured.

**As a brand user**, I want to intervene during negotiations with additional guidance, so I can steer the conversation toward my business needs.

**As a brand user**, I want to see the winning supplier with clear reasoning, so I can understand why they were selected and make an informed decision.

**As a brand user**, I want to review past negotiations, so I can reference previous deals and supplier interactions.

## Functional Requirements

### Quote Initiation
- User can start a new quote request from the UI
- User can customize product quantities (default: 10,000 Pulse Pro High-Top, 5,000 each for other products)
- User can add open-text notes to guide the brand negotiation agent
- User can define decision criteria priorities (quality, cost, lead time, payment terms)
- System validates that at least one product has quantity > 0

### AI Agent System
- **Brand Agent**: Single AI agent representing the brand's interests
  - Initiates conversations with all three supplier agents in parallel
  - Aware of supplier quality ratings (Supplier 1: 4.0, Supplier 2: 4.7, Supplier 3: 4.0)
  - Negotiates based on user-defined priorities
  - Accepts user intervention messages during negotiation
  - Continues negotiation dynamically until agreement or impasse
  - Evaluates all offers and selects optimal supplier

- **Supplier Agents**: Three AI agents simulating supplier responses
  - **Supplier 1**: Medium quality (4.0) / Cheapest / Slow delivery / 33/33/33 payment terms
  - **Supplier 2**: High quality (4.7) / More expensive / Medium-fast delivery / 30/70 payment terms
  - **Supplier 3**: Medium quality (4.0) / Expensive / Fastest delivery / 30/70 payment terms
  - Can suggest material substitutions to reduce costs
  - Can propose alternative terms (delivery schedules, payment structures)
  - Respond naturally in English with business-appropriate language

### Negotiation Flow
- All three supplier negotiations run in parallel
- Each negotiation continues dynamically until:
  - Both agents reach agreement
  - Impasse is detected (no progress after multiple rounds)
  - User manually stops the negotiation
- User can inject guidance messages to the brand agent during active negotiations
- System tracks conversation state (active, completed, impasse)

### Decision Engine
- Brand agent evaluates all supplier offers against decision criteria:
  - Quality rating (from supplier data)
  - Total cost (product quantities × unit prices)
  - Lead time (delivery speed)
  - Payment terms (cash flow impact)
- Applies user-defined priority weights to each criterion
- Selects supplier with highest weighted score
- Generates human-readable explanation of decision rationale

## Technical Requirements

### AI Integration with Mastra Framework

The application uses **Mastra.ai** as the AI agent framework, providing structured agent management, workflow orchestration, and tool integration.

**Mastra Architecture:**
```
src/mastra/
├── index.ts                    # Mastra instance registration
├── agents/
│   ├── brand-agent.ts          # Brand negotiation agent
│   └── supplier-agent.ts       # Supplier agent factory
├── tools/
│   ├── negotiation-tools.ts    # Propose, counter, accept, reject
│   ├── material-substitution-tool.ts
│   └── scoring-tool.ts         # Weighted scoring engine
└── workflows/
    └── negotiation-workflow.ts  # Multi-agent orchestration
```

**Key Dependencies:**
- `@mastra/core`: Agent, createTool, createWorkflow
- `@ai-sdk/openai`: OpenAI model provider
- `zod`: Schema validation for inputs/outputs

**Agent Implementation:**
- Use Mastra `Agent` class with `instructions`, `model`, and `tools`
- Brand agent uses GPT-4o with negotiation tools and scoring tools
- Supplier agents created via factory function with distinct instructions per supplier
- All agents use Zod schemas for type-safe input/output validation

**Brand Agent Configuration:**
```typescript
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

export const brandAgent = new Agent({
  name: "Brand Negotiation Agent",
  description: "AI agent representing the brand in supplier negotiations",
  instructions: `You are a professional buyer representing the brand...`,
  model: openai("gpt-4o"),
  tools: { proposeTool, counterOfferTool, acceptTool, rejectTool, scoringTool },
});
```

**Supplier Agent Factory:**
```typescript
export function createSupplierAgent(supplierId: 1 | 2 | 3): Agent {
  const characteristics = SUPPLIER_CHARACTERISTICS[supplierId];
  return new Agent({
    name: `Supplier ${supplierId} Agent`,
    description: `AI agent simulating Supplier ${supplierId}`,
    instructions: `You are a sales representative for Supplier ${supplierId}...`,
    model: openai("gpt-4o"),
    tools: { materialSubstitutionTool },
  });
}
```

**Negotiation Workflow:**
- Uses Mastra `createWorkflow` for orchestrating multi-agent negotiations
- Parallel execution of 3 supplier negotiations
- Maximum 10 rounds per negotiation to prevent infinite loops
- Automatic impasse detection when no progress is made

### Environment Variables

The application requires the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI agents |
| `VITE_OPENAI_API_KEY` | Yes | OpenAI API key for client (Vite) |
| `CONVEX_DEPLOYMENT` | No | Convex deployment URL (auto-detected in dev) |

**Environment Validation:**
- `src/env.ts` validates environment variables at startup using Zod
- Application throws clear error if required variables are missing
- See `.env.example` for required configuration

### Supplier Data

Suppliers are defined with fixed characteristics for the prototype:

| Supplier | Quality Rating | Pricing Strategy | Lead Time | Payment Terms |
|----------|---------------|------------------|-----------|---------------|
| 1        | 4.0 (Medium)  | Cheapest         | Slow (45 days) | 33/33/33 |
| 2        | 4.7 (High)    | Premium          | Medium-Fast (25 days) | 30/70 |
| 3        | 4.0 (Medium)  | Expensive        | Fastest (15 days) | 30/70 |

### Negotiation Limits

- **Maximum Rounds:** 10 rounds per negotiation
- **Impasse Detection:** If 3 consecutive messages show no substantive progress
- **Timeout:** 5 minutes with no message exchange triggers user notification

### Scoring Formula

The decision engine uses weighted scoring:

```
total_score = (quality_score × quality_weight) + 
              (cost_score × cost_weight) + 
              (lead_time_score × lead_time_weight) + 
              (payment_terms_score × payment_terms_weight)
```

Each criterion is normalized to 0-100 scale before applying weights.

### Data Model

**Quote Request** (new)
- quote_id (string): Unique identifier
- user_id (string): Reference to user who created request
- products (array): Product quantities [{product_id, quantity}]
- user_notes (string): Optional guidance for brand agent
- decision_priorities (object): Weights for {quality, cost, lead_time, payment_terms}
- status (string): "pending" | "negotiating" | "completed" | "cancelled"
- created_at (number): Timestamp
- completed_at (number): Optional timestamp

**Negotiation** (new)
- negotiation_id (string): Unique identifier
- quote_id (string): Reference to parent quote request
- supplier_id (number): 1, 2, or 3
- status (string): "active" | "completed" | "impasse"
- created_at (number): Timestamp
- completed_at (number): Optional timestamp

**Message** (new)
- message_id (string): Unique identifier
- negotiation_id (string): Reference to parent negotiation
- sender (string): "brand" | "supplier" | "user"
- content (string): Message text
- timestamp (number): Message creation time
- metadata (object): Optional AI model info, token usage

**Decision** (new)
- decision_id (string): Unique identifier
- quote_id (string): Reference to quote request
- selected_supplier_id (number): Winning supplier (1, 2, or 3)
- reasoning (string): Explanation of selection
- evaluation_scores (object): Scores per supplier {supplier_id: {quality_score, cost_score, lead_time_score, payment_terms_score, total_score}}
- created_at (number): Timestamp

**Relationships**:
- Quote Request → Multiple Negotiations (one per supplier)
- Negotiation → Multiple Messages (conversation history)
- Quote Request → One Decision (final selection)

**Data Integrity**:
- Quote Request must have at least one product with quantity > 0
- Negotiation must reference valid quote_id and supplier_id (1-3)
- Message must reference valid negotiation_id
- Decision must reference valid quote_id and supplier_id
- Products loaded from static JSON file (products.json)

### API Specifications

**POST /api/quotes/create**
- Request: `{ products: [{product_id: string, quantity: number}], user_notes?: string, decision_priorities: {quality: number, cost: number, lead_time: number, payment_terms: number} }`
- Response 201: `{ quote_id: string, status: "pending" }`
- Response 400: `{ error: "Validation error", details: string }`
- Response 500: `{ error: "Server error" }`

**POST /api/quotes/:quoteId/start**
- Request: `{}`
- Response 200: `{ quote_id: string, status: "negotiating", negotiation_ids: string[] }`
- Response 404: `{ error: "Quote not found" }`
- Response 409: `{ error: "Quote already started" }`
- Response 500: `{ error: "Server error" }`

**POST /api/negotiations/:negotiationId/intervene**
- Request: `{ message: string }`
- Response 200: `{ message_id: string, status: "sent" }`
- Response 400: `{ error: "Message required" }`
- Response 404: `{ error: "Negotiation not found" }`
- Response 409: `{ error: "Negotiation not active" }`
- Response 500: `{ error: "Server error" }`

**GET /api/quotes/:quoteId/negotiations**
- Response 200: `{ negotiations: [{negotiation_id, supplier_id, status, messages: [{message_id, sender, content, timestamp}]}] }`
- Response 404: `{ error: "Quote not found" }`
- Response 500: `{ error: "Server error" }`

**GET /api/quotes/:quoteId/decision**
- Response 200: `{ decision_id, selected_supplier_id, reasoning, evaluation_scores, created_at }`
- Response 404: `{ error: "Decision not found" }`
- Response 500: `{ error: "Server error" }`

### Integration Points
- OpenAI API for AI agent conversations
- Convex database for persisting quotes, negotiations, messages, decisions
- Static products.json file loaded at application startup
- React Query for managing API state and real-time updates

## UX/UI Requirements

### Quote Initiation Screen
**Structure**:
- Page title: "New Quote Request"
- Product selection section with quantity inputs
- Decision priorities section with sliders/inputs for weights
- Optional notes textarea
- "Start Negotiation" button

**States**:
- Default: All inputs enabled, button enabled
- Loading: Button shows spinner, inputs disabled
- Error: Validation errors shown inline

**Interactions**:
- User adjusts product quantities (number inputs, min: 0)
- User adjusts priority weights (sliders summing to 100%)
- User enters optional notes (textarea, max 500 chars)
- User clicks "Start Negotiation" → Creates quote and navigates to negotiation view

**Responsive**: Stack inputs vertically on mobile, side-by-side on desktop

### Active Negotiation Screen
**Structure**:
- Quote summary header (products, quantities, priorities)
- Accordion with three sections (one per supplier)
- Each accordion section shows:
  - Supplier name and characteristics
  - Conversation messages (brand/supplier/user)
  - Status indicator (active/completed/impasse)
  - Intervention input (if active)
- Decision panel (appears when all negotiations complete)

**States**:
- Negotiating: Accordion sections show real-time messages, intervention inputs enabled
- Completed: All sections show final messages, intervention disabled, decision panel visible
- Error: Error message shown above accordion

**Interactions**:
- User expands/collapses accordion sections
- User types intervention message and clicks "Send" → Message added to conversation
- Messages auto-scroll to latest
- Real-time updates as AI agents exchange messages

**Responsive**: Single column on mobile, decision panel stacks below accordion

### Decision Panel
**Structure**:
- "Recommended Supplier" heading
- Supplier card with name, characteristics, and final offer summary
- "Why this supplier?" section with reasoning text
- Evaluation scores table (all suppliers with scores per criterion)
- "Accept" and "View Details" buttons

**States**:
- Default: All content visible
- Loading: Skeleton loaders while decision generates

**Interactions**:
- User clicks "View Details" → Expands full evaluation breakdown
- User clicks "Accept" → Confirms supplier selection

**Responsive**: Stack supplier card and scores vertically on mobile

### Past Negotiations Screen
**Structure**:
- List of completed quote requests
- Each item shows: date, products, selected supplier, status
- Click item → Opens read-only negotiation view

**States**:
- Empty: "No past negotiations" message
- Loading: Skeleton list
- Loaded: Scrollable list of items

**Interactions**:
- User clicks item → Navigates to read-only negotiation detail
- User scrolls to load more (pagination)

**Responsive**: Card layout on mobile, table on desktop

### Error Handling
- **OpenAI API Failure**: Show "AI service temporarily unavailable" with retry button
- **Network Error**: Show "Connection lost" with auto-retry countdown
- **Validation Error**: Inline field errors with red text and icons
- **Negotiation Timeout**: Show "Negotiation taking longer than expected" with option to continue or cancel

### Accessibility
- Keyboard navigation for all interactive elements
- Screen reader labels for accordion sections, buttons, form inputs
- Focus indicators on all focusable elements
- ARIA live regions for real-time message updates
- Color contrast meets WCAG AA standards

## Decision Rationale

**Why OpenAI over other providers?**
OpenAI's GPT models provide strong natural language capabilities for business negotiations and are well-documented for multi-agent systems. The API is stable and widely supported.

**Why parallel negotiations?**
Parallel execution reduces total negotiation time and allows the brand agent to compare offers in real-time, potentially using information from one negotiation to inform others.

**Why accordion UI?**
Accordion allows users to focus on one conversation at a time while maintaining context of all three negotiations. It's more space-efficient than side-by-side columns and more organized than tabs.

**Why dynamic negotiation rounds?**
Fixed round counts may cut off productive negotiations or waste time on unproductive ones. Dynamic continuation based on progress detection optimizes for both speed and thoroughness.

**Why user-defined priorities?**
Different sourcing scenarios require different trade-offs. User-defined weights ensure the AI agent optimizes for the brand's actual business needs rather than assumed priorities.

**Why static JSON for products?**
The product catalog is small (5 items) and unlikely to change during development. Static file loading is simpler than database seeding and sufficient for the prototype scope.

## Out of Scope

**Features Deferred**:
- **Multi-user collaboration**: Single-user experience for MVP. Add when team-based sourcing workflows are needed.
- **Historical price tracking**: No trend analysis of supplier pricing over time. Add when sufficient historical data exists (>10 quotes).
- **Supplier onboarding**: Suppliers are predefined (1, 2, 3). Add supplier management when expanding beyond prototype.
- **Contract generation**: No automated contract creation from negotiation results. Add when legal template system is available.
- **Email notifications**: No email alerts for negotiation completion. Add when user base grows beyond active monitoring.

**Technical Complexity Deferred**:
- **Real-time streaming**: Messages appear after completion, not token-by-token. Add streaming when sub-second latency becomes critical.
- **Advanced AI features**: No memory across quotes, no learning from past negotiations. Add when sufficient data exists for fine-tuning.
- **Multi-language support**: English only for MVP. Add when international suppliers are onboarded.

## Acceptance Criteria

**Quote Initiation**
- Given I am on the quote initiation screen, when I enter product quantities and priorities and click "Start Negotiation", then a new quote is created and I am navigated to the active negotiation screen
- Given I enter invalid data (negative quantities, priorities not summing to 100%), when I submit, then validation errors are shown inline and submission is blocked

**AI Negotiations**
- Given a quote is started, when the system begins negotiations, then three parallel conversations are initiated with brand agent and supplier agents
- Given negotiations are active, when messages are exchanged, then they appear in real-time in the appropriate accordion sections
- Given a negotiation reaches agreement or impasse, when the status changes, then the accordion section shows the final status and intervention is disabled

**User Intervention**
- Given a negotiation is active, when I type a message in the intervention input and click "Send", then my message is added to the conversation and the brand agent incorporates my guidance in subsequent messages
- Given a negotiation is completed, when I try to send an intervention, then the input is disabled and shows "Negotiation complete"

**Decision Selection**
- Given all three negotiations are completed, when the brand agent evaluates offers, then a decision panel appears showing the recommended supplier with reasoning
- Given the decision panel is visible, when I click "View Details", then I see the full evaluation scores for all suppliers across all criteria
- Given evaluation scores are displayed, when I review them, then each supplier's scores reflect the user-defined priority weights

**Conversation Persistence**
- Given a quote is completed, when I navigate to past negotiations, then I see the quote in the list
- Given I click a past quote, when the detail view loads, then I see all conversation messages in read-only mode with the final decision

**Error Handling**
- Given the OpenAI API fails, when a negotiation is in progress, then an error message is shown with a retry option
- Given network connectivity is lost, when messages are being exchanged, then a "Connection lost" message appears with auto-retry
- Given a negotiation times out (>5 minutes with no progress), when the timeout occurs, then the user is notified with options to continue or cancel