import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/shared/components/ui/sonner";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import BackendErrorBoundary from "@/shared/components/BackendErrorBoundary";

// Lazy load pages for code splitting
const HomePage = lazy(() => import("./HomePage"));
const ListUsersPage = lazy(() => import("./features/users/useCases/ListUsersPage"));
const CreateUserPage = lazy(() => import("./features/users/useCases/CreateUserPage"));
const EditUserPage = lazy(() => import("./features/users/useCases/EditUserPage"));
const NotFoundPage = lazy(() => import("./shared/components/NotFoundPage"));

// Initialize Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppRoutes() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/users" element={<ListUsersPage />} />
        <Route path="/users/new" element={<CreateUserPage />} />
        <Route path="/users/:id" element={<EditUserPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConvexProvider client={convex}>
          <BackendErrorBoundary>
            <BrowserRouter>
              <AppRoutes />
              <Toaster />
            </BrowserRouter>
          </BackendErrorBoundary>
        </ConvexProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
