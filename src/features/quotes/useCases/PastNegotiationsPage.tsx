/**
 * PastNegotiationsPage
 *
 * Lists all completed and past quote negotiations.
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/shared/components/PageLayout";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Plus, Search, Filter, FileText, History } from "lucide-react";
import { QuoteListItem } from "../ui/QuoteListItem";
import { useQuotes } from "../domain/useQuotes";
import type { QuoteStatus, SupplierId } from "../domain/types";

type FilterStatus = QuoteStatus | "all";

export function PastNegotiationsPage() {
  const navigate = useNavigate();
  const quotes = useQuotes();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  // Filter and sort quotes
  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];

    return quotes
      .filter((quote) => {
        // Status filter
        if (statusFilter !== "all" && quote.status !== statusFilter) {
          return false;
        }

        // Search filter (search in product IDs)
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const hasMatchingProduct = quote.products.some((p) =>
            p.productId.toLowerCase().includes(query)
          );
          const hasMatchingNotes = quote.userNotes
            ?.toLowerCase()
            .includes(query);
          return hasMatchingProduct || hasMatchingNotes;
        }

        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [quotes, statusFilter, searchQuery]);

  const isLoading = quotes === undefined;

  // Count by status
  const statusCounts = useMemo(() => {
    if (!quotes) return { all: 0, pending: 0, negotiating: 0, completed: 0, cancelled: 0 };

    return {
      all: quotes.length,
      pending: quotes.filter((q) => q.status === "pending").length,
      negotiating: quotes.filter((q) => q.status === "negotiating").length,
      completed: quotes.filter((q) => q.status === "completed").length,
      cancelled: quotes.filter((q) => q.status === "cancelled").length,
    };
  }, [quotes]);

  return (
    <PageLayout
      title={
        <div className="flex items-center gap-2">
          <History className="w-6 h-6" />
          Past Negotiations
        </div>
      }
      description="View and manage your quote history"
    >
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search quotes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as FilterStatus)}
            >
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({statusCounts.all})</SelectItem>
                <SelectItem value="pending">
                  Pending ({statusCounts.pending})
                </SelectItem>
                <SelectItem value="negotiating">
                  Negotiating ({statusCounts.negotiating})
                </SelectItem>
                <SelectItem value="completed">
                  Completed ({statusCounts.completed})
                </SelectItem>
                <SelectItem value="cancelled">
                  Cancelled ({statusCounts.cancelled})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => navigate("/quotes/new")} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </div>

        {/* Quote List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            {quotes?.length === 0 ? (
              <>
                <h3 className="text-lg font-medium mb-2">No quotes yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first quote to start negotiating with suppliers.
                </p>
                <Button onClick={() => navigate("/quotes/new")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quote
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No matching quotes</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filter criteria.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3" role="list" aria-label="Quote history">
            {filteredQuotes.map((quote) => (
              <QuoteListItem
                key={quote._id}
                quote={quote}
                selectedSupplierId={undefined as SupplierId | undefined}
              />
            ))}
          </div>
        )}

        {/* Results count */}
        {!isLoading && filteredQuotes.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {filteredQuotes.length} of {quotes?.length ?? 0} quotes
          </p>
        )}
      </div>
    </PageLayout>
  );
}

