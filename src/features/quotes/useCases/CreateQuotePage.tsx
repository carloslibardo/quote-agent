/**
 * CreateQuotePage
 *
 * Quote initiation page where users configure product quantities,
 * set decision priorities, and add optional notes.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/server/_generated/api";
import { PageLayout } from "@/shared/components/PageLayout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { ProductQuantitySelector } from "../ui/ProductQuantitySelector";
import { PriorityWeightSliders } from "../ui/PriorityWeightSliders";
import { validateProductQuantities } from "@/shared/lib/products";
import type { ProductQuantity } from "@/shared/lib/products";
import type { DecisionPriorities } from "../domain/types";
import { validatePriorities } from "../domain/types";

export function CreateQuotePage() {
  const navigate = useNavigate();
  const createQuote = useMutation(api.quotes.createQuote);
  const startNegotiation = useMutation(api.quotes.startNegotiation);

  const [products, setProducts] = useState<ProductQuantity[]>([]);
  const [priorities, setPriorities] = useState<DecisionPriorities>({
    quality: 25,
    cost: 25,
    leadTime: 25,
    paymentTerms: 25,
  });
  const [userNotes, setUserNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!validateProductQuantities(products)) {
      newErrors.products = "At least one product must have a quantity greater than 0";
    }

    if (!validatePriorities(priorities)) {
      const sum =
        priorities.quality +
        priorities.cost +
        priorities.leadTime +
        priorities.paymentTerms;
      newErrors.priorities = `Priority weights must sum to 100% (currently ${sum}%)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the quote (userId is automatically set from auth context)
      const quoteId = await createQuote({
        products: products.filter((p) => p.quantity > 0),
        userNotes: userNotes.trim() || undefined,
        decisionPriorities: priorities,
      });

      // Start negotiations
      await startNegotiation({ quoteId });

      // Navigate to negotiation page
      navigate(`/quotes/${quoteId}/negotiations`);
    } catch (error) {
      console.error("Failed to create quote:", error);
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Failed to create quote. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout
      title="New Quote Request"
      description="Configure your sourcing requirements and start AI-powered negotiations with suppliers."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error banner */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error creating quote</p>
              <p className="text-sm text-red-700 mt-1">{errors.submit}</p>
            </div>
          </div>
        )}

        {/* Product Selection */}
        <ProductQuantitySelector
          value={products}
          onChange={setProducts}
          error={errors.products}
        />

        {/* Priority Weights */}
        <PriorityWeightSliders
          value={priorities}
          onChange={setPriorities}
          error={errors.priorities}
        />

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Guidance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="user-notes">
                Notes for the AI Negotiator (Optional)
              </Label>
              <Textarea
                id="user-notes"
                placeholder="Add any specific requirements, constraints, or negotiation strategies you'd like the AI to follow..."
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                These notes will guide the AI brand agent during negotiations.
                For example: "Prioritize Supplier 2 if quality is close" or
                "We need delivery by March 15th"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[180px]">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Quote...
              </>
            ) : (
              <>
                Start Negotiations
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}

