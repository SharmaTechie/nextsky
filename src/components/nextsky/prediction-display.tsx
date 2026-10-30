"use client";

import { useState } from "react";
import { ImageViewer } from "./image-viewer";
import { Layers, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PredictionDisplayProps {
  prediction: string | null;
  evolutionMap: string | null;
  leadTime: number;
  isLoading?: boolean;
}

const LEAD_TIME_LABELS: Record<number, string> = {
  1: "T+15 min",
  2: "T+30 min",
  3: "T+45 min",
  4: "T+60 min",
  5: "T+75 min",
  6: "T+90 min",
};

export function PredictionDisplay({
  prediction,
  evolutionMap,
  leadTime,
  isLoading,
}: PredictionDisplayProps) {
  const [showEvolutionMap, setShowEvolutionMap] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            Predicted Cloud State
          </h3>
        </div>
        <div className="aspect-square rounded-lg border border-border bg-card overflow-hidden">
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-primary/20 animate-pulse" />
              <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Running DDPM Inference
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Generating {LEAD_TIME_LABELS[leadTime]} forecast...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          Predicted Cloud State
        </h3>
        <div className="aspect-square rounded-lg border border-dashed border-border bg-card/50 flex flex-col items-center justify-center p-8">
          <Layers className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground text-center">
            Upload frames and run prediction
            <br />
            to see the forecasted cloud state
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Predicted Cloud State
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-primary">
            {LEAD_TIME_LABELS[leadTime]}
          </span>
          {evolutionMap && (
            <button
              type="button"
              onClick={() => setShowEvolutionMap(!showEvolutionMap)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors",
                showEvolutionMap
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {showEvolutionMap ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              Evolution Map
            </button>
          )}
        </div>
      </div>

      <ImageViewer
        src={prediction || "/placeholder.svg"}
        alt={`Predicted cloud state at ${LEAD_TIME_LABELS[leadTime]}`}
        showControls
        overlay={
          showEvolutionMap && evolutionMap ? (
            <img
              src={evolutionMap || "/placeholder.svg"}
              alt="Evolution map overlay"
              className="w-full h-full object-contain opacity-70 mix-blend-screen"
              crossOrigin="anonymous"
            />
          ) : null
        }
      />

      {showEvolutionMap && (
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-cloud-growth" />
            <span className="text-muted-foreground">Cloud Growth</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-cloud-dissipation" />
            <span className="text-muted-foreground">Cloud Dissipation</span>
          </div>
        </div>
      )}
    </div>
  );
}
