"use client";

import React from "react"

import { useState, useEffect, useCallback, useRef } from "react";
import { ImageViewer } from "./image-viewer";
import type { TimeSeriesPrediction } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Film,
  Clock,
} from "lucide-react";

interface AnimationPlayerProps {
  timeSeries: TimeSeriesPrediction[] | null;
  isLoading?: boolean;
  showEvolutionMap?: boolean;
}

const LEAD_TIME_LABELS: Record<number, string> = {
  1: "T+15",
  2: "T+30",
  3: "T+45",
  4: "T+60",
  5: "T+75",
  6: "T+90",
};

const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2];

export function AnimationPlayer({
  timeSeries,
  isLoading,
  showEvolutionMap = false,
}: AnimationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showOverlay, setShowOverlay] = useState(showEvolutionMap);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalFrames = timeSeries?.length || 6;

  const clearPlayback = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    if (!timeSeries || timeSeries.length === 0) return;
    
    setIsPlaying(true);
    clearPlayback();
    
    intervalRef.current = setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= totalFrames - 1) {
          setIsPlaying(false);
          clearPlayback();
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);
  }, [timeSeries, totalFrames, playbackSpeed, clearPlayback]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    clearPlayback();
  }, [clearPlayback]);

  const reset = useCallback(() => {
    pause();
    setCurrentFrame(0);
  }, [pause]);

  const stepForward = useCallback(() => {
    pause();
    setCurrentFrame((prev) => Math.min(prev + 1, totalFrames - 1));
  }, [pause, totalFrames]);

  const stepBackward = useCallback(() => {
    pause();
    setCurrentFrame((prev) => Math.max(prev - 1, 0));
  }, [pause]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      pause();
      setCurrentFrame(Number.parseInt(e.target.value, 10));
    },
    [pause]
  );

  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed((prev) => {
      const currentIndex = PLAYBACK_SPEEDS.indexOf(prev);
      return PLAYBACK_SPEEDS[(currentIndex + 1) % PLAYBACK_SPEEDS.length];
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearPlayback();
  }, [clearPlayback]);

  // Update interval when speed changes during playback
  useEffect(() => {
    if (isPlaying) {
      play();
    }
  }, [playbackSpeed]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            Lead-Time Animation
          </h3>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="aspect-video flex items-center justify-center">
            <div className="text-center">
              <Film className="h-10 w-10 text-muted-foreground mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Generating time series predictions...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!timeSeries || timeSeries.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          Lead-Time Animation
        </h3>
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <Film className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Animation showing cloud advection and
              <br />
              convection from T+15 to T+90 min
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentPrediction = timeSeries[currentFrame];
  const currentLeadTime = currentPrediction?.lead_time || currentFrame + 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Lead-Time Animation
        </h3>
        <div className="flex items-center gap-2">
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
            Evolution
          </button>
          <span className="text-xs font-mono text-primary">
            {LEAD_TIME_LABELS[currentLeadTime]} min
          </span>
        </div>
      </div>

      {/* Video Display */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="relative">
          <ImageViewer
            src={currentPrediction?.prediction || ""}
            alt={`Prediction at ${LEAD_TIME_LABELS[currentLeadTime]}`}
            showControls={false}
            overlay={
              showOverlay && currentPrediction?.evolution_map ? (
                <img
                  src={currentPrediction.evolution_map || "/placeholder.svg"}
                  alt="Evolution map overlay"
                  className="w-full h-full object-contain opacity-60 mix-blend-screen"
                  crossOrigin="anonymous"
                />
              ) : null
            }
          />
          
          {/* Frame indicator */}
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded bg-background/80 backdrop-blur-sm">
            <Clock className="h-3 w-3 text-primary" />
            <span className="text-xs font-mono text-foreground">
              {LEAD_TIME_LABELS[currentLeadTime]} min
            </span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="p-4 border-t border-border bg-secondary/30">
          {/* Timeline Scrubber */}
          <div className="mb-4">
            <input
              type="range"
              min={0}
              max={totalFrames - 1}
              value={currentFrame}
              onChange={handleSliderChange}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between mt-1">
              {timeSeries.map((_, index) => (
                <button
                  key={`marker-${index}`}
                  type="button"
                  onClick={() => {
                    pause();
                    setCurrentFrame(index);
                  }}
                  className={cn(
                    "text-[10px] font-mono transition-colors",
                    index === currentFrame
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {LEAD_TIME_LABELS[index + 1]}
                </button>
              ))}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={reset}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Reset"
              >
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={stepBackward}
                disabled={currentFrame === 0}
                className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                aria-label="Previous frame"
              >
                <SkipBack className="h-4 w-4 text-foreground" />
              </button>
              <button
                type="button"
                onClick={isPlaying ? pause : play}
                className="p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                onClick={stepForward}
                disabled={currentFrame === totalFrames - 1}
                className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                aria-label="Next frame"
              >
                <SkipForward className="h-4 w-4 text-foreground" />
              </button>
            </div>

            {/* Speed Control */}
            <button
              type="button"
              onClick={cycleSpeed}
              className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-mono hover:bg-secondary/80 transition-colors"
            >
              {playbackSpeed}x
            </button>
          </div>
        </div>
      </div>

      {/* Current Frame Info */}
      {currentPrediction?.solar_data && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-secondary/50 border border-border text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Coverage</p>
            <p className="text-sm font-mono text-foreground">
              {currentPrediction.solar_data.cloud_coverage_percent.toFixed(0)}%
            </p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/50 border border-border text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">
              Efficiency
            </p>
            <p className="text-sm font-mono text-foreground">
              {currentPrediction.solar_data.estimated_efficiency.toFixed(0)}%
            </p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/50 border border-border text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Risk</p>
            <p
              className={cn(
                "text-sm font-mono capitalize",
                currentPrediction.solar_data.risk_level === "low" &&
                  "text-success",
                currentPrediction.solar_data.risk_level === "moderate" &&
                  "text-warning",
                currentPrediction.solar_data.risk_level === "high" &&
                  "text-orange-400",
                currentPrediction.solar_data.risk_level === "severe" &&
                  "text-destructive"
              )}
            >
              {currentPrediction.solar_data.risk_level}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
