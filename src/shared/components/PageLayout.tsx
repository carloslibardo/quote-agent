import { type ReactNode } from "react";
import { StarsBackground } from "@/shared/components/backgrounds/stars";
import Header from "@/shared/components/Header";
import { TopBar } from "@/shared/components/TopBar";
import BottomNav from "@/shared/components/BottomNav";
import { BottomNavSteps } from "@/shared/components/BottomNavSteps";
import { Share2, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { TopBarAction } from "@/shared/components/TopBar";

interface TopBarProfile {
  imageUrl?: string;
  displayName: string;
  onClick: () => void;
  ariaLabel?: string;
}

interface PageLayoutProps {
  children: ReactNode;
  /** Page title - can be a string or ReactNode */
  title?: ReactNode;
  /** Page description */
  description?: string;
  headerVariant?: "authenticated" | "unauthenticated";
  onShare?: () => void;
  onSignOut?: () => void;
  headerCustomActions?: ReactNode;
  // TopBar props (used when headerVariant is "authenticated")
  topBarTitle?: string;
  topBarCaption?: string;
  topBarAlignment?: "center" | "left";
  topBarVariant?: "default" | "large";
  topBarLeadingAction?: {
    icon?: LucideIcon;
    onClick: () => void;
    ariaLabel: string;
  };
  topBarTrailingActions?: TopBarAction[];
  topBarProfile?: TopBarProfile;
  footer?: "none" | "bottomNav" | "bottomNavSteps";
  bottomNavProps?: {
    isAdmin?: boolean;
  };
  bottomNavStepsProps?: {
    isSubmitting: boolean;
    isFirstStep: boolean;
    isLastStep: boolean;
    onPrevious: () => void;
    onNext?: () => void;
    onSubmit?: () => void;
  };
  className?: string;
  contentClassName?: string;
}

export const PageLayout = ({
  children,
  title,
  description,
  headerVariant = "authenticated",
  onShare,
  onSignOut,
  headerCustomActions,
  topBarTitle = "App",
  topBarCaption,
  topBarAlignment = "center",
  topBarVariant = "default",
  topBarLeadingAction,
  topBarTrailingActions,
  topBarProfile,
  footer = "bottomNav",
  bottomNavProps,
  bottomNavStepsProps,
  className,
  contentClassName,
}: PageLayoutProps) => {
  const hasFooter = footer !== "none";

  // Build trailing actions for TopBar from existing header actions
  const trailingActions: TopBarAction[] = [];
  if (onShare) {
    trailingActions.push({
      icon: Share2,
      onClick: onShare,
      ariaLabel: "Share",
    });
  }
  // Add custom trailing actions if provided
  if (topBarTrailingActions) {
    trailingActions.push(...topBarTrailingActions);
  }

  return (
    <StarsBackground
      className={cn("fixed inset-0 h-screen w-screen", className)}
    >
      <div className="relative h-full flex flex-col">
        {headerVariant === "authenticated" ? (
          <TopBar
            title={topBarTitle}
            caption={topBarCaption}
            alignment={topBarAlignment}
            variant={topBarVariant}
            leadingAction={topBarLeadingAction}
            profile={topBarProfile}
            trailingActions={
              trailingActions.length > 0 ? trailingActions : undefined
            }
          />
        ) : (
          <Header
            variant={headerVariant}
            onShare={onShare}
            onSignOut={onSignOut}
            customActions={headerCustomActions}
          />
        )}
        <main
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden",
            hasFooter && "pb-20",
            contentClassName,
          )}
        >
          {/* Page header with title and description */}
          {(title || description) && (
            <div className="px-4 py-6 md:px-6">
              {title && (
                <h1 className="text-2xl font-bold tracking-tight">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          )}
          <div className="px-4 md:px-6 pb-6">{children}</div>
        </main>
        {footer === "bottomNav" && <BottomNav {...bottomNavProps} />}
        {footer === "bottomNavSteps" && bottomNavStepsProps && (
          <BottomNavSteps {...bottomNavStepsProps} />
        )}
      </div>
    </StarsBackground>
  );
};
