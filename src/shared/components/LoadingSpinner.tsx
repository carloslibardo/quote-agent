/**
 * LoadingSpinner Component
 *
 * Accessible loading indicator with multiple size options.
 */

import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type SpinnerSize = "sm" | "md" | "lg" | "xl";

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: SpinnerSize;
  /** Optional text to display below spinner */
  text?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to center in container */
  centered?: boolean;
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const TEXT_CLASSES: Record<SpinnerSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

export function LoadingSpinner({
  size = "md",
  text,
  className,
  centered = true,
}: LoadingSpinnerProps) {
  const content = (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className={cn("animate-spin text-primary", SIZE_CLASSES[size])}
        aria-hidden="true"
      />
      {text && (
        <span className={cn("text-muted-foreground", TEXT_CLASSES[size])}>
          {text}
        </span>
      )}
      <span className="sr-only">
        {text || "Loading..."}
      </span>
    </div>
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[100px]">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Page-level loading state
 */
export function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <LoadingSpinner size="lg" text="Loading page..." />
    </div>
  );
}

/**
 * Inline loading for buttons and small areas
 */
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("w-4 h-4 animate-spin", className)}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton loading for card content
 */
export function CardLoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" role="status" aria-label="Loading content">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
      <div className="h-4 bg-muted rounded w-5/6" />
      <span className="sr-only">Loading content...</span>
    </div>
  );
}

/**
 * Full-width loading bar (for top of page)
 */
export function LoadingBar({ progress }: { progress?: number }) {
  return (
    <div
      className="h-1 w-full bg-muted overflow-hidden"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full bg-primary transition-all duration-300",
          progress === undefined && "animate-loading-bar"
        )}
        style={progress !== undefined ? { width: `${progress}%` } : undefined}
      />
    </div>
  );
}

