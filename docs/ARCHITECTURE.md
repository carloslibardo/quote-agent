# Architecture Guide

This template follows **Domain-Driven Design (DDD)** principles to create a scalable and maintainable codebase.

## Table of Contents

- [Overview](#overview)
- [Folder Structure](#folder-structure)
- [Domain-Driven Design](#domain-driven-design)
- [Data Flow](#data-flow)
- [Best Practices](#best-practices)

## Overview

The architecture separates concerns into three main layers:

1. **Domain Layer**: Business logic, types, and domain-specific hooks
2. **Use Case Layer**: Application logic (pages, user interactions)
3. **UI Layer**: Presentational components

This separation makes code:
- **Testable**: Each layer can be tested independently
- **Reusable**: Domain logic can be used across multiple pages
- **Maintainable**: Changes are isolated to specific layers

## Folder Structure

```
src/
├── features/              # Feature modules (DDD)
│   └── users/            # Example feature
│       ├── domain/       # Business logic layer
│       │   ├── types.ts  # Domain types & interfaces
│       │   └── useUsers.ts  # Domain hooks
│       ├── useCases/     # Application layer (pages)
│       │   ├── ListUsersPage.tsx
│       │   ├── CreateUserPage.tsx
│       │   └── EditUserPage.tsx
│       └── ui/           # Presentation layer
│           ├── UserCard.tsx
│           └── UserForm.tsx
├── server/               # Convex backend (serverless)
│   ├── schema.ts         # Database schema
│   └── users.ts          # CRUD functions
├── shared/               # Shared across features
│   ├── components/       # Reusable UI components
│   ├── hooks/            # Reusable hooks
│   ├── lib/              # Utilities
│   └── styles/           # Global styles
├── App.tsx               # Routes & global providers
└── main.tsx              # Application entry point
```

## Domain-Driven Design

### Domain Layer (`domain/`)

Contains business logic and rules. This is the heart of your feature.

**Responsibilities:**
- Define domain types and interfaces
- Implement business rules
- Provide hooks for data access
- Validate business constraints

**Example: `domain/types.ts`**
```typescript
export type User = Doc<"users">;
export type UserId = Id<"users">;

export interface CreateUserDto {
  name: string;
  email: string;
  avatar?: string;
}
```

**Example: `domain/useUsers.ts`**
```typescript
export function useUsers() {
  const users = useQuery(api.users.list);
  return users ?? [];
}

export function useCreateUser() {
  return useMutation(api.users.create);
}
```

### Use Case Layer (`useCases/`)

Application-specific logic. This layer orchestrates domain operations to fulfill user requests.

**Responsibilities:**
- Handle user interactions
- Coordinate domain hooks
- Manage page-specific state
- Handle navigation
- Show feedback (toasts, errors)

**Example: `useCases/CreateUserPage.tsx`**
```typescript
export function CreateUserPage() {
  const createUser = useCreateUser(); // Domain hook
  const navigate = useNavigate();

  const handleSubmit = async (data) => {
    await createUser(data);
    toast.success("User created");
    navigate("/users");
  };

  return <UserForm onSubmit={handleSubmit} />;
}
```

### UI Layer (`ui/`)

Presentational components specific to the feature.

**Responsibilities:**
- Render UI based on props
- Handle user input
- No business logic
- Reusable within the feature

**Example: `ui/UserCard.tsx`**
```typescript
export function UserCard({ user, onEdit, onDelete }) {
  return (
    <Card>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <Button onClick={() => onEdit(user)}>Edit</Button>
    </Card>
  );
}
```

## Data Flow

### Query Flow (Read Data)

```
1. Page Component (Use Case)
   ↓
2. Domain Hook (useUsers)
   ↓
3. Convex Query (api.users.list)
   ↓
4. Database
   ↓
5. Component Renders
```

### Mutation Flow (Write Data)

```
1. User Action (Click "Create")
   ↓
2. Page Handler (handleSubmit)
   ↓
3. Domain Hook (useCreateUser)
   ↓
4. Convex Mutation (api.users.create)
   ↓
5. Database Update
   ↓
6. Convex Auto-Refetch
   ↓
7. Component Re-renders
```

## Best Practices

### 1. Keep Domain Logic Pure

**✅ Good:**
```typescript
// domain/useUsers.ts
export function useUsers() {
  return useQuery(api.users.list) ?? [];
}
```

**❌ Bad:**
```typescript
// Don't add navigation or toast logic in domain
export function useUsers() {
  const users = useQuery(api.users.list);
  useEffect(() => {
    if (!users) {
      toast.error("Failed to load");
      navigate("/error");
    }
  }, [users]);
  return users;
}
```

### 2. Keep UI Components Dumb

**✅ Good:**
```typescript
export function UserCard({ user, onEdit }) {
  return <Card onClick={() => onEdit(user)}>...</Card>;
}
```

**❌ Bad:**
```typescript
export function UserCard({ user }) {
  const navigate = useNavigate();
  const updateUser = useUpdateUser();

  const handleEdit = async () => {
    await updateUser({ id: user.id, ... });
    navigate("/users");
  };

  return <Card onClick={handleEdit}>...</Card>;
}
```

### 3. Use Cases Orchestrate

**✅ Good:**
```typescript
export function EditUserPage() {
  const { id } = useParams();
  const user = useUser(id);        // Domain hook
  const updateUser = useUpdateUser();  // Domain hook
  const navigate = useNavigate();      // Use case logic

  const handleSubmit = async (data) => {
    await updateUser({ id, ...data });
    toast.success("Updated");
    navigate("/users");
  };

  return <UserForm user={user} onSubmit={handleSubmit} />;
}
```

### 4. Shared Components in `shared/`

If a component is used across multiple features, move it to `shared/components/`:

```
shared/
└── components/
    ├── ui/              # shadcn/ui (49 components)
    ├── PageLayout.tsx   # Used by all pages
    ├── Header.tsx       # Global header
    └── EmptyState.tsx   # Generic empty state
```

### 5. Backend Functions Mirror Frontend Structure

```
src/
├── features/users/      # Frontend
│   └── domain/
│       └── useUsers.ts  # Calls api.users.*
└── server/
    └── users.ts         # Backend functions (list, create, update, delete)
```

## Convex Backend

### Schema Definition

```typescript
// server/schema.ts
export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
  }).index("by_email", ["email"]),
});
```

### CRUD Functions

```typescript
// server/users.ts
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const create = mutation({
  args: { name: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});
```

## Adding a New Feature

1. **Create feature structure**
   ```bash
   mkdir -p src/features/my-feature/{domain,useCases,ui}
   ```

2. **Define schema** in `server/schema.ts`

3. **Create backend functions** in `server/myTable.ts`

4. **Create domain types** in `domain/types.ts`

5. **Create domain hooks** in `domain/useMyFeature.ts`

6. **Create pages** in `useCases/`

7. **Create UI components** in `ui/`

8. **Add routes** in `App.tsx`

## Testing Strategy

### Unit Tests
- Test domain logic in isolation
- Test UI components with mocked props
- Test backend functions

### Integration Tests
- Test use cases with mocked domain hooks
- Test full flows from UI to backend

### E2E Tests
- Test critical user journeys
- Use actual Convex backend (test environment)

## Performance Considerations

### Code Splitting
- Pages are lazy loaded via `React.lazy()`
- Each feature can be loaded on demand

### Data Fetching
- Convex provides automatic caching
- React Query handles stale data
- Optimistic updates supported

### Bundle Size
- Tree-shaking enabled
- Unused shadcn components are not bundled
- Vite's build optimization

---

For more information, see:
- [Convex Docs](https://docs.convex.dev/)
- [DDD in React](https://dev.to/profydev/domain-driven-design-in-react-3lh)
