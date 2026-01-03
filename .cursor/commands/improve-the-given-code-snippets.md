# Context-Aware Code Refactoring

## Overview

Analyze the provided code snippet to improve readability, performance, and maintainability. This command will first identify all unique functionalities, external dependencies (like API calls, database queries, or framework functions, e.g., Convex), and then search for their specific documentation and best practices before proposing changes.

## Steps

### 1. Analyze Functionality and Dependencies

- [ ] Identify the core purpose of the code (e.g., data fetching, user validation, state manipulation).
- [ ] List all significant external interactions or dependencies involved in the snippet.
  - [ ] API calls (e.g., `fetch`, `axios`)
  - [ ] Database/Backend calls (e.g., Convex `query`, `mutation` or `action`, Supabase, Firebase)
  - [ ] Specific framework hooks (e.g., `React.useEffect`, `useMemo`)
  - [ ] Utility libraries (e.g., `lodash`, `date-fns`)
- [ ] Note the language-specific constructs in use (e.g., loops, conditionals, async/await).

### 2. Research Best Practices

- [ ] **[Search]** Find the official documentation for each identified dependency or interaction (e.g., "Convex documentation query," "Axios request config").
- [ ] **[Search]** Look for "best practices," "performance," or "style guide" sections within that documentation.
- [ ] **[Search]** Find general optimization strategies for the code's core purpose (e.g., "best practices for React data fetching," "optimizing JavaScript validation functions").

### 3. Propose Refactoring Plan

Based on the research, formulate a plan to address these key areas:

- [ ] **Readability:**
  - [ ] Improve variable and function names for clarity.
  - [ ] Simplify complex logic and reduce nesting.
  - [ ] Add comments or docstrings explaining _why_ (especially for complex external logic).
- [ ] **Performance:**
  - [ ] Apply performance patterns from the official docs (e.g., batching queries, memoization, proper error handling).
  - [ ] Optimize algorithms (e.g., efficient loops, correct data structures).
  - [ ] Address asynchronous code (e.g., efficient promise handling, avoiding race conditions).
- [ ] **Maintainability:**
  - [ ] Refactor into smaller, single-responsibility functions.
  - [ ] Decouple external logic from business logic where possible.
  - [ ] Ensure the code follows modern conventions and the best practices discovered.

### 4. Deliver Final Output

- [ ] Provide a detailed implementation plan listing the files that must change and the changes that must be made to each file and a brief explanation of the changes and why they are being made.
  - [ ] For each file, provide a clear explanation for the _key changes_, referencing the documentation or best practices that informed the decision.
