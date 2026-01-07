/**
 * InterventionInput Component
 *
 * Allows users to send guidance messages to the brand agent
 * during active negotiations.
 */

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

interface InterventionInputProps {
  onSubmit: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function InterventionInput({
  onSubmit,
  disabled,
  placeholder = "Send guidance to the brand agent...",
}: InterventionInputProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSubmitting || disabled) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(trimmedMessage);
      setMessage("");
    } catch (error) {
      console.error("Failed to send intervention:", error);
      // Error handling is done by the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isDisabled = disabled || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          rows={2}
          className="resize-none pr-12"
          aria-label="Intervention message"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isDisabled || !message.trim()}
          className="absolute right-2 bottom-2 h-8 w-8"
          aria-label="Send message"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl</kbd> +{" "}
        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to send
      </p>
    </form>
  );
}

