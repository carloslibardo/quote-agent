/**
 * NegotiationAccordion Component
 *
 * Accordion view displaying all supplier negotiations for a quote.
 * Each supplier has an expandable section with messages, offer breakdown, and intervention input.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Lightbulb,
  MessageSquare,
  Percent,
  Tag,
  XCircle,
} from "lucide-react";
import type {
  NegotiationWithMessages,
  ProductOffer,
  SupplierId,
} from "../domain/types";
import { getStatusColor, getSupplierName } from "../domain/types";
import { ConversationMessages } from "./ConversationMessages";
import { InterventionInput } from "./InterventionInput";

interface NegotiationAccordionProps {
  negotiations: NegotiationWithMessages[];
  onIntervention: (negotiationId: string, message: string) => Promise<void>;
  isReadOnly?: boolean;
}

const SUPPLIER_INFO: Record<
  SupplierId,
  { rating: string; description: string; name: string }
> = {
  1: {
    name: "ChinaFootwear Co.",
    rating: "4.0/5",
    description: "Budget-friendly • 45-day delivery • 33/33/33 payment",
  },
  2: {
    name: "VietnamPremium Ltd.",
    rating: "4.7/5",
    description: "Premium quality • 25-day delivery • 30/70 payment",
  },
  3: {
    name: "IndonesiaExpress",
    rating: "4.0/5",
    description: "Fast delivery • 15-day delivery • 30/70 payment",
  },
  4: {
    name: "FlexiDeal Partners",
    rating: "4.3/5",
    description: "Highly negotiable • 30-day delivery • 50/50 payment",
  },
};

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case "impasse":
      return <XCircle className="w-4 h-4 text-red-600" />;
    case "active":
    default:
      return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
  }
}

/**
 * Product invoice table component
 */
function ProductInvoiceTable({ products }: { products: ProductOffer[] }) {
  const hasMaterialSubs = products.some((p) => p.materialSubstitution);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[200px]">Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Line Total</TableHead>
            {hasMaterialSubs && (
              <TableHead className="text-right">Savings Option</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.productId}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{product.productName}</span>
                  <span className="text-xs text-muted-foreground">
                    {product.productId}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {product.quantity.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                ${product.unitPrice.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-medium">
                $
                {product.lineTotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </TableCell>
              {hasMaterialSubs && (
                <TableCell className="text-right">
                  {product.materialSubstitution ? (
                    <div className="flex items-center justify-end gap-1 text-xs">
                      <Lightbulb className="w-3 h-3 text-amber-500" />
                      <span className="text-amber-700">
                        {product.materialSubstitution.suggested}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-300 text-[10px] px-1"
                      >
                        -{product.materialSubstitution.savings}%
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Material substitution callout
 */
function MaterialSubstitutionCallout({
  products,
}: {
  products: ProductOffer[];
}) {
  const substitutions = products.filter((p) => p.materialSubstitution);
  if (substitutions.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <h5 className="font-medium text-amber-800 text-sm mb-1">
            Material Alternatives Available
          </h5>
          <ul className="text-xs text-amber-700 space-y-1">
            {substitutions.map((p) => (
              <li key={p.productId}>
                <strong>{p.productName}:</strong> Consider{" "}
                <span className="font-medium">
                  {p.materialSubstitution!.suggested}
                </span>{" "}
                instead of {p.materialSubstitution!.original} (save{" "}
                {p.materialSubstitution!.savings}% per unit)
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function NegotiationAccordion({
  negotiations,
  onIntervention,
  isReadOnly,
}: NegotiationAccordionProps) {
  // Sort negotiations by supplier ID
  const sortedNegotiations = [...negotiations].sort(
    (a, b) => a.supplierId - b.supplierId
  );

  // Determine default open items (active negotiations)
  const defaultOpen = sortedNegotiations
    .filter((n) => n.status === "active")
    .map((n) => `negotiation-${n.supplierId}`);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Supplier Negotiations</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-blue-600" />
              Active: {negotiations.filter((n) => n.status === "active").length}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Completed:{" "}
              {negotiations.filter((n) => n.status === "completed").length}
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Impasse:{" "}
              {negotiations.filter((n) => n.status === "impasse").length}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion
          type="multiple"
          defaultValue={
            defaultOpen.length > 0 ? defaultOpen : ["negotiation-1"]
          }
          className="space-y-2"
        >
          {sortedNegotiations.map((negotiation) => {
            const supplierInfo = SUPPLIER_INFO[negotiation.supplierId];
            const isActive = negotiation.status === "active";
            const offer = negotiation.finalOffer;

            return (
              <AccordionItem
                key={negotiation._id}
                value={`negotiation-${negotiation.supplierId}`}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(negotiation.status)}
                      <div className="text-left">
                        <div className="font-medium">{supplierInfo.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {supplierInfo.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {offer && (
                        <Badge
                          variant="outline"
                          className="text-xs font-mono bg-green-50 text-green-700 border-green-300"
                        >
                          ${offer.unitPrice.toFixed(2)}/unit
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        ⭐ {supplierInfo.rating}
                      </Badge>
                      <Badge
                        className={getStatusColor(negotiation.status)}
                        variant="secondary"
                      >
                        {negotiation.status}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="w-3 h-3" />
                        {negotiation.messages.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {negotiation.roundCount > 0
                          ? `${negotiation.roundCount} rounds`
                          : "Starting..."}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    {/* Final offer display if completed */}
                    {offer && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Final Offer from {supplierInfo.name}
                        </h4>

                        {/* Product breakdown table */}
                        {offer.products && offer.products.length > 0 && (
                          <>
                            <ProductInvoiceTable products={offer.products} />
                            <MaterialSubstitutionCallout
                              products={offer.products}
                            />
                          </>
                        )}

                        {/* Summary pricing */}
                        <div className="mt-4 pt-3 border-t border-green-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {offer.subtotal && (
                              <div className="bg-white/50 rounded-md p-2">
                                <span className="text-muted-foreground block text-xs">
                                  Subtotal
                                </span>
                                <span className="font-medium">
                                  $
                                  {offer.subtotal.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            )}
                            {offer.volumeDiscount &&
                              offer.volumeDiscount > 0 && (
                                <div className="bg-white/50 rounded-md p-2">
                                  <span className="text-muted-foreground block text-xs flex items-center gap-1">
                                    <Percent className="w-3 h-3" />
                                    Volume Discount (
                                    {offer.volumeDiscountPercent}
                                    %)
                                  </span>
                                  <span className="font-medium text-green-700">
                                    -$
                                    {offer.volumeDiscount.toLocaleString(
                                      undefined,
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }
                                    )}
                                  </span>
                                </div>
                              )}
                            <div className="bg-white/50 rounded-md p-2">
                              <span className="text-muted-foreground block text-xs">
                                Avg Unit Price
                              </span>
                              <span className="font-bold text-lg">
                                ${offer.unitPrice.toFixed(2)}
                              </span>
                            </div>
                            <div className="bg-white/50 rounded-md p-2">
                              <span className="text-muted-foreground block text-xs">
                                Lead Time
                              </span>
                              <span className="font-medium">
                                {offer.leadTimeDays} days
                              </span>
                            </div>
                            <div className="bg-white/50 rounded-md p-2">
                              <span className="text-muted-foreground block text-xs">
                                Payment Terms
                              </span>
                              <span className="font-medium">
                                {offer.paymentTerms}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Messages */}
                    <ConversationMessages
                      messages={negotiation.messages}
                      isLoading={isActive}
                    />

                    {/* Intervention input for active negotiations */}
                    {isActive && !isReadOnly && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Send Guidance
                          </h4>
                          <InterventionInput
                            onSubmit={(message) =>
                              onIntervention(negotiation._id, message)
                            }
                            disabled={!isActive}
                            placeholder={`Guide the negotiation with ${getSupplierName(negotiation.supplierId)}...`}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
