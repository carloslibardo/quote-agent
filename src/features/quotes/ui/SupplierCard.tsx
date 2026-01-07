/**
 * SupplierCard Component
 *
 * Displays supplier information with their final offer and scores.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Trophy, Star, DollarSign, Clock, CreditCard } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { SupplierId, EvaluationScores, FinalOffer } from "../domain/types";
import { getSupplierName } from "../domain/types";

interface SupplierCardProps {
  supplierId: SupplierId;
  scores: EvaluationScores;
  finalOffer?: FinalOffer;
  isWinner?: boolean;
  qualityRating: number;
}

const SCORE_THRESHOLDS = {
  high: 70,
  medium: 50,
};

function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.high) return "text-green-600";
  if (score >= SCORE_THRESHOLDS.medium) return "text-amber-600";
  return "text-red-600";
}

function getScoreBackground(score: number): string {
  if (score >= SCORE_THRESHOLDS.high) return "bg-green-100";
  if (score >= SCORE_THRESHOLDS.medium) return "bg-amber-100";
  return "bg-red-100";
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium", getScoreColor(score))}>{score}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            getScoreBackground(score)
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function SupplierCard({
  supplierId,
  scores,
  finalOffer,
  isWinner,
  qualityRating,
}: SupplierCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
        isWinner && "ring-2 ring-primary shadow-lg"
      )}
    >
      {/* Winner badge */}
      {isWinner && (
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground px-3 py-1 text-xs font-medium flex items-center gap-1 rounded-bl-lg">
            <Trophy className="w-3 h-3" />
            Selected
          </div>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getSupplierName(supplierId)}
            <Badge variant="outline" className="text-xs font-normal">
              <Star className="w-3 h-3 mr-1 fill-amber-400 text-amber-400" />
              {qualityRating.toFixed(1)}
            </Badge>
          </CardTitle>
          <div
            className={cn(
              "text-2xl font-bold",
              isWinner ? "text-primary" : getScoreColor(scores.totalScore)
            )}
          >
            {scores.totalScore.toFixed(1)}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Total Score</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Final Offer Details */}
        {finalOffer ? (
          <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <DollarSign className="w-3 h-3" />
                Price
              </div>
              <div className="font-semibold">
                ${finalOffer.unitPrice.toFixed(2)}
              </div>
            </div>
            <div className="text-center border-x border-muted">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <Clock className="w-3 h-3" />
                Lead Time
              </div>
              <div className="font-semibold">{finalOffer.leadTimeDays} days</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <CreditCard className="w-3 h-3" />
                Payment
              </div>
              <div className="font-semibold">{finalOffer.paymentTerms}</div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
            No final offer available
          </div>
        )}

        {/* Score Breakdown */}
        <div className="space-y-3">
          <ScoreBar score={scores.qualityScore} label="Quality" />
          <ScoreBar score={scores.costScore} label="Cost Efficiency" />
          <ScoreBar score={scores.leadTimeScore} label="Lead Time" />
          <ScoreBar score={scores.paymentTermsScore} label="Payment Terms" />
        </div>
      </CardContent>
    </Card>
  );
}

