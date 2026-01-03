# Vite Template Clean

A production-ready React + Vite + Convex SPA template with Domain-Driven Design architecture and shadcn/ui components.

## 🚀 Features

- **Modern Stack**: React 18, TypeScript 5.8, Vite 5.4
- **Serverless Backend**: Convex for real-time database and functions
- **DDD Architecture**: Domain-Driven Design pattern for scalable code organization
- **UI Library**: 49 shadcn/ui components built on Radix UI
- **Styling**: Tailwind CSS v4 with neutral design system
- **Forms**: React Hook Form + Zod validation
- **State Management**: React Query for server state
- **Code Splitting**: Lazy loading routes for optimal performance
- **SPA Ready**: Configured for client-side routing with Cloudflare Workers
- **AI-Friendly**: Cursor AI rules and commands included

## 📋 Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- [Convex Account](https://dashboard.convex.dev/) (free tier available)

## 🏁 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/techlibs/vite-template-clean.git my-app
cd my-app
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Setup Convex Backend

```bash
# Login to Convex
bunx convex dev

# This will:
# - Create a new Convex project (or link to existing)
# - Generate the VITE_CONVEX_URL automatically
# - Start the Convex dev server
```

### 4. Start Development Server

```bash
# In a new terminal
bun run dev
```

Visit `http://localhost:8080` to see your app running!

## 📁 Project Structure

```
vite-template-clean/
├── src/
│   ├── features/           # Feature modules (DDD)
│   │   └── users/          # Example: User management
│   │       ├── domain/     # Business logic, hooks, types
│   │       ├── useCases/   # Pages (List, Create, Edit)
│   │       └── ui/         # Feature-specific components
│   ├── server/             # Convex backend
│   │   ├── schema.ts       # Database schema
│   │   └── users.ts        # CRUD functions
│   ├── shared/             # Reusable code
│   │   ├── components/     # UI components
│   │   │   ├── ui/         # 49 shadcn/ui components
│   │   │   └── ...         # Layouts, common components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities
│   │   └── styles/         # Global CSS
│   ├── App.tsx             # Routes & providers
│   └── main.tsx            # Entry point
├── .cursor/                # Cursor AI configuration
└── docs/                   # Documentation (create this)
```

## 🏗️ Architecture

This template follows **Domain-Driven Design (DDD)** principles:

### Feature Structure

Each feature follows this pattern:

```
features/your-feature/
├── domain/              # Core business logic
│   ├── types.ts         # TypeScript types & interfaces
│   ├── useYourFeature.ts  # Domain hooks (Convex queries/mutations)
│   └── services/        # Business logic services (optional)
├── useCases/            # Application use cases (pages)
│   ├── ListPage.tsx
│   ├── CreatePage.tsx
│   └── EditPage.tsx
└── ui/                  # Feature-specific UI components
    ├── YourForm.tsx
    └── YourCard.tsx
```

### Data Flow

```
User Action → Domain Hook → Convex Function → Database
                ↓
          Component Renders
```

## 🎨 Design System

- **Colors**: Neutral gray palette (easily customizable)
- **Components**: 49 shadcn/ui components
- **Typography**: System fonts for maximum performance
- **Theming**: Light/dark mode support via next-themes

### Customizing Colors

Edit `src/shared/styles/index.css`:

```css
:root {
  --primary: hsl(220 13% 20%);  /* Change to your brand color */
  --primary-foreground: hsl(0 0% 100%);
}
```

## 📚 Available Scripts

```bash
# Development
bun run dev              # Start dev server (port 8080)
bunx convex dev          # Start Convex backend

# Production
bun run build            # Build for production
bun run preview          # Preview production build

# Code Quality
bun run lint             # Run ESLint
bun run lint:fix         # Fix ESLint issues
bun run format           # Format with Prettier
bun run typecheck        # Check TypeScript types
bun run pre-commit       # Run all checks (lint, format, typecheck)
```

## 🔥 Creating a New Feature

### 1. Generate Feature Structure

```bash
mkdir -p src/features/my-feature/{domain,useCases,ui}
```

### 2. Define Database Schema

Edit `src/server/schema.ts`:

```typescript
export default defineSchema({
  myTable: defineTable({
    name: v.string(),
    description: v.string(),
  }),
});
```

### 3. Create Convex Functions

Create `src/server/myTable.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("myTable").collect();
  },
});

export const create = mutation({
  args: { name: v.string(), description: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("myTable", args);
  },
});
```

### 4. Create Domain Types & Hooks

See `src/features/users/` for a complete example.

### 5. Create UI Components & Pages

Follow the Users feature as a reference implementation.

### 6. Add Routes

Edit `src/App.tsx` to add your new routes.

## 🌐 Deployment

### Cloudflare Workers (Recommended)

```bash
# Build for production
bun run build

# Deploy to Cloudflare
bunx wrangler deploy
```

### Vercel / Netlify

The template works out of the box with Vercel and Netlify. Just connect your repository and deploy.

## 🤖 AI-Assisted Development

This template includes production-grade development rules in `.clinerules`:

- **Architecture & DDD patterns**: Feature organization, domain/useCases/ui structure
- **React best practices**: Components, hooks, state management, performance
- **TypeScript guidelines**: Types, functions, error handling
- **Convex backend patterns**: Schema, queries, mutations, hooks
- **UI & Styling**: shadcn/ui, Tailwind CSS, PageLayout patterns, forms
- **Code quality**: Formatting, linting, testing guidelines
- **Git workflow**: Commits, branches, conventional commits
- **Documentation standards**: Comments, README, architecture docs

Claude Code automatically reads `.clinerules` on every interaction to ensure consistent, production-ready code.

## 🎯 What's Included

### UI Components (49 total)

Accordion, Alert, AlertDialog, Avatar, Badge, Button, Calendar, Card, Carousel, Checkbox, Collapsible, Command, Context Menu, Dialog, Drawer, Dropdown Menu, Form, Hover Card, Input, Input OTP, Label, Menubar, Navigation Menu, Popover, Progress, Radio Group, Resizable, Scroll Area, Select, Separator, Sheet, Skeleton, Slider, Sonner, Switch, Table, Tabs, Textarea, Toast, Toggle, Toggle Group, Tooltip

### Utility Hooks

- `useBreakpoint`: Responsive breakpoints
- `useDebounce`: Debounce values
- `useIsHydrated`: SSR hydration detection
- `useMediaQuery`: Media query matching
- `useMounted`: Mount detection
- `useOnlineStatus`: Network status
- `useScrollToBottom`: Auto-scroll behavior
- `useThrottle`: Throttle values

### Layout Components

- `PageLayout`: Standard page wrapper with title, description, back button
- `Header`: App header with logo and navigation
- `BottomNav`: Mobile-friendly bottom navigation
- `EmptyState`: Empty state placeholder
- `ErrorBoundary`: Error handling
- `NotFoundPage`: 404 page

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this template for any project.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the amazing component library
- [Convex](https://convex.dev/) for the serverless backend
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Vite](https://vitejs.dev/) for the blazing-fast build tool

## 💬 Support

- [GitHub Issues](https://github.com/techlibs/vite-template-clean/issues)
- [Convex Docs](https://docs.convex.dev/)
- [shadcn/ui Docs](https://ui.shadcn.com/)

---

Built with ❤️ by [techlibs](https://github.com/techlibs)
