import { Component, ErrorInfo, ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { AlertCircle } from "lucide-react";
import { PageLayout } from "./PageLayout";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class BackendErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Check if it's a Convex backend error
    const isBackendError =
      error.message.includes("Could not find public function") ||
      error.message.includes("CONVEX") ||
      error.message.includes("Server Error") ||
      error.message.includes("Did you forget to run");

    if (isBackendError) {
      return { hasError: true, error };
    }
    // For non-backend errors, let parent ErrorBoundary handle them
    // Don't re-throw here - React Error Boundary pattern requires returning state
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Backend error caught:", error, errorInfo);
  }

  // private handleReset = () => {
  //   this.setState({ hasError: false, error: null });
  //   if (this.props.onReset) {
  //     this.props.onReset();
  //   }
  // };

  public render() {
    if (this.state.hasError) {
      return (
        <PageLayout
          headerVariant="authenticated"
          topBarTitle="Memberships"
          footer="bottomNav"
          contentClassName=""
        >
          <div className="p-4 space-y-6 max-w-4xl mx-auto w-full">
            <div className="space-y-4 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                Welcome
              </h1>
              <p className="text-base text-foreground/80 max-w-2xl mx-auto">
                Your application is currently loading. If you see this message,
                the backend service may be temporarily unavailable.
              </p>
            </div>
            <EmptyState
              icon={AlertCircle}
              title={this.props.fallbackTitle || "Backend unavailable"}
              description={
                this.props.fallbackDescription ||
                "The backend service is currently unavailable. Please ensure the Convex dev server is running and try again later."
              }
              actionLabel="Refresh Page"
              onAction={() => window.location.reload()}
            />
          </div>
        </PageLayout>
      );
    }

    return this.props.children;
  }
}

export default BackendErrorBoundary;
