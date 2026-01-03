import { Button } from "@/shared/components/ui/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/shared/components/ui/avatar";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface TopBarAction {
  icon?: LucideIcon;
  label?: string;
  onClick: () => void;
  ariaLabel: string;
}

interface TopBarProfile {
  imageUrl?: string;
  displayName: string;
  onClick: () => void;
  ariaLabel?: string;
}

interface TopBarProps {
  /** Title text displayed in the top bar */
  title: string;
  /** Caption text displayed below title (for large variant) */
  caption?: string;
  /** Alignment of the title */
  alignment?: "center" | "left";
  /** Variant size - default (64px) or large (110px) */
  variant?: "default" | "large";
  /** Leading navigation action (typically back button) */
  leadingAction?: {
    icon?: LucideIcon;
    onClick: () => void;
    ariaLabel: string;
  };
  /** User profile to display instead of leading action icon */
  profile?: TopBarProfile;
  /** Trailing action items (icons or text buttons) */
  trailingActions?: TopBarAction[];
  /** Additional className for the container */
  className?: string;
}

export const TopBar = ({
  title,
  caption,
  alignment = "center",
  variant = "default",
  leadingAction,
  profile,
  trailingActions,
  className,
}: TopBarProps) => {
  const isLarge = variant === "large";
  const isLeftAligned = alignment === "left";

  // Default leading icon (back arrow) - only used if profile is not provided
  const LeadingIcon = leadingAction?.icon || ArrowLeft;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-card",
        isLarge ? "h-auto min-h-[56px]" : "h-16",
        className,
      )}
    >
      {isLarge ? (
        // Large variant: Navigation bar on top, title below
        <div className="flex flex-col">
          {/* Navigation bar - 56px height from Figma */}
          <div className="relative h-[56px] flex items-center">
            {profile ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={profile.onClick}
                aria-label={profile.ariaLabel || "User profile"}
                className="absolute left-2 h-8 w-8 p-0 rounded-full"
              >
                <Avatar className="h-8 w-8">
                  {profile.imageUrl && profile.imageUrl.trim() !== "" ? (
                    <AvatarImage
                      src={profile.imageUrl}
                      alt={profile.displayName}
                      onError={(e) => {
                        // Hide the image if it fails to load
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {profile.displayName?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            ) : leadingAction ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={leadingAction.onClick}
                aria-label={leadingAction.ariaLabel}
                className="absolute left-2 h-8 w-8"
              >
                <LeadingIcon className="h-5 w-5 text-foreground" />
              </Button>
            ) : null}
            {trailingActions && trailingActions.length > 0 && (
              <div className="absolute right-3 flex items-center gap-2">
                {trailingActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="icon"
                    onClick={action.onClick}
                    aria-label={action.ariaLabel}
                    className="h-8 w-8"
                  >
                    {action.icon && (
                      <action.icon className="h-5 w-5 text-foreground" />
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>
          {/* Large title and caption - positioned below nav bar */}
          <div className="px-4 pb-4 flex flex-col">
            <h1 className="text-h2 text-foreground">{title}</h1>
            {caption && (
              <p className="text-paragraph-md text-muted-foreground mt-1">
                {caption}
              </p>
            )}
          </div>
        </div>
      ) : (
        // Default variant: Single row layout
        <div className="relative h-full flex items-center">
          {/* Leading action - Profile picture or icon */}
          {profile ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={profile.onClick}
              aria-label={profile.ariaLabel || "User profile"}
              className="absolute left-2 h-8 w-8 p-0 rounded-full"
            >
              <Avatar className="h-8 w-8">
                {profile.imageUrl && profile.imageUrl.trim() !== "" ? (
                  <AvatarImage
                    src={profile.imageUrl}
                    alt={profile.displayName}
                    onError={(e) => {
                      // Hide the image if it fails to load
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {profile.displayName?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            </Button>
          ) : leadingAction ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={leadingAction.onClick}
              aria-label={leadingAction.ariaLabel}
              className="absolute left-2 h-8 w-8"
            >
              <LeadingIcon className="h-5 w-5 text-foreground" />
            </Button>
          ) : null}

          {/* Title */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2",
              isLeftAligned
                ? "left-[56px] text-left"
                : "left-1/2 -translate-x-1/2 text-center",
              "flex items-center justify-center",
            )}
          >
            <h1 className="text-h3 text-foreground whitespace-nowrap">
              {title}
            </h1>
          </div>

          {/* Trailing actions */}
          {trailingActions && trailingActions.length > 0 && (
            <div className="absolute right-2 flex items-center gap-2">
              {trailingActions.map((action, index) => {
                // Render text button if label provided, otherwise icon button
                if (action.label && !action.icon) {
                  return (
                    <Button
                      key={index}
                      variant="ghost"
                      onClick={action.onClick}
                      aria-label={action.ariaLabel}
                      className="text-primary h-auto px-2 py-1 text-lg font-bold hover:text-primary/90"
                    >
                      {action.label}
                    </Button>
                  );
                }
                return (
                  <Button
                    key={index}
                    variant="ghost"
                    size="icon"
                    onClick={action.onClick}
                    aria-label={action.ariaLabel}
                    className="h-8 w-8"
                  >
                    {action.icon && (
                      <action.icon className="h-5 w-5 text-foreground" />
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
