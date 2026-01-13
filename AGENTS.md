# Quote Agent - Project Memory

## Project Overview

AI-driven supplier negotiation platform that automates multi-agent conversations between a brand and suppliers to find the best sourcing deal.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Routing**: React Router v7
- **State Management**: React Context + Hooks
- **Backend**: Convex (database, real-time, server functions)
- **AI Framework**: Mastra.ai (multi-agent orchestration)
- **AI Provider**: OpenAI (GPT-4o via @ai-sdk/openai)
- **Validation**: Zod (schemas for agents, tools, environment)

## Cursor Rules Integration

The following `.cursor/rules` files contain comprehensive coding guidelines that work with both Claude Code and Cursor IDE. These rules provide detailed best practices for TypeScript, React, Convex, and UI/UX patterns:

### Project Rules
@.cursor/rules/project/always.mdc

### TypeScript Rules
@.cursor/rules/code/typescript/typescript-always.mdc
@.cursor/rules/code/typescript/typescript-styleguide.mdc
@.cursor/rules/code/typescript/typescript-types-variables.mdc
@.cursor/rules/code/typescript/typescript-functions-fp.mdc
@.cursor/rules/code/typescript/typescript-formatting-organization.mdc
@.cursor/rules/code/typescript/typescript-error-testing.mdc

### React Rules
@.cursor/rules/code/react/react-principles.mdc
@.cursor/rules/code/react/react-component-design.mdc
@.cursor/rules/code/react/react-typescript-styleguide.mdc
@.cursor/rules/code/react/react-hooks.mdc
@.cursor/rules/code/react/react-hooks-state.mdc
@.cursor/rules/code/react/react-functions-events.mdc
@.cursor/rules/code/react/react-forms.mdc
@.cursor/rules/code/react/react-performance-practices.mdc
@.cursor/rules/code/react/react-lazy-loading.mdc
@.cursor/rules/code/react/react-error-testing.mdc
@.cursor/rules/code/react/react-native-architecture.mdc

### Convex Rules
@.cursor/rules/code/convex.mdc

### UI/UX Rules
@.cursor/rules/code/uiux/uiux-patterns.mdc
@.cursor/rules/code/uiux/animations.mdc

## Custom Commands

The following custom commands are available in `.cursor/commands/`:

- **review-and-iterate.md**: Code review and iteration workflow
- **fix-tests-failures.md**: Fix failing tests systematically
- **security-audit.md**: Perform security audits
- **improve-the-given-code-snippets.md**: Improve code quality

## Repository Etiquette

- Follow semantic commit messages (feat:, fix:, chore:, docs:, refactor:, test:, style:)
- Keep commits atomic and focused
- Write clear, descriptive commit messages
- Update AGENTS.md when adding/removing/moving files

## Development Workflow

1. Always run type checks before committing
2. Ensure all imports are properly typed
3. Follow the component structure in the rules
4. Use functional programming principles from TypeScript rules
5. Maintain consistent code formatting

## Running the Application

The application requires **three servers** running simultaneously:

```bash
# Terminal 1: Mastra server (port 4111)
pnpm run dev:mastra

# Terminal 2: Vite dev server (port 5173)
pnpm run dev

# Terminal 3: Convex dev server
pnpm run convex:dev
```

The Mastra server handles AI workflow execution, Vite serves the frontend, and Convex provides the real-time database.

## Project Structure

```
scripts/
└── generate-auth-keys.mjs           # JWT key generation (legacy)

docs/
├── ARCHITECTURE.md                  # System architecture overview
├── COMPONENTS.md                    # Component documentation
├── DEPLOYMENT.md                    # Deployment guide
└── project-requirements/            # Project requirements and tasks
    ├── AGENTS.md
    ├── phases/                      # Implementation phases
    └── tasks/                       # Individual task files (1-19)

src/
├── App.tsx                          # Main app with routes
├── main.tsx                         # Entry point with env validation
├── env.ts                           # Environment variable validation
├── vite-env.d.ts
├── __tests__/                       # Test directory
│   ├── setup.ts                     # Vitest setup with mocks
│   ├── mocks/
│   │   ├── llm-responses.ts         # Mocked agent responses
│   │   └── convex-client.ts         # Mocked Convex mutations
│   ├── agents/
│   │   ├── brand-agent.test.ts      # Brand agent behavior tests
│   │   ├── supplier-agent.test.ts   # Supplier agent personality tests
│   │   └── agent-integration.test.ts # Agent interaction tests
│   ├── tools/
│   │   ├── negotiation-tools.test.ts # Negotiation tool tests
│   │   └── substitution-tools.test.ts # Material substitution tests
│   ├── utils/
│   │   ├── tool-parser.test.ts      # Tool call extraction tests
│   │   ├── offer-tracking.test.ts   # Offer history tests
│   │   ├── impasse-detector.test.ts # Impasse detection tests
│   │   ├── user-guidance.test.ts    # User intervention parsing tests
│   │   └── substitution-tracker.test.ts # Substitution tracking tests
│   ├── workflows/
│   │   ├── parallel-negotiation.test.ts # Concurrent execution tests
│   │   ├── negotiation-termination.test.ts # Termination logic tests
│   │   ├── user-intervention.test.ts # User guidance tests
│   │   ├── intervention-timing.test.ts # Timing mechanism tests
│   │   └── substitution-negotiation.test.ts # Material substitution flow
│   ├── storage/
│   │   └── message-persistence.test.ts # Message persister tests
│   └── evals/
│       ├── agent-quality.test.ts    # Agent quality metrics
│       └── tool-accuracy.test.ts    # Tool usage accuracy metrics
├── features/
│   └── quotes/                      # Quote management feature
│       ├── domain/
│       │   ├── types.ts             # Quote, Negotiation, Decision types
│       │   ├── useQuotes.ts         # Convex hooks for quotes
│       │   └── useNegotiationRunner.ts # Mastra workflow trigger hook
│       ├── ui/
│       │   ├── ProductQuantitySelector.tsx
│       │   ├── PriorityWeightSliders.tsx
│       │   ├── NegotiationAccordion.tsx
│       │   ├── ConversationMessages.tsx
│       │   ├── InterventionInput.tsx
│       │   ├── DecisionPanel.tsx
│       │   ├── SupplierCard.tsx
│       │   ├── EvaluationScoresTable.tsx
│       │   └── QuoteListItem.tsx
│       └── useCases/
│           ├── CreateQuotePage.tsx   # Quote initiation form
│           ├── NegotiationPage.tsx   # Active negotiation view
│           └── PastNegotiationsPage.tsx # Quote history
├── lib/
│   └── mastra-client.ts              # MastraClient for API calls to Mastra server
├── mastra/                           # Mastra AI integration
│   ├── index.ts                      # Mastra instance
│   ├── agents/
│   │   ├── index.ts                  # Agent exports
│   │   ├── brand-agent.ts            # Brand negotiation agent
│   │   └── supplier-agent.ts         # Supplier agent factory
│   ├── tools/
│   │   ├── index.ts                  # Tool exports
│   │   ├── negotiation-tools.ts      # Propose, counter, accept, reject
│   │   ├── material-substitution-tool.ts
│   │   └── scoring-tool.ts           # Weighted scoring engine
│   ├── workflows/
│   │   ├── index.ts                  # Workflow exports
│   │   └── negotiation-workflow.ts   # Multi-agent orchestration
│   └── storage/
│       ├── index.ts                  # Storage exports
│       └── convex-adapter.ts         # Convex storage adapter
├── server/                           # Convex backend
│   ├── _generated/                   # Auto-generated Convex files
│   ├── http.ts                       # HTTP routes
│   ├── schema.ts                     # Database schema
│   ├── seed.ts                       # Database seed mutations
│   ├── quotes.ts                     # Quote mutations & queries
│   ├── negotiations.ts               # Negotiation mutations & queries
│   ├── decisions.ts                  # Decision mutations & queries
│   └── messages.ts                   # Message mutations & queries
└── shared/
    ├── components/
    │   ├── ui/                       # shadcn/ui components
    │   ├── ErrorBoundary.tsx
    │   ├── BackendErrorBoundary.tsx
    │   ├── LoadingSpinner.tsx
    │   ├── PageLayout.tsx
    │   └── NotFoundPage.tsx
    ├── hooks/
    │   ├── useMobile.tsx
    │   ├── useOnlineStatus.tsx
    │   └── useToast.ts
    ├── lib/
    │   ├── products.ts               # Product utilities
    │   └── utils.ts                  # General utilities
    └── styles/
        └── index.css                 # Global styles
```

## Mastra AI Integration

The project uses Mastra.ai for AI agent orchestration:

```
src/mastra/
├── index.ts                    # Mastra instance with agent/workflow registration
├── agents/
│   ├── index.ts                # Agent exports
│   ├── brand-agent.ts          # Brand negotiation agent (GPT-4o)
│   └── supplier-agent.ts       # Supplier agent factory (4 suppliers)
├── tools/
│   ├── index.ts                # Tool exports
│   ├── negotiation-tools.ts    # Propose, counter, accept, reject tools
│   ├── material-substitution-tool.ts  # Material substitution tools (suggest, accept, reject)
│   └── scoring-tool.ts         # Weighted scoring engine
├── utils/
│   ├── index.ts                # Utils exports
│   ├── message-converter.ts    # Convert between workflow and agent message formats
│   ├── tool-parser.ts          # Extract offers and outcomes from tool calls
│   ├── offer-tracker.ts        # Track offer history and price progression
│   ├── impasse-detector.ts     # Multi-condition impasse detection
│   ├── user-guidance.ts        # Format user interventions for agent consumption
│   └── substitution-tracker.ts # Track material substitution proposals
├── workflows/
│   ├── index.ts                # Workflow exports
│   └── negotiation-workflow.ts # Multi-agent orchestration
└── storage/
    ├── index.ts                # Storage exports
    └── convex-adapter.ts       # Convex storage adapter for messages

src/__tests__/                    # Test suite (Vitest)
├── setup.ts                      # Global test setup with mocks
├── mocks/
│   ├── llm-responses.ts          # Mocked agent responses for unit tests
│   └── convex-client.ts          # Mocked Convex mutations/queries
├── tools/
│   └── negotiation-tools.test.ts # Negotiation tools unit tests
├── agents/                       # Agent behavior tests
├── workflows/                    # Workflow integration tests
├── utils/                        # Utility function tests
└── evals/                        # Mastra scorer evaluations
```

**Key Mastra Patterns:**
- Use `Agent` class from `@mastra/core/agent` for all agents
- Use `createTool` from `@mastra/core/tools` for structured tools
- Use `createWorkflow` and `createStep` for orchestration
- All schemas defined with Zod for type-safe validation

## Environment Variables

Required environment variables (see `.env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key (server) |
| `VITE_OPENAI_API_KEY` | Yes | OpenAI API key (client) |
| `VITE_MASTRA_API_URL` | No | Mastra server URL (default: `http://localhost:4111`) |
| `CONVEX_DEPLOYMENT` | No | Convex deployment URL |

Environment validation in `src/env.ts` fails fast with clear errors.

## Task Files

Implementation tasks are in `docs/project-requirements/tasks/`:

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1 | Database schema (Convex) | None |
| 2 | Quote mutations | Task 1 |
| 3 | Mastra AI Agents | Task 1, 14 |
| 4 | Negotiation orchestration | Task 3 |
| 5 | Decision evaluation | Task 3 |
| 6-7 | Convex queries, Products | Task 1 |
| 8-11 | UI Components | Tasks 1-7 |
| 12-13 | Error handling, Accessibility | Tasks 8-11 |
| 14 | Mastra instance setup | None |
| 15 | Negotiation workflow | Task 3, 14 |
| 16 | Material substitution tool | Task 3, 14 |
| 17 | Scoring engine tool | Task 3, 14 |
| 18 | Environment validation | None |
| 19 | Convex storage adapter | Task 1, 14 |

## Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Redirect | Redirects to `/quotes/new` |
| `/quotes/new` | CreateQuotePage | Quote initiation form |
| `/quotes/:quoteId/negotiations` | NegotiationPage | Active/completed negotiation view |
| `/quotes/history` | PastNegotiationsPage | Quote history list |

## Database Seeding

Seed mutations are available in `src/server/seed.ts`:

```bash
# Seed sample quote data
pnpx convex run seed:seedSampleQuote

# Clear all quotes and related data (use with caution)
pnpx convex run seed:clearQuotes
```

## Notes

- **Public Access**: All routes and data are publicly accessible (no authentication)
- **Shared Quotes**: All quotes are visible to everyone in a shared view
- Multi-agent negotiation with brand and 4 supplier agents
- Parallel negotiations with impasse detection (max 10 rounds)
- Weighted scoring for supplier selection (quality, cost, lead time, payment terms)
- Real-time UI updates via Convex subscriptions
- Environment validation ensures app fails fast if misconfigured
- Skip-to-main-content link for accessibility (WCAG AA)
- Loading spinners and skeleton states for all async operations
- Error boundaries for graceful error handling
