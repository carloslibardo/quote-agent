import { RippleButton } from "@/shared/components/ui/ripple-button";
import { CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface BottomNavStepsProps {
  isSubmitting: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  onPrevious: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
}

export const BottomNavSteps = ({
  isSubmitting,
  isFirstStep,
  isLastStep,
  onPrevious,
  onNext,
  onSubmit,
}: BottomNavStepsProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center gap-4 p-6 max-w-2xl mx-auto">
        <RippleButton
          variant="outline"
          disabled={isFirstStep || isSubmitting}
          onClick={onPrevious}
          className={cn(
            "flex-1 h-12 px-6 py-3 border border-border bg-transparent text-foreground hover:bg-muted",
          )}
        >
          Previous
        </RippleButton>

        {isLastStep ? (
          <RippleButton
            type="submit"
            disabled={isSubmitting}
            onClick={onSubmit}
            className={cn(
              "flex-1 h-12 px-6 py-3 gradient-gold text-primary-foreground hover:shadow-gold shadow-soft font-bold",
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create Passport
                <CheckCircle className="ml-2 h-4 w-4" />
              </>
            )}
          </RippleButton>
        ) : (
          <RippleButton
            disabled={isSubmitting}
            onClick={onNext}
            className={cn(
              "flex-1 h-12 px-6 py-3 gradient-gold text-primary-foreground hover:shadow-gold shadow-soft font-bold",
            )}
          >
            Next
          </RippleButton>
        )}
      </div>
    </div>
  );
};
