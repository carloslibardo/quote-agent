/**
 * ConversationMessages Component
 *
 * Displays the message history for a negotiation conversation.
 */

import { useEffect, useRef } from "react";
import { Bot, User, MessageSquare } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { Message, MessageSender } from "../domain/types";

interface ConversationMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

const SENDER_CONFIG: Record<
  MessageSender,
  {
    label: string;
    icon: typeof Bot;
    bgClass: string;
    textClass: string;
  }
> = {
  brand: {
    label: "Brand Agent",
    icon: Bot,
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
  },
  supplier: {
    label: "Supplier",
    icon: MessageSquare,
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
  },
  user: {
    label: "You",
    icon: User,
    bgClass: "bg-green-50",
    textClass: "text-green-700",
  },
};

export function ConversationMessages({
  messages,
  isLoading,
}: ConversationMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No messages yet</p>
        <p className="text-sm">Negotiations will appear here</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="space-y-4 max-h-[400px] overflow-y-auto pr-2"
      role="log"
      aria-label="Negotiation conversation"
      aria-live="polite"
    >
      {messages.map((message) => {
        const config = SENDER_CONFIG[message.sender];
        const Icon = config.icon;

        return (
          <div
            key={message._id}
            className={cn(
              "flex gap-3 p-3 rounded-lg",
              message.sender === "brand" && "ml-0 mr-8",
              message.sender === "supplier" && "ml-8 mr-0",
              message.sender === "user" && "ml-4 mr-4 border-2 border-dashed",
              config.bgClass
            )}
          >
            <div
              className={cn(
                "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                config.textClass,
                "bg-white/80"
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("font-medium text-sm", config.textClass)}>
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </div>
              {message.metadata?.toolCalls &&
                message.metadata.toolCalls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {message.metadata.toolCalls.map((tool, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 rounded bg-white/50 text-muted-foreground"
                      >
                        🔧 {tool}
                      </span>
                    ))}
                  </div>
                )}
            </div>
          </div>
        );
      })}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex gap-3 p-3 rounded-lg bg-muted/50 animate-pulse">
          <div className="shrink-0 w-8 h-8 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-2/3 bg-muted rounded" />
          </div>
        </div>
      )}
    </div>
  );
}

