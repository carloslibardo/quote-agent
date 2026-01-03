# Vite Template Clean - Project Memory

## Project Overview

This is a clean Vite + React + TypeScript template with Tailwind CSS and shadcn/ui components.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Routing**: React Router v7
- **State Management**: React Context + Hooks
- **Backend**: Convex (optional)

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

## Notes

- This template is designed to be clean and minimal
- No backend dependencies by default (API-agnostic)
- Focus on frontend best practices
- Ready for integration with any backend service
- Convex integration available but optional
