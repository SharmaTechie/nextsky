"use client";

import { useState } from "react";
import { ImageViewer } from "./image-viewer";
import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnsembleExplorerProps {
  samples: string[];
  isLoading?: boolean;
}

export function EnsembleExplorer({ samples, isLoading }: EnsembleExplorerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((i) => (i === 0 ? samples.length - 1 : i - 1));
  };

  const handleNext = () => {
    setCurrentIndex((i) => (i === samples.length - 1 ? 0 : i + 1));
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          Ensemble Explorer
        </h3>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="aspect-video flex items-center justify-center">
            <div className="text-center">
              <Shuffle className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Generating ensemble samples...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          Ensemble Explorer
        </h3>
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <Shuffle className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Probabilistic scenarios from DDPM
              <br />
              stochastic sampling will appear here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Ensemble Explorer
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          Sample {currentIndex + 1} of {samples.length}
        </span>
      </div>

      <div className="relative">
        <ImageViewer
          src={samples[currentIndex] || "/placeholder.svg"}
          alt={`Ensemble sample ${currentIndex + 1}`}
          showControls
        />

        {/* Navigation buttons */}
        <button
          type="button"
          onClick={handlePrevious}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
          aria-label="Previous sample"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
          aria-label="Next sample"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {samples.map((sample, index) => (
          <button
            key={`sample-${index}`}
            type="button"
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "flex-shrink-0 w-16 h-16 rounded border overflow-hidden transition-all",
              index === currentIndex
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-primary/50"
            )}
          >
            <img
              src={sample || "/placeholder.svg"}
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
