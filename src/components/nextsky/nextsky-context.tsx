"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  predictCloudState,
  healthCheck,
  base64ToDataUrl,
  type PredictionResponse,
  type PredictionMetrics,
  type UncertaintyData,
  type SolarIrradianceData,
  type TimeSeriesPrediction,
} from "@/lib/api";

interface NextSkyState {
  // Input state
  files: File[];
  leadTime: number;

  // Prediction state
  prediction: string | null;
  evolutionMap: string | null;
  ensembleSamples: string[];
  metrics: PredictionMetrics | null;
  
  // New enhanced features
  uncertainty: UncertaintyData | null;
  solarIrradiance: SolarIrradianceData | null;
  timeSeries: TimeSeriesPrediction[] | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  apiStatus: "connected" | "disconnected" | "checking";
}

interface NextSkyContextValue extends NextSkyState {
  setFiles: (files: File[]) => void;
  clearFiles: () => void;
  setLeadTime: (leadTime: number) => void;
  runPrediction: () => Promise<void>;
  clearPrediction: () => void;
}

const NextSkyContext = createContext<NextSkyContextValue | null>(null);

export function useNextSky() {
  const context = useContext(NextSkyContext);
  if (!context) {
    throw new Error("useNextSky must be used within a NextSkyProvider");
  }
  return context;
}

interface NextSkyProviderProps {
  children: ReactNode;
}

export function NextSkyProvider({ children }: NextSkyProviderProps) {
  const [state, setState] = useState<NextSkyState>({
    files: [],
    leadTime: 1,
    prediction: null,
    evolutionMap: null,
    ensembleSamples: [],
    metrics: null,
    uncertainty: null,
    solarIrradiance: null,
    timeSeries: null,
    isLoading: false,
    error: null,
    apiStatus: "checking",
  });

  // Check API health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await healthCheck();
        setState((s) => ({ ...s, apiStatus: "connected" }));
      } catch {
        setState((s) => ({ ...s, apiStatus: "disconnected" }));
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const setFiles = useCallback((files: File[]) => {
    setState((s) => ({ ...s, files, error: null }));
  }, []);

  const clearFiles = useCallback(() => {
    setState((s) => ({
      ...s,
      files: [],
      prediction: null,
      evolutionMap: null,
      ensembleSamples: [],
      metrics: null,
      uncertainty: null,
      solarIrradiance: null,
      timeSeries: null,
      error: null,
    }));
  }, []);

  const setLeadTime = useCallback((leadTime: number) => {
    setState((s) => ({ ...s, leadTime }));
  }, []);

  const runPrediction = useCallback(async () => {
    if (state.files.length !== 4) {
      setState((s) => ({
        ...s,
        error: "Please upload exactly 4 satellite frames",
      }));
      return;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const response: PredictionResponse = await predictCloudState({
        files: state.files,
        lead_time: state.leadTime,
        num_ensemble_samples: 2,
      });

      // Process uncertainty data with base64 conversion
      const processedUncertainty: UncertaintyData | null = response.uncertainty
        ? {
            ...response.uncertainty,
            variance_map: base64ToDataUrl(response.uncertainty.variance_map),
          }
        : null;

      // Process time series data with base64 conversion
      const processedTimeSeries: TimeSeriesPrediction[] | null =
        response.time_series
          ? response.time_series.map((ts) => ({
              ...ts,
              prediction: base64ToDataUrl(ts.prediction),
              evolution_map: base64ToDataUrl(ts.evolution_map),
            }))
          : null;

      setState((s) => ({
        ...s,
        prediction: base64ToDataUrl(response.prediction),
        evolutionMap: base64ToDataUrl(response.evolution_map),
        ensembleSamples: response.ensemble_samples.map((sample) =>
          base64ToDataUrl(sample)
        ),
        metrics: response.metrics,
        uncertainty: processedUncertainty,
        solarIrradiance: response.solar_irradiance || null,
        timeSeries: processedTimeSeries,
        isLoading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Prediction failed",
      }));
    }
  }, [state.files, state.leadTime]);

  const clearPrediction = useCallback(() => {
    setState((s) => ({
      ...s,
      prediction: null,
      evolutionMap: null,
      ensembleSamples: [],
      metrics: null,
      uncertainty: null,
      solarIrradiance: null,
      timeSeries: null,
    }));
  }, []);

  return (
    <NextSkyContext.Provider
      value={{
        ...state,
        setFiles,
        clearFiles,
        setLeadTime,
        runPrediction,
        clearPrediction,
      }}
    >
      {children}
    </NextSkyContext.Provider>
  );
}
