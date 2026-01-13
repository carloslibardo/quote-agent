/**
 * DecisionPanel Component
 *
 * Displays the final decision after negotiations complete.
 * Shows the selected supplier, reasoning, and evaluation scores.
 */

import { useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  BarChart3,
  FileText,
  Users,
} from "lucide-react";
import { SupplierCard } from "./SupplierCard";
import { EvaluationScoresTable } from "./EvaluationScoresTable";
import type {
  Decision,
  NegotiationWithMessages,
  DecisionPriorities,
  SupplierId,
} from "../domain/types";
import { getSupplierName } from "../domain/types";

/**
 * Render inline markdown formatting (bold, italic, code)
 */
function renderInlineFormatting(text: string): ReactNode {
  // Simple approach: handle bold first
  const boldSplit = text.split(/(\*\*[^*]+\*\*)/g);
  
  return boldSplit.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return <span key={idx}>{part}</span>;
  });
}

/**
 * Parse and render a markdown table
 */
function renderMarkdownTable(lines: string[]): ReactNode {
  if (lines.length < 2) return null;

  const headerLine = lines[0];
  const separatorLine = lines[1];
  const bodyLines = lines.slice(2);

  // Check if it's a valid table
  if (!separatorLine.includes("---")) return null;

  const headers = headerLine.split("|").filter(cell => cell.trim()).map(cell => cell.trim());
  const rows = bodyLines.map(line => 
    line.split("|").filter(cell => cell.trim()).map(cell => cell.trim())
  );

  return (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            {headers.map((header, idx) => (
              <th key={idx} className="px-3 py-2 text-left font-semibold text-foreground bg-muted/30">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b border-border/50 hover:bg-muted/20">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-3 py-2 text-muted-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Render markdown content with headers, lists, tables, and formatting
 */
function renderMarkdownContent(content: string): ReactNode {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headers
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="text-lg font-bold mt-5 mb-2 text-foreground border-b border-border pb-1">
          {line.substring(3)}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="text-base font-semibold mt-4 mb-2 text-foreground">
          {line.substring(4)}
        </h4>
      );
      i++;
      continue;
    }

    // Table detection
    if (line.includes("|") && lines[i + 1]?.includes("---")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<div key={`table-${i}`}>{renderMarkdownTable(tableLines)}</div>);
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-1">
          <span className="text-primary font-semibold">{line.match(/^\d+/)?.[0]}.</span>
          <span className="text-muted-foreground">{renderInlineFormatting(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
      i++;
      continue;
    }

    // Bullet list (- or *)
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-1">
          <span className="text-primary">•</span>
          <span className="text-muted-foreground">{renderInlineFormatting(line.substring(2))}</span>
        </div>
      );
      i++;
      continue;
    }

    // Warning indicators (⚠️)
    if (line.startsWith("⚠️")) {
      elements.push(
        <div key={i} className="flex gap-2 my-1 text-amber-600 dark:text-amber-400">
          <span>⚠️</span>
          <span>{renderInlineFormatting(line.substring(2).trim())}</span>
        </div>
      );
      i++;
      continue;
    }

    // Empty lines
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Regular paragraph with inline formatting
    elements.push(
      <p key={i} className="my-1 text-muted-foreground leading-relaxed">
        {renderInlineFormatting(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0">{elements}</div>;
}

interface DecisionPanelProps {
  decision: Decision;
  negotiations: NegotiationWithMessages[];
  priorities: DecisionPriorities;
}

const SUPPLIER_QUALITY_RATINGS: Record<SupplierId, number> = {
  1: 4.0,
  2: 4.7,
  3: 4.0,
  4: 4.3,
};

export function DecisionPanel({
  decision,
  negotiations,
  priorities,
}: DecisionPanelProps) {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

  const winnerNegotiation = negotiations.find(
    (n) => n.supplierId === decision.selectedSupplierId
  );

  const winnerScores =
    decision.evaluationScores[
      `supplier${decision.selectedSupplierId}` as
        | "supplier1"
        | "supplier2"
        | "supplier3"
        | "supplier4"
    ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Decision: {getSupplierName(decision.selectedSupplierId)} Selected
          </CardTitle>
          <Badge variant="default" className="text-lg px-4 py-1">
            Score: {winnerScores.totalScore.toFixed(1)}/100
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Winner Quick Summary */}
        {winnerNegotiation?.finalOffer && (
          <div className="grid grid-cols-4 gap-4 p-4 bg-background rounded-lg border">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Unit Price</p>
              <p className="text-2xl font-bold text-primary">
                ${winnerNegotiation.finalOffer.unitPrice.toFixed(2)}
              </p>
            </div>
            <div className="text-center border-l">
              <p className="text-sm text-muted-foreground">Lead Time</p>
              <p className="text-2xl font-bold">
                {winnerNegotiation.finalOffer.leadTimeDays} days
              </p>
            </div>
            <div className="text-center border-l">
              <p className="text-sm text-muted-foreground">Payment Terms</p>
              <p className="text-2xl font-bold">
                {winnerNegotiation.finalOffer.paymentTerms}
              </p>
            </div>
            <div className="text-center border-l">
              <p className="text-sm text-muted-foreground">Quality Rating</p>
              <p className="text-2xl font-bold">
                {SUPPLIER_QUALITY_RATINGS[decision.selectedSupplierId]}/5
              </p>
            </div>
          </div>
        )}

        {/* AI Reasoning */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              AI Decision Reasoning
            </span>
            {isReasoningExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
          {isReasoningExpanded && (
            <div className="p-4 bg-muted/50 rounded-lg overflow-x-auto">
              <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                {renderMarkdownContent(decision.reasoning)}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Analysis Tabs */}
        <Tabs defaultValue="comparison" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Score Comparison
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              All Suppliers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="mt-4">
            <EvaluationScoresTable
              scores={decision.evaluationScores}
              selectedSupplierId={decision.selectedSupplierId}
              priorities={priorities}
            />
          </TabsContent>

          <TabsContent value="suppliers" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {([1, 2, 3, 4] as const).map((supplierId) => {
                const negotiation = negotiations.find(
                  (n) => n.supplierId === supplierId
                );
                const supplierKey = `supplier${supplierId}` as
                  | "supplier1"
                  | "supplier2"
                  | "supplier3"
                  | "supplier4";
                const supplierScores = decision.evaluationScores[supplierKey];

                // Skip suppliers without scores (e.g., supplier4 on older decisions)
                if (!supplierScores) return null;

                return (
                  <SupplierCard
                    key={supplierId}
                    supplierId={supplierId}
                    scores={supplierScores}
                    finalOffer={negotiation?.finalOffer}
                    isWinner={supplierId === decision.selectedSupplierId}
                    qualityRating={SUPPLIER_QUALITY_RATINGS[supplierId]}
                  />
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          Decision made on{" "}
          {new Date(decision.createdAt).toLocaleDateString(undefined, {
            dateStyle: "full",
          })}{" "}
          at{" "}
          {new Date(decision.createdAt).toLocaleTimeString(undefined, {
            timeStyle: "short",
          })}
        </div>
      </CardContent>
    </Card>
  );
}

