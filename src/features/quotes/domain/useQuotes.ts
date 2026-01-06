/**
 * Quote Hooks
 *
 * Custom hooks for quote-related data fetching and mutations.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../server/_generated/api";
import type { Id } from "../../../server/_generated/dataModel";
import type {
  Quote,
  QuoteWithDetails,
  DecisionPriorities,
  ProductQuantity,
  NegotiationWithMessages,
  Decision,
  QuoteStatus,
} from "./types";

/**
 * Hook to fetch a single quote by ID
 */
export function useQuote(quoteId: Id<"quotes"> | undefined) {
  return useQuery(
    api.quotes.getQuote,
    quoteId ? { quoteId } : "skip"
  );
}

/**
 * Hook to fetch a quote with all details (negotiations, messages, decision)
 */
export function useQuoteWithDetails(quoteId: Id<"quotes"> | undefined) {
  return useQuery(
    api.quotes.getQuoteWithDetails,
    quoteId ? { quoteId } : "skip"
  ) as QuoteWithDetails | undefined | null;
}

/**
 * Hook to fetch all quotes for the authenticated user with optional status filter
 */
export function useQuotes(options?: {
  status?: QuoteStatus;
}) {
  return useQuery(api.quotes.listQuotes, {
    status: options?.status,
  }) as Quote[] | undefined;
}

/**
 * Hook to fetch negotiations for a quote
 */
export function useQuoteNegotiations(quoteId: Id<"quotes"> | undefined) {
  return useQuery(
    api.quotes.getQuoteNegotiations,
    quoteId ? { quoteId } : "skip"
  );
}

/**
 * Hook to fetch negotiations with messages for a quote
 */
export function useNegotiationsWithMessages(quoteId: Id<"quotes"> | undefined) {
  return useQuery(
    api.negotiations.getQuoteNegotiationsWithMessages,
    quoteId ? { quoteId } : "skip"
  ) as NegotiationWithMessages[] | undefined;
}

/**
 * Hook to fetch messages for a negotiation
 */
export function useNegotiationMessages(
  negotiationId: Id<"negotiations"> | undefined
) {
  return useQuery(
    api.negotiations.getNegotiationMessages,
    negotiationId ? { negotiationId } : "skip"
  );
}

/**
 * Hook to fetch decision for a quote
 */
export function useQuoteDecision(quoteId: Id<"quotes"> | undefined) {
  return useQuery(
    api.decisions.getQuoteDecision,
    quoteId ? { quoteId } : "skip"
  ) as Decision | undefined | null;
}

/**
 * Hook to check if all negotiations are complete
 */
export function useNegotiationsComplete(quoteId: Id<"quotes"> | undefined) {
  return useQuery(
    api.negotiations.checkQuoteNegotiationsComplete,
    quoteId ? { quoteId } : "skip"
  );
}

/**
 * Hook for creating a new quote (userId is set from auth context on server)
 */
export function useCreateQuote() {
  const mutation = useMutation(api.quotes.createQuote);

  return async (data: {
    products: ProductQuantity[];
    userNotes?: string;
    decisionPriorities: DecisionPriorities;
  }) => {
    return mutation(data);
  };
}

/**
 * Hook for starting negotiations
 */
export function useStartNegotiation() {
  const mutation = useMutation(api.quotes.startNegotiation);

  return async (quoteId: Id<"quotes">) => {
    return mutation({ quoteId });
  };
}

/**
 * Hook for cancelling a quote
 */
export function useCancelQuote() {
  const mutation = useMutation(api.quotes.cancelQuote);

  return async (quoteId: Id<"quotes">) => {
    return mutation({ quoteId });
  };
}

/**
 * Hook for adding user intervention
 */
export function useAddIntervention() {
  const mutation = useMutation(api.negotiations.addUserIntervention);

  return async (negotiationId: Id<"negotiations">, content: string) => {
    return mutation({ negotiationId, content });
  };
}

/**
 * Hook for completing a quote
 */
export function useCompleteQuote() {
  const mutation = useMutation(api.quotes.completeQuote);

  return async (quoteId: Id<"quotes">) => {
    return mutation({ quoteId });
  };
}

