/**
 * PriorityWeightSliders Component
 *
 * Allows users to set priority weights for decision criteria.
 * Weights must sum to 100%.
 */

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Slider } from "@/shared/components/ui/slider";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { DecisionPriorities } from "../domain/types";

interface PriorityWeightSlidersProps {
  value: DecisionPriorities;
  onChange: (priorities: DecisionPriorities) => void;
  error?: string;
}

interface PriorityConfig {
  key: keyof DecisionPriorities;
  label: string;
  description: string;
  color: string;
}

const PRIORITY_CONFIGS: PriorityConfig[] = [
  {
    key: "quality",
    label: "Quality",
    description: "Product quality and craftsmanship",
    color: "bg-blue-500",
  },
  {
    key: "cost",
    label: "Cost",
    description: "Unit price and total cost",
    color: "bg-green-500",
  },
  {
    key: "leadTime",
    label: "Lead Time",
    description: "Delivery speed and timeline",
    color: "bg-amber-500",
  },
  {
    key: "paymentTerms",
    label: "Payment Terms",
    description: "Payment schedule and cash flow",
    color: "bg-purple-500",
  },
];

const DEFAULT_PRIORITIES: DecisionPriorities = {
  quality: 25,
  cost: 25,
  leadTime: 25,
  paymentTerms: 25,
};

export function PriorityWeightSliders({
  value,
  onChange,
  error,
}: PriorityWeightSlidersProps) {
  const [localPriorities, setLocalPriorities] = useState<DecisionPriorities>(
    value || DEFAULT_PRIORITIES
  );

  // Sync external value changes
  useEffect(() => {
    if (value) {
      setLocalPriorities(value);
    }
  }, [value]);

  const totalWeight =
    localPriorities.quality +
    localPriorities.cost +
    localPriorities.leadTime +
    localPriorities.paymentTerms;

  const isValid = totalWeight === 100;

  const handleSliderChange = useCallback(
    (key: keyof DecisionPriorities, newValue: number[]) => {
      const updated = {
        ...localPriorities,
        [key]: newValue[0],
      };
      setLocalPriorities(updated);
      onChange(updated);
    },
    [localPriorities, onChange]
  );

  const handleAutoBalance = useCallback(() => {
    const balanced = { ...localPriorities };
    const diff = 100 - totalWeight;

    if (diff !== 0) {
      // Distribute the difference evenly across all priorities
      const perPriority = Math.floor(diff / 4);
      const remainder = diff % 4;

      balanced.quality += perPriority + (remainder > 0 ? 1 : 0);
      balanced.cost += perPriority + (remainder > 1 ? 1 : 0);
      balanced.leadTime += perPriority + (remainder > 2 ? 1 : 0);
      balanced.paymentTerms += perPriority + (remainder > 3 ? 1 : 0);

      // Clamp values between 0 and 100
      Object.keys(balanced).forEach((key) => {
        balanced[key as keyof DecisionPriorities] = Math.max(
          0,
          Math.min(100, balanced[key as keyof DecisionPriorities])
        );
      });

      setLocalPriorities(balanced);
      onChange(balanced);
    }
  }, [localPriorities, totalWeight, onChange]);

  const handleReset = useCallback(() => {
    setLocalPriorities(DEFAULT_PRIORITIES);
    onChange(DEFAULT_PRIORITIES);
  }, [onChange]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Decision Priorities</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Set the importance of each factor. Weights must total 100%.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isValid ? (
              <Badge
                variant="default"
                className="bg-green-100 text-green-800 hover:bg-green-100"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Valid
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                {totalWeight}% / 100%
              </Badge>
            )}
          </div>
        </div>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {PRIORITY_CONFIGS.map((config) => {
            const currentValue = localPriorities[config.key];

            return (
              <div key={config.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={`slider-${config.key}`} className="font-medium">
                      {config.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${config.color}`} />
                    <span className="text-lg font-semibold w-12 text-right">
                      {currentValue}%
                    </span>
                  </div>
                </div>
                <Slider
                  id={`slider-${config.key}`}
                  min={0}
                  max={100}
                  step={5}
                  value={[currentValue]}
                  onValueChange={(val) => handleSliderChange(config.key, val)}
                  className="w-full"
                  aria-label={`${config.label} priority weight`}
                />
              </div>
            );
          })}
        </div>

        {/* Visual weight distribution */}
        <div className="mt-6">
          <p className="text-sm font-medium mb-2">Weight Distribution</p>
          <div className="h-4 rounded-full overflow-hidden flex bg-muted">
            {PRIORITY_CONFIGS.map((config) => {
              const width = (localPriorities[config.key] / 100) * 100;
              if (width === 0) return null;
              return (
                <div
                  key={config.key}
                  className={`${config.color} transition-all duration-200`}
                  style={{ width: `${width}%` }}
                  title={`${config.label}: ${localPriorities[config.key]}%`}
                />
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={handleAutoBalance}
            disabled={isValid}
            className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Auto-balance to 100%
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Reset to equal weights
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

