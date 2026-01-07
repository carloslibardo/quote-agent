/**
 * EvaluationScoresTable Component
 *
 * Displays a comparison table of evaluation scores for all suppliers.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Trophy } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { SupplierId, EvaluationScores, DecisionPriorities } from "../domain/types";
import { getSupplierName } from "../domain/types";

interface EvaluationScoresTableProps {
  scores: {
    supplier1: EvaluationScores;
    supplier2: EvaluationScores;
    supplier3: EvaluationScores;
  };
  selectedSupplierId: SupplierId;
  priorities: DecisionPriorities;
}

type ScoreKey = "qualityScore" | "costScore" | "leadTimeScore" | "paymentTermsScore";

const CRITERIA: Array<{
  key: ScoreKey;
  label: string;
  priorityKey: keyof DecisionPriorities;
}> = [
  { key: "qualityScore", label: "Quality", priorityKey: "quality" },
  { key: "costScore", label: "Cost Efficiency", priorityKey: "cost" },
  { key: "leadTimeScore", label: "Lead Time", priorityKey: "leadTime" },
  { key: "paymentTermsScore", label: "Payment Terms", priorityKey: "paymentTerms" },
];

function getCellStyle(score: number, isHighest: boolean) {
  const baseClass = "text-center font-medium";
  if (isHighest) {
    return cn(baseClass, "text-green-600 font-bold");
  }
  if (score >= 70) {
    return cn(baseClass, "text-green-600");
  }
  if (score >= 50) {
    return cn(baseClass, "text-amber-600");
  }
  return cn(baseClass, "text-red-600");
}

export function EvaluationScoresTable({
  scores,
  selectedSupplierId,
  priorities,
}: EvaluationScoresTableProps) {
  const suppliers: Array<{ id: SupplierId; key: "supplier1" | "supplier2" | "supplier3" }> = [
    { id: 1, key: "supplier1" },
    { id: 2, key: "supplier2" },
    { id: 3, key: "supplier3" },
  ];

  // Find highest score for each criterion
  const highestScores: Record<ScoreKey, number> = {
    qualityScore: Math.max(
      scores.supplier1.qualityScore,
      scores.supplier2.qualityScore,
      scores.supplier3.qualityScore
    ),
    costScore: Math.max(
      scores.supplier1.costScore,
      scores.supplier2.costScore,
      scores.supplier3.costScore
    ),
    leadTimeScore: Math.max(
      scores.supplier1.leadTimeScore,
      scores.supplier2.leadTimeScore,
      scores.supplier3.leadTimeScore
    ),
    paymentTermsScore: Math.max(
      scores.supplier1.paymentTermsScore,
      scores.supplier2.paymentTermsScore,
      scores.supplier3.paymentTermsScore
    ),
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Criterion</TableHead>
            <TableHead className="text-center text-muted-foreground text-xs">
              Weight
            </TableHead>
            {suppliers.map(({ id }) => (
              <TableHead
                key={id}
                className={cn(
                  "text-center min-w-[120px]",
                  id === selectedSupplierId && "bg-primary/5"
                )}
              >
                <div className="flex items-center justify-center gap-1">
                  {id === selectedSupplierId && (
                    <Trophy className="w-4 h-4 text-primary" />
                  )}
                  {getSupplierName(id)}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {CRITERIA.map(({ key, label, priorityKey }) => (
            <TableRow key={key}>
              <TableCell className="font-medium">{label}</TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="text-xs">
                  {priorities[priorityKey]}%
                </Badge>
              </TableCell>
              {suppliers.map(({ id, key: supplierKey }) => {
                const score = scores[supplierKey][key];
                const isHighest = score === highestScores[key] && score > 0;

                return (
                  <TableCell
                    key={id}
                    className={cn(
                      getCellStyle(score, isHighest),
                      id === selectedSupplierId && "bg-primary/5"
                    )}
                  >
                    {score}
                    {isHighest && <span className="ml-1">★</span>}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          {/* Total Score Row */}
          <TableRow className="bg-muted/50 font-bold">
            <TableCell className="font-bold">Total Score</TableCell>
            <TableCell className="text-center">
              <Badge variant="secondary" className="text-xs">
                100%
              </Badge>
            </TableCell>
            {suppliers.map(({ id, key: supplierKey }) => {
              const totalScore = scores[supplierKey].totalScore;
              const isWinner = id === selectedSupplierId;

              return (
                <TableCell
                  key={id}
                  className={cn(
                    "text-center text-lg",
                    isWinner
                      ? "text-primary font-bold"
                      : totalScore >= 60
                        ? "text-green-600"
                        : "text-muted-foreground",
                    id === selectedSupplierId && "bg-primary/10"
                  )}
                >
                  {totalScore.toFixed(1)}
                </TableCell>
              );
            })}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

