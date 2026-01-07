/**
 * NegotiationPage
 *
 * Active negotiation view showing real-time conversations with all suppliers.
 * Includes decision panel when negotiations are complete.
 */

import { useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/server/_generated/api";
import type { Id } from "@/server/_generated/dataModel";
import { PageLayout } from "@/shared/components/PageLayout";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  ArrowLeft,
  Package,
  RefreshCw,
  AlertCircle,
  Bot,
  Loader2,
} from "lucide-react";
import { NegotiationAccordion } from "../ui/NegotiationAccordion";
import { DecisionPanel } from "../ui/DecisionPanel";
import {
  useQuote,
  useNegotiationsWithMessages,
  useQuoteDecision,
  useNegotiationsComplete,
} from "../domain/useQuotes";
import { useNegotiationRunner } from "../domain/useNegotiationRunner";
import { getStatusColor, getStatusLabel } from "../domain/types";
import { getProductById } from "@/shared/lib/products";

export function NegotiationPage() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();

  const quote = useQuote(quoteId as Id<"quotes">);
  const negotiations = useNegotiationsWithMessages(quoteId as Id<"quotes">);
  const decision = useQuoteDecision(quoteId as Id<"quotes">);
  const completionStatus = useNegotiationsComplete(quoteId as Id<"quotes">);

  const addIntervention = useMutation(api.negotiations.addUserIntervention);

  // Negotiation runner for triggering Mastra workflow
  const { state: runnerState, runNegotiation, isRunning } = useNegotiationRunner();

  // Track if we've already started the negotiation
  const hasTriggeredRef = useRef(false);

  const isLoading = quote === undefined || negotiations === undefined;
  const isError = quote === null;
  const isCompleted = quote?.status === "completed";
  const isReadOnly = isCompleted || quote?.status === "cancelled";

  // Check if negotiations need to be run (no messages yet)
  const needsNegotiation = useMemo(() => {
    if (!quote || !negotiations) return false;
    if (quote.status !== "negotiating") return false;
    if (decision) return false; // Decision already exists

    // Check if all negotiations have 0 messages
    const totalMessages = negotiations.reduce(
      (sum, n) => sum + (n.messages?.length ?? 0),
      0
    );
    return totalMessages === 0;
  }, [quote, negotiations, decision]);

  // Auto-trigger negotiation workflow when needed
  useEffect(() => {
    if (needsNegotiation && !isRunning && !hasTriggeredRef.current && quote && negotiations) {
      hasTriggeredRef.current = true;

      // Prepare data for the workflow
      const quoteData = {
        quoteId: quote._id,
        products: quote.products,
        userNotes: quote.userNotes,
        priorities: {
          quality: quote.decisionPriorities.quality,
          cost: quote.decisionPriorities.cost,
          leadTime: quote.decisionPriorities.leadTime,
          paymentTerms: quote.decisionPriorities.paymentTerms,
        },
      };

      const negotiationData = negotiations.map((n) => ({
        _id: n._id,
        supplierId: n.supplierId,
      }));

      runNegotiation(quoteData, negotiationData).catch((err) => {
        console.error("Negotiation failed:", err);
      });
    }
  }, [needsNegotiation, isRunning, quote, negotiations, runNegotiation]);

  // Product summary
  const productSummary = useMemo(() => {
    if (!quote?.products) return [];
    return quote.products
      .filter((p) => p.quantity > 0)
      .map((p) => {
        const product = getProductById(p.productId);
        return {
          name: product?.name ?? p.productId,
          quantity: p.quantity,
        };
      });
  }, [quote?.products]);

  const handleIntervention = async (
    negotiationId: string,
    message: string
  ): Promise<void> => {
    await addIntervention({
      negotiationId: negotiationId as Id<"negotiations">,
      content: message,
    });
  };

  if (isLoading) {
    return (
      <PageLayout title="Loading Negotiation...">
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageLayout>
    );
  }

  if (isError || !quote) {
    return (
      <PageLayout title="Negotiation Not Found">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">Quote not found</h2>
          <p className="text-muted-foreground mb-4">
            The quote you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Button onClick={() => navigate("/quotes/history")}>
            View Past Quotes
          </Button>
        </div>
      </PageLayout>
    );
  }

  // Show error state FIRST (before loading state to prevent infinite loading on errors)
  if (runnerState.status === "error") {
    return (
      <PageLayout title="Negotiation Error">
        <div className="space-y-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>

          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <AlertCircle className="w-16 h-16 text-red-600" />
                <div>
                  <h2 className="text-xl font-semibold text-red-900 mb-2">
                    Negotiation Failed
                  </h2>
                  <p className="text-red-700 max-w-md mb-4">
                    {runnerState.error}
                  </p>
                  <p className="text-sm text-red-600">
                    Please ensure the Mastra server is running on port 4111.
                  </p>
                </div>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // Show AI running state
  if (isRunning || (needsNegotiation && !decision)) {
    return (
      <PageLayout
        title={
          <div className="flex items-center gap-3">
            <span>Negotiation</span>
            <Badge className="bg-blue-100 text-blue-800" variant="secondary">
              Running
            </Badge>
          </div>
        }
        description="AI agents are negotiating with suppliers on your behalf"
      >
        <div className="space-y-6">
          {/* Back button */}
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>

          {/* AI Running Card */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <Bot className="w-16 h-16 text-blue-600" />
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin absolute -bottom-1 -right-1" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-blue-900 mb-2">
                    AI Negotiation in Progress
                  </h2>
                  <p className="text-blue-700 max-w-md">
                    {runnerState.status === "running"
                      ? runnerState.message
                      : "Our AI agents are negotiating with all 3 suppliers simultaneously to get you the best deal."}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>This usually takes 10-30 seconds...</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Summary (collapsed) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Quote Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Products
                  </h4>
                  <div className="space-y-1">
                    {productSummary.map((p, idx) => (
                      <div key={idx} className="text-sm">
                        {p.name}: {p.quantity.toLocaleString()} units
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Priorities
                  </h4>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <div>Quality: {quote.decisionPriorities.quality}%</div>
                    <div>Cost: {quote.decisionPriorities.cost}%</div>
                    <div>Lead Time: {quote.decisionPriorities.leadTime}%</div>
                    <div>Payment: {quote.decisionPriorities.paymentTerms}%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={
        <div className="flex items-center gap-3">
          <span>Negotiation</span>
          <Badge className={getStatusColor(quote.status)} variant="secondary">
            {getStatusLabel(quote.status)}
          </Badge>
        </div>
      }
      description={
        isReadOnly
          ? "Viewing completed negotiation (read-only)"
          : "AI agents are negotiating with suppliers on your behalf"
      }
    >
      <div className="space-y-6">
        {/* Back button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {!isCompleted && completionStatus?.allComplete && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing decision...
            </div>
          )}
        </div>

        {/* Quote Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Quote Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Products
                </h4>
                <div className="space-y-1">
                  {productSummary.map((p, idx) => (
                    <div key={idx} className="text-sm">
                      {p.name}: {p.quantity.toLocaleString()} units
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Priorities
                </h4>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <div>Quality: {quote.decisionPriorities.quality}%</div>
                  <div>Cost: {quote.decisionPriorities.cost}%</div>
                  <div>Lead Time: {quote.decisionPriorities.leadTime}%</div>
                  <div>Payment: {quote.decisionPriorities.paymentTerms}%</div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Progress
                </h4>
                <div className="text-sm">
                  <div>
                    Active: {completionStatus?.activeCount ?? 0} of{" "}
                    {completionStatus?.total ?? 3}
                  </div>
                  <div>Completed: {completionStatus?.completedCount ?? 0}</div>
                  <div>Impasse: {completionStatus?.impasseCount ?? 0}</div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </h4>
                <div className="text-sm">
                  {new Date(quote.createdAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(quote.createdAt).toLocaleTimeString(undefined, {
                    timeStyle: "short",
                  })}
                </div>
              </div>
            </div>
            {quote.userNotes && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Notes
                </h4>
                <p className="text-sm">{quote.userNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Decision Panel (if completed) */}
        {isCompleted && decision && negotiations && (
          <DecisionPanel
            decision={decision}
            negotiations={negotiations}
            priorities={quote.decisionPriorities}
          />
        )}

        {/* Negotiations */}
        {negotiations && negotiations.length > 0 && (
          <NegotiationAccordion
            negotiations={negotiations}
            onIntervention={handleIntervention}
            isReadOnly={isReadOnly}
          />
        )}
      </div>
    </PageLayout>
  );
}
