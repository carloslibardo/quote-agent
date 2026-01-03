# Components Library

This template includes 49 production-ready components from [shadcn/ui](https://ui.shadcn.com/), built on top of [Radix UI](https://www.radix-ui.com/).

## Quick Start

All components are available in `src/shared/components/ui/`:

```typescript
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
```

## Complete Component List

### Layout & Structure

- **Card** - Container with header, content, footer sections
- **Separator** - Visual divider between content
- **Aspect Ratio** - Maintain aspect ratio for media
- **Scroll Area** - Custom scrollable area
- **Resizable** - Resizable panels

### Form Components

- **Button** - Interactive button with variants
- **Input** - Text input field
- **Textarea** - Multi-line text input
- **Label** - Form field label
- **Checkbox** - Binary selection
- **Radio Group** - Single selection from multiple options
- **Select** - Dropdown selection
- **Switch** - Toggle control
- **Slider** - Range selection
- **Input OTP** - One-time password input
- **Form** - Form wrapper with validation

### Navigation

- **Navigation Menu** - Multi-level navigation
- **Menubar** - Application menu bar
- **Dropdown Menu** - Contextual dropdown
- **Context Menu** - Right-click menu
- **Tabs** - Tabbed interface
- **Breadcrumb** - Navigation breadcrumb

### Feedback & Overlays

- **Dialog** - Modal dialog
- **Alert Dialog** - Confirmation dialog
- **Sheet** - Slide-out panel (drawer)
- **Drawer** - Bottom drawer (mobile-friendly via Vaul)
- **Popover** - Floating content
- **Hover Card** - Content on hover
- **Tooltip** - Helpful hint on hover
- **Toast** - Notification message
- **Sonner** - Toast notifications (via Sonner)
- **Alert** - Inline alert message

### Data Display

- **Table** - Data table
- **Avatar** - User profile picture
- **Badge** - Status indicator
- **Progress** - Progress bar
- **Skeleton** - Loading placeholder
- **Command** - Command palette (⌘K)
- **Calendar** - Date picker
- **Carousel** - Image/content carousel
- **Chart** - Data visualization (via Recharts)

### Interactive

- **Accordion** - Collapsible content
- **Collapsible** - Show/hide content
- **Toggle** - Binary toggle button
- **Toggle Group** - Group of toggle buttons
- **Pagination** - Page navigation

### Composition

- **Sidebar** - Application sidebar layout

## Usage Examples

### Button

```tsx
import { Button } from "@/shared/components/ui/button";

<Button variant="default">Click me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">No background</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button disabled>Disabled</Button>
```

**Variants:** default, destructive, outline, secondary, ghost, link
**Sizes:** default, sm, lg, icon

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/shared/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content goes here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Form with Validation

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Dialog

```tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <Button>Confirm</Button>
  </DialogContent>
</Dialog>
```

### Toast Notifications

```tsx
import { toast } from "sonner";

// Success
toast.success("User created successfully");

// Error
toast.error("Failed to create user");

// Info
toast.info("Please verify your email");

// Custom
toast("Event has been created", {
  description: "Sunday, December 03, 2023 at 9:00 AM",
  action: {
    label: "Undo",
    onClick: () => console.log("Undo"),
  },
});
```

### Data Table

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {users.map((user) => (
      <TableRow key={user.id}>
        <TableCell>{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Command Palette

```tsx
import { Command, CommandDialog, CommandInput, CommandList, CommandItem } from "@/shared/components/ui/command";

function CommandMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandItem onSelect={() => navigate("/users")}>
          Users
        </CommandItem>
        <CommandItem onSelect={() => navigate("/settings")}>
          Settings
        </CommandItem>
      </CommandList>
    </CommandDialog>
  );
}
```

## Custom Components

This template also includes custom components in `src/shared/components/`:

### PageLayout

Standard page wrapper with title, description, and back button.

```tsx
import { PageLayout } from "@/shared/components/PageLayout";

<PageLayout
  title="Users"
  description="Manage your users"
  showBackButton
  action={<Button>Add User</Button>}
>
  {/* Page content */}
</PageLayout>
```

### EmptyState

Display when there's no data.

```tsx
import { EmptyState } from "@/shared/components/EmptyState";
import { Users } from "lucide-react";

<EmptyState
  icon={Users}
  title="No users yet"
  description="Get started by creating your first user"
  action={<Button>Add User</Button>}
/>
```

### ErrorBoundary

Catch and display errors gracefully.

```tsx
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

## Theming

All components use CSS variables for theming. Customize in `src/shared/styles/index.css`:

```css
:root {
  --primary: hsl(220 13% 20%);
  --primary-foreground: hsl(0 0% 100%);
  --background: hsl(0 0% 100%);
  --foreground: hsl(206.8966 26.6055% 21.3725%);
  /* ... more variables */
}

.dark {
  --primary: hsl(220 13% 20%);
  --background: hsl(206.6667 25.7143% 8%);
  --foreground: hsl(0 0% 96.0784%);
  /* ... dark mode overrides */
}
```

## Icons

The template uses [Lucide React](https://lucide.dev/) for icons:

```tsx
import { User, Settings, Home, Search } from "lucide-react";

<Button>
  <User className="mr-2 h-4 w-4" />
  Profile
</Button>
```

## Adding New Components

To add more shadcn components:

```bash
bunx shadcn@latest add [component-name]
```

Example:
```bash
bunx shadcn@latest add pagination
```

## Documentation

For detailed documentation on each component, visit:
- [shadcn/ui Documentation](https://ui.shadcn.com/docs/components)
- [Radix UI Documentation](https://www.radix-ui.com/primitives/docs/overview/introduction)

## Accessibility

All components are built with accessibility in mind:
- Keyboard navigation
- Screen reader support
- ARIA attributes
- Focus management
- Proper semantic HTML

---

Need help? Check the [shadcn/ui docs](https://ui.shadcn.com/) or [open an issue](https://github.com/techlibs/vite-template-clean/issues).
