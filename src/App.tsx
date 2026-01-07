import BackendErrorBoundary from "@/shared/components/BackendErrorBoundary";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import { Toaster } from "@/shared/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

// Quote feature pages
const CreateQuotePage = lazy(() =>
  import("./features/quotes/useCases/CreateQuotePage").then((m) => ({
    default: m.CreateQuotePage,
  }))
);
const NegotiationPage = lazy(() =>
  import("./features/quotes/useCases/NegotiationPage").then((m) => ({
    default: m.NegotiationPage,
  }))
);
const PastNegotiationsPage = lazy(() =>
  import("./features/quotes/useCases/PastNegotiationsPage").then((m) => ({
    default: m.PastNegotiationsPage,
  }))
);

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

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );
}

function SkipToMainContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}

function AppRoutes() {
  return (
    <>
      <SkipToMainContent />
      <Suspense fallback={<PageLoader />}>
        <main id="main-content" tabIndex={-1} className="outline-none">
          <Routes>
            {/* Default redirect to quotes/new */}
            <Route path="/" element={<Navigate to="/quotes/new" replace />} />

            {/* Quote Routes */}
            <Route path="/quotes/new" element={<CreateQuotePage />} />
            <Route path="/quotes/history" element={<PastNegotiationsPage />} />
            <Route
              path="/quotes/:quoteId/negotiations"
              element={<NegotiationPage />}
            />

            {/* Fallback - redirect to quotes/new */}
            <Route path="*" element={<Navigate to="/quotes/new" replace />} />
          </Routes>
        </main>
      </Suspense>
    </>
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
