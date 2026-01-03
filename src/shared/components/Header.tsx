import { Button } from "@/shared/components/ui/button";
import { Share2 } from "lucide-react";

interface HeaderProps {
  variant?: "authenticated" | "unauthenticated";
  onShare?: () => void;
  onSignOut?: () => void;
  customActions?: React.ReactNode;
}

const Header = ({
  variant = "unauthenticated",
  onShare,
  customActions,
}: HeaderProps) => {
  if (variant === "authenticated") {
    return (
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon-white.png"
              alt="App Logo"
              className="h-12 w-auto"
            />
            <h1 className="text-xl font-bold">App Name</h1>
          </div>
          <div className="flex items-center gap-2">
            {onShare && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onShare}
                aria-label="Share"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            )}
            {customActions}
          </div>
        </div>
      </header>
    );
  }

  // Unauthenticated variant
  return (
    <header className="sticky top-0 z-40">
      <div className="flex items-center justify-center p-6">
        <img
          src="/logo-icon-white.png"
          alt="App Logo"
          className="h-12 w-auto"
        />
      </div>
    </header>
  );
};

export default Header;
