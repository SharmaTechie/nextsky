"use client";

import { useState } from "react";
import { ImageViewer } from "./image-viewer";
import type { UncertaintyData } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AlertTriangle, ShieldCheck, Eye, EyeOff, Info } from "lucide-react";

interface UncertaintyHeatmapProps {
  data: UncertaintyData | null;
  predictionImage: string | null;
  isLoading?: boolean;
}

export function UncertaintyHeatmap({
  data,
  predictionImage,
  isLoading,
}: UncertaintyHeatmapProps) {
  const [showOverlay, setShowOverlay] = useState(true);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            Uncertainty Analysis
          </h3>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="aspect-video flex items-center justify-center">
            <div className="text-center">
              <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Computing ensemble variance...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !predictionImage) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          Uncertainty Analysis
        </h3>
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Ensemble variance heatmap will show
              <br />
              model confidence after prediction
            </p>
          </div>
        </div>
      </div>
    );
  }

  const confidenceColor =
    data.confidence_level >= 80
      ? "text-success"
      : data.confidence_level >= 60
        ? "text-warning"
        : "text-destructive";

  const confidenceLabel =
    data.confidence_level >= 80
      ? "High Confidence"
      : data.confidence_level >= 60
        ? "Moderate Confidence"
        : "Low Confidence";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Uncertainty Analysis
        </h3>
        <button
          type="button"
          onClick={() => setShowOverlay(!showOverlay)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors",
            showOverlay
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {showOverlay ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
          Variance Overlay
        </button>
      </div>

      <div className="relative">
        <ImageViewer
          src={predictionImage || "/placeholder.svg"}
          alt="Prediction with uncertainty overlay"
          showControls
          overlay={
            showOverlay && data.variance_map ? (
              <img
                src={data.variance_map || "/placeholder.svg"}
                alt="Variance heatmap overlay"
                className="w-full h-full object-contain opacity-60 mix-blend-screen"
                crossOrigin="anonymous"
              />
            ) : null
          }
        />
      </div>

      {/* Color Legend */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-blue-500 to-cyan-400" />
          <span className="text-muted-foreground">Low Variance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-yellow-400 to-orange-500" />
          <span className="text-muted-foreground">Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-red-500 to-rose-600" />
          <span className="text-muted-foreground">High Variance</span>
        </div>
      </div>

      {/* Confidence Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              Model Confidence
            </span>
            <ShieldCheck className={cn("h-4 w-4", confidenceColor)} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn("text-xl font-mono font-semibold", confidenceColor)}>
              {data.confidence_level.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {confidenceLabel}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              High Uncertainty
            </span>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-mono font-semibold text-foreground">
              {data.high_uncertainty_regions.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            of prediction area
          </p>
        </div>
      </div>

      {/* Info Tooltip */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
        <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
          Variance computed across {data?.ensemble_count ?? 0} ensemble samples. High variance regions
          (red) indicate areas where the model is less certain about cloud
          evolution patterns.
        </p>
      </div>
    </div>
  );
}
