"use client";

import React from "react"

import type { PredictionMetrics } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Activity, TrendingUp, Target, Calculator } from "lucide-react";

interface MetricsPanelProps {
  metrics: PredictionMetrics | null;
  isLoading?: boolean;
}

interface MetricItemProps {
  label: string;
  value: number | null;
  unit?: string;
  description: string;
  icon: React.ReactNode;
  isGood?: (value: number) => boolean;
  formatValue?: (value: number) => string;
}

function MetricItem({
  label,
  value,
  unit,
  description,
  icon,
  isGood,
  formatValue,
}: MetricItemProps) {
  const formattedValue =
    value !== null
      ? formatValue
        ? formatValue(value)
        : value.toFixed(4)
      : "—";

  const status =
    value !== null && isGood ? (isGood(value) ? "good" : "warning") : "neutral";

  return (
    <div className="p-4 rounded-lg bg-card border border-border">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-2xl font-mono font-semibold",
            status === "good" && "text-success",
            status === "warning" && "text-warning",
            status === "neutral" && "text-foreground"
          )}
        >
          {formattedValue}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export function MetricsPanel({ metrics, isLoading }: MetricsPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          Scientific Metrics
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-lg bg-card border border-border animate-pulse"
            >
              <div className="h-4 bg-muted rounded w-16 mb-3" />
              <div className="h-8 bg-muted rounded w-24 mb-2" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Scientific Metrics</h3>
      <div className="grid grid-cols-2 gap-3">
        <MetricItem
          label="SSIM"
          value={metrics?.ssim ?? null}
          description="Structural Similarity Index. Higher values indicate better perceptual quality."
          icon={<Activity className="h-4 w-4" />}
          isGood={(v) => v > 0.8}
        />
        <MetricItem
          label="LPIPS"
          value={metrics?.lpips ?? null}
          description="Learned Perceptual Image Patch Similarity. Lower values indicate better perceptual similarity."
          icon={<TrendingUp className="h-4 w-4" />}
          isGood={(v) => v < 0.2}
        />
        <MetricItem
          label="CSI"
          value={metrics?.csi ?? null}
          description="Critical Success Index. Measures forecast skill for cloud detection threshold."
          icon={<Target className="h-4 w-4" />}
          isGood={(v) => v > 0.6}
        />
        <MetricItem
          label="MSE"
          value={metrics?.mse ?? null}
          description="Mean Squared Error. Lower values indicate better pixel-level accuracy."
          icon={<Calculator className="h-4 w-4" />}
          isGood={(v) => v < 0.01}
          formatValue={(v) => v.toExponential(2)}
        />
      </div>
    </div>
  );
}
