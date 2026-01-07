/**
 * QuoteListItem Component
 *
 * Displays a summary card for a quote in the history list.
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Package,
  Calendar,
  Trophy,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { Quote, SupplierId } from "../domain/types";
import { getStatusColor, getStatusLabel, getSupplierName } from "../domain/types";
import { getProductById } from "@/shared/lib/products";

interface QuoteListItemProps {
  quote: Quote;
  selectedSupplierId?: SupplierId;
}

function StatusIcon({ status }: { status: Quote["status"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case "cancelled":
      return <XCircle className="w-5 h-5 text-gray-400" />;
    case "negotiating":
      return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
    default:
      return <AlertCircle className="w-5 h-5 text-amber-600" />;
  }
}

export function QuoteListItem({ quote, selectedSupplierId }: QuoteListItemProps) {
  const navigate = useNavigate();

  // Calculate total units
  const totalUnits = quote.products.reduce((sum, p) => sum + p.quantity, 0);

  // Get product names
  const productNames = quote.products
    .filter((p) => p.quantity > 0)
    .map((p) => {
      const product = getProductById(p.productId);
      return product?.name ?? p.productId;
    });

  const handleClick = () => {
    navigate(`/quotes/${quote._id}/negotiations`);
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all hover:shadow-md hover:border-primary/30",
        quote.status === "negotiating" && "border-blue-200 bg-blue-50/30"
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`View quote from ${new Date(quote.createdAt).toLocaleDateString()}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Status and Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <StatusIcon status={quote.status} />

            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className={cn("shrink-0", getStatusColor(quote.status))}
                  variant="secondary"
                >
                  {getStatusLabel(quote.status)}
                </Badge>
                {quote.status === "completed" && selectedSupplierId && (
                  <Badge
                    variant="outline"
                    className="shrink-0 border-primary/50 text-primary"
                  >
                    <Trophy className="w-3 h-3 mr-1" />
                    {getSupplierName(selectedSupplierId)}
                  </Badge>
                )}
              </div>

              {/* Products */}
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {productNames.length > 2
                    ? `${productNames.slice(0, 2).join(", ")} +${productNames.length - 2} more`
                    : productNames.join(", ")}
                </span>
              </div>

              {/* Metadata */}
              <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(quote.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span>{totalUnits.toLocaleString()} units</span>
              </div>

              {/* Priorities */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[
                    { key: "quality", value: quote.decisionPriorities.quality, color: "bg-blue-500" },
                    { key: "cost", value: quote.decisionPriorities.cost, color: "bg-green-500" },
                    { key: "leadTime", value: quote.decisionPriorities.leadTime, color: "bg-amber-500" },
                    { key: "paymentTerms", value: quote.decisionPriorities.paymentTerms, color: "bg-purple-500" },
                  ]
                    .filter((p) => p.value >= 20)
                    .map((p) => (
                      <div
                        key={p.key}
                        className="h-1.5 rounded-full"
                        style={{ width: `${p.value * 0.4}px` }}
                        title={`${p.key}: ${p.value}%`}
                      >
                        <div className={cn("h-full rounded-full", p.color)} />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Action */}
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            tabIndex={-1}
          >
            View
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

