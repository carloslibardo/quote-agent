import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <Alert className="fixed top-0 left-0 right-0 z-50 rounded-none border-b border-destructive bg-destructive/10">
      <WifiOff className="h-4 w-4 text-destructive" />
      <AlertDescription className="text-destructive">
        You're offline. Some features may not be available.
      </AlertDescription>
    </Alert>
  );
}
