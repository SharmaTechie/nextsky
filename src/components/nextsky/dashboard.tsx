"use client";

import { useNextSky } from "./nextsky-context";
import { Header } from "./header";
import { UploadDropzone } from "./upload-dropzone";
import { LeadTimeSelector } from "./lead-time-selector";
import { InputFramesDisplay } from "./input-frames-display";
import { PredictionDisplay } from "./prediction-display";
import { MetricsPanel } from "./metrics-panel";
import { EnsembleExplorer } from "./ensemble-explorer";
import { UncertaintyHeatmap } from "./uncertainty-heatmap";
import { SolarIrradianceWidget } from "./solar-irradiance-widget";
import { AnimationPlayer } from "./animation-player";
import { AlertCircle, Play, RotateCcw } from "lucide-react";

export function Dashboard() {
  const {
    files,
    setFiles,
    clearFiles,
    leadTime,
    setLeadTime,
    prediction,
    evolutionMap,
    ensembleSamples,
    metrics,
    uncertainty,
    solarIrradiance,
    timeSeries,
    isLoading,
    error,
    apiStatus,
    runPrediction,
    clearPrediction,
  } = useNextSky();

  const canPredict = files.length === 4 && !isLoading && apiStatus === "connected";

  return (
    <div className="min-h-screen bg-background">
      <Header apiStatus={apiStatus} />

      <main className="max-w-[1600px] mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Controls */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 space-y-6">
              <UploadDropzone
                files={files}
                onFilesSelected={setFiles}
                onClear={clearFiles}
                disabled={isLoading}
              />

              <div className="border-t border-border pt-6">
                <LeadTimeSelector
                  value={leadTime}
                  onChange={setLeadTime}
                  disabled={isLoading}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={runPrediction}
                  disabled={!canPredict}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="h-4 w-4" />
                  {isLoading ? "Processing..." : "Run Prediction"}
                </button>
                {prediction && (
                  <button
                    type="button"
                    onClick={clearPrediction}
                    disabled={isLoading}
                    className="px-3 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
                    aria-label="Clear prediction"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Error display */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>

            {/* Metrics Panel */}
            <div className="rounded-xl border border-border bg-card p-5">
              <MetricsPanel metrics={metrics} isLoading={isLoading} />
            </div>

            {/* Solar Irradiance Widget */}
            <div className="rounded-xl border border-border bg-card p-5">
              <SolarIrradianceWidget
                data={solarIrradiance}
                leadTime={leadTime}
                isLoading={isLoading}
              />
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {/* Input Frames Display */}
            <div className="rounded-xl border border-border bg-card p-5">
              <InputFramesDisplay files={files} />
            </div>

            {/* Prediction and Ensemble Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prediction Display */}
              <div className="rounded-xl border border-border bg-card p-5">
                <PredictionDisplay
                  prediction={prediction}
                  evolutionMap={evolutionMap}
                  leadTime={leadTime}
                  isLoading={isLoading}
                />
              </div>

              {/* Ensemble Explorer */}
              <div className="rounded-xl border border-border bg-card p-5">
                <EnsembleExplorer
                  samples={ensembleSamples}
                  isLoading={isLoading}
                />
              </div>
            </div>

            {/* Uncertainty and Animation Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Uncertainty Heatmap */}
              <div className="rounded-xl border border-border bg-card p-5">
                <UncertaintyHeatmap
                  data={uncertainty}
                  predictionImage={prediction}
                  isLoading={isLoading}
                />
              </div>

              {/* Animation Player */}
              <div className="rounded-xl border border-border bg-card p-5">
                <AnimationPlayer
                  timeSeries={timeSeries}
                  isLoading={isLoading}
                />
              </div>
            </div>

            {/* Info Panel */}
            <div className="rounded-xl border border-border bg-card/50 p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    Model Architecture
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Conditional Denoising Diffusion Probabilistic Model (DDPM)
                    with 3D U-Net backbone for spatio-temporal cloud state prediction.
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    Data Source
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    INSAT-3DR/3DS satellite imagery with 15-minute temporal
                    resolution and multi-spectral channels for comprehensive cloud analysis.
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    Applications
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Renewable energy management, solar irradiance forecasting,
                    and early warning systems for weather-related catastrophe mitigation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
