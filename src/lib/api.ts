/// <reference types="vite/client" /> 
// NextSky API Service for FastAPI Integration

export interface PredictionMetrics {
  ssim: number;
  lpips: number;
  csi: number;
  mse: number;
}

export interface UncertaintyData {
  variance_map: string; // Base64 encoded heatmap showing variance between ensemble members
  mean_variance: number; // Overall mean variance (0-1)
  high_uncertainty_regions: number; // Percentage of image with high uncertainty
  confidence_level: number; // Overall model confidence (0-100%)
  // Number of ensemble samples used to compute variance (added so UI can display correctly)
  ensemble_count?: number;
}

export interface SolarIrradianceData {
  cloud_coverage_percent: number; // Percentage of cloud coverage in prediction
  estimated_efficiency: number; // Estimated solar panel efficiency (0-100%)
  irradiance_reduction: number; // Reduction from clear sky irradiance (0-100%)
  energy_yield_factor: number; // Multiplier for energy yield (0-1)
  risk_level: 'low' | 'moderate' | 'high' | 'severe';
}

export interface TimeSeriesPrediction {
  lead_time: number; // 1-6
  prediction: string; // Base64 encoded image
  evolution_map: string; // Base64 encoded difference map
  solar_data: SolarIrradianceData;
  metrics: PredictionMetrics;
}

export interface PredictionResponse {
  prediction: string; // Base64 encoded image
  evolution_map: string; // Base64 encoded difference map
  ensemble_samples: string[]; // Array of base64 encoded images
  metrics: PredictionMetrics;
  lead_time: number;
  timestamp: string;
  // New fields for enhanced features
  uncertainty?: UncertaintyData;
  solar_irradiance?: SolarIrradianceData;
  time_series?: TimeSeriesPrediction[]; // Predictions for all lead times (T+15 to T+90)
}

export interface PredictionRequest {
  files: File[];
  lead_time: number; // 1-6 (T+15 to T+90)
  num_ensemble_samples?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function predictCloudState(
  request: PredictionRequest
): Promise<PredictionResponse> {
  const formData = new FormData();
  
  // Append files in order (t-45, t-30, t-15, t=0)
  request.files.forEach((file, index) => {
    formData.append(`frame_${index}`, file);
  });
  
  // Append lead time
  formData.append('lead_time', request.lead_time.toString());
  
  // Append ensemble samples count (reduced for speed)
  const ensembleSamples = request.num_ensemble_samples || 2;  // Changed from 5 to 2
  formData.append('num_ensemble_samples', ensembleSamples.toString());

  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Prediction failed: ${response.status}`);
  }

  return response.json();
}

export async function healthCheck(): Promise<{ status: string; model_loaded: boolean }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  
  if (!response.ok) {
    throw new Error('API health check failed');
  }
  
  return response.json();
}

// Helper to convert base64 to data URL
export function base64ToDataUrl(base64: string, mimeType = 'image/png'): string {
  if (base64.startsWith('data:')) {
    return base64;
  }
  return `data:${mimeType};base64,${base64}`;
}

// Helper to validate uploaded files
export function validateFiles(files: File[]): { valid: boolean; error?: string } {
  if (files.length !== 4) {
    return { valid: false, error: 'Please upload exactly 4 satellite frames (t-45 to t=0)' };
  }
  
  const allowedExtensions = ['.h5', '.png', '.hdf5'];
  
  for (const file of files) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return { 
        valid: false, 
        error: `Invalid file type: ${file.name}. Only .h5, .hdf5, and .png files are allowed.` 
      };
    }
  }
  
  return { valid: true };
}
