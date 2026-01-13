/**
 * Negotiation Runner Hook
 *
 * Orchestrates the connection between the Mastra workflow and Convex database.
 * Triggers the AI negotiation workflow and persists results to the database.
 */

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/server/_generated/api";
import type { Id } from "@/server/_generated/dataModel";
import { mastraClient } from "@/lib/mastra-client";

/**
 * Product offer from workflow
 */
interface ProductOfferResult {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  materialSubstitution?: {
    original: string;
    suggested: string;
    savings: number;
  };
}

/**
 * Final offer from workflow
 */
interface FinalOfferResult {
  products?: ProductOfferResult[];
  subtotal?: number;
  volumeDiscount?: number;
  volumeDiscountPercent?: number;
  unitPrice: number;
  leadTimeDays: number;
  paymentTerms: string;
}

/**
 * Workflow result type
 */
interface WorkflowResult {
  quoteId: string;
  decision: {
    selectedSupplierId: number;
    reasoning: string;
  };
  negotiations: Array<{
    supplierId: number;
    status: string;
    roundCount: number;
    messages: Array<{
      sender: "brand" | "supplier";
      content: string;
      timestamp: number;
    }>;
    finalOffer?: FinalOfferResult;
  }>;
  evaluationScores: Record<
    string,
    {
      qualityScore: number;
      costScore: number;
      leadTimeScore: number;
      paymentTermsScore: number;
      totalScore: number;
    }
  >;
}

/**
 * Runner state
 */
type RunnerState =
  | { status: "idle" }
  | { status: "running"; message: string }
  | { status: "success"; result: WorkflowResult }
  | { status: "error"; error: string };

/**
 * Quote data for workflow
 */
interface QuoteData {
  quoteId: Id<"quotes">;
  products: Array<{
    productId: string;
    quantity: number;
  }>;
  userNotes?: string;
  priorities: {
    quality: number;
    cost: number;
    leadTime: number;
    paymentTerms: number;
  };
}

/**
 * Hook for running negotiations via Mastra and persisting to Convex
 */
export function useNegotiationRunner() {
  const [state, setState] = useState<RunnerState>({ status: "idle" });

  // Convex mutations for persisting results
  const addMessage = useMutation(api.negotiations.addMessage);
  const updateNegotiationStatus = useMutation(
    api.negotiations.updateNegotiationStatus
  );
  const createDecision = useMutation(api.decisions.createDecision);

  /**
   * Run the negotiation workflow
   */
  const runNegotiation = useCallback(
    async (
      quoteData: QuoteData,
      negotiations: Array<{ _id: Id<"negotiations">; supplierId: number }>
    ) => {
      setState({ status: "running", message: "Starting AI negotiations..." });

      try {
        // Get the workflow from Mastra
        const workflow = mastraClient.getWorkflow("negotiationWorkflow");

        setState({
          status: "running",
          message: "AI agents negotiating with suppliers...",
        });

        // Create a run and execute the workflow
        const run = await workflow.createRun();

        const result = await run.startAsync({
          inputData: {
            quoteId: quoteData.quoteId,
            products: quoteData.products,
            userNotes: quoteData.userNotes,
            priorities: quoteData.priorities,
          },
        });

        // Check if workflow completed successfully
        if (result.status !== "success") {
          const errorMessage = result.status === "failed" 
            ? (result as { error?: Error }).error?.message || "Unknown error"
            : `Workflow ended with status: ${result.status}`;
          throw new Error(errorMessage);
        }

        // The workflow result is the output of the workflow
        const workflowResult = result.result as WorkflowResult;

        // Debug: Log the workflow result structure
        console.log("[NegotiationRunner] Workflow result:", {
          quoteId: workflowResult.quoteId,
          negotiationsCount: workflowResult.negotiations?.length,
          negotiations: workflowResult.negotiations?.map((n) => ({
            supplierId: n.supplierId,
            status: n.status,
            roundCount: n.roundCount,
            messagesCount: n.messages?.length,
            hasOffer: !!n.finalOffer,
          })),
        });

        setState({
          status: "running",
          message: "Saving negotiation results...",
        });

        // Persist messages and offers to Convex
        for (const neg of workflowResult.negotiations) {
          // Find the matching Convex negotiation ID
          const convexNegotiation = negotiations.find(
            (n) => n.supplierId === neg.supplierId
          );

          if (!convexNegotiation) {
            console.warn(
              `No Convex negotiation found for supplier ${neg.supplierId}`
            );
            continue;
          }

          // Debug: Log what we're updating
          console.log(
            `[NegotiationRunner] Updating negotiation ${convexNegotiation._id}:`,
            {
              supplierId: neg.supplierId,
              status: neg.status,
              roundCount: neg.roundCount,
              messagesCount: neg.messages?.length,
            }
          );

          // Add all messages to the negotiation
          for (const msg of neg.messages) {
            await addMessage({
              negotiationId: convexNegotiation._id,
              sender: msg.sender,
              content: msg.content,
            });
          }

          // Update negotiation status with final offer and round count
          const updatePayload = {
            negotiationId: convexNegotiation._id,
            status: (neg.status === "completed" ? "completed" : "impasse") as
              | "completed"
              | "impasse",
            roundCount: neg.roundCount,
            finalOffer: neg.finalOffer
              ? {
                  products: neg.finalOffer.products,
                  subtotal: neg.finalOffer.subtotal,
                  volumeDiscount: neg.finalOffer.volumeDiscount,
                  volumeDiscountPercent: neg.finalOffer.volumeDiscountPercent,
                  unitPrice: neg.finalOffer.unitPrice,
                  leadTimeDays: neg.finalOffer.leadTimeDays,
                  paymentTerms: neg.finalOffer.paymentTerms,
                }
              : undefined,
          };

          console.log(
            `[NegotiationRunner] Update payload for supplier ${neg.supplierId}:`,
            updatePayload
          );

          await updateNegotiationStatus(updatePayload);
        }

        // Create the decision
        await createDecision({
          quoteId: quoteData.quoteId,
          selectedSupplierId: workflowResult.decision.selectedSupplierId as
            | 1
            | 2
            | 3
            | 4,
          reasoning: workflowResult.decision.reasoning,
          evaluationScores: {
            supplier1: workflowResult.evaluationScores.supplier1,
            supplier2: workflowResult.evaluationScores.supplier2,
            supplier3: workflowResult.evaluationScores.supplier3,
            // Only include supplier4 if it exists in the workflow result
            ...(workflowResult.evaluationScores.supplier4 && {
              supplier4: workflowResult.evaluationScores.supplier4,
            }),
          },
        });

        setState({ status: "success", result: workflowResult });
        return workflowResult;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setState({ status: "error", error: errorMessage });
        throw error;
      }
    },
    [addMessage, updateNegotiationStatus, createDecision]
  );

  /**
   * Reset the runner state
   */
  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return {
    state,
    runNegotiation,
    reset,
    isRunning: state.status === "running",
    isSuccess: state.status === "success",
    isError: state.status === "error",
  };
}
