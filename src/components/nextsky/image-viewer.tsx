"use client";

import React from "react"

import { useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  src: string;
  alt: string;
  label?: string;
  sublabel?: string;
  showControls?: boolean;
  className?: string;
  overlay?: React.ReactNode;
}

export function ImageViewer({
  src,
  alt,
  label,
  sublabel,
  showControls = false,
  className,
  overlay,
}: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleReset = () => setScale(1);

  return (
    <>
      <div
        className={cn(
          "relative rounded-lg border border-border bg-card overflow-hidden group",
          className
        )}
      >
        {/* Header */}
        {(label || sublabel) && (
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-background/90 to-transparent p-2">
            {label && (
              <span className="text-xs font-medium text-foreground">
                {label}
              </span>
            )}
            {sublabel && (
              <span className="text-[10px] text-muted-foreground ml-2">
                {sublabel}
              </span>
            )}
          </div>
        )}

        {/* Image container */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={src || "/placeholder.svg"}
            alt={alt}
            className="w-full h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${scale})` }}
            crossOrigin="anonymous"
          />
          
          {/* Overlay */}
          {overlay && (
            <div className="absolute inset-0 pointer-events-none">
              {overlay}
            </div>
          )}
        </div>

        {/* Controls */}
        {showControls && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded bg-background/80 hover:bg-background text-foreground transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded bg-background/80 hover:bg-background text-foreground transition-colors"
              aria-label="Reset zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded bg-background/80 hover:bg-background text-foreground transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 rounded bg-background/80 hover:bg-background text-foreground transition-colors"
              aria-label="Fullscreen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-8"
          onClick={() => setIsFullscreen(false)}
          onKeyDown={(e) => e.key === "Escape" && setIsFullscreen(false)}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={src || "/placeholder.svg"}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            crossOrigin="anonymous"
          />
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-card text-foreground hover:bg-secondary transition-colors"
            aria-label="Close fullscreen"
          >
            <span className="text-sm">Press ESC to close</span>
          </button>
        </div>
      )}
    </>
  );
}
