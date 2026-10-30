# NextSky Backend API

This is the FastAPI backend for the NextSky cloud nowcasting platform. It uses a Conditional DDPM model for cloud state prediction.

## Setup

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Test Model Loading (Optional but Recommended)
```bash
python test_model.py
```

This will verify:
- ✅ Model file exists and loads correctly
- ✅ Model architecture matches training code
- ✅ Inference works with dummy data

### 3. Run the Server
```bash
python main.py
```

You should see:
```
Loading model from ../satellite_ddpm.pth on cpu
Model loaded successfully!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

The API will be available at `http://localhost:8000`

### 4. View API Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Model Details

This backend uses the **Conditional DDPM** model from your training code:

- **Architecture**: ConditionalUNet with 4 ResBlocks
- **Input**: 
  - 4 satellite frames (t-45, t-30, t-15, t=0) as conditions
  - 1 noise tensor for diffusion
  - Total: 5 channels input
- **Output**: 1 predicted frame (256×256)
- **Diffusion Steps**: 1000
- **Normalization**: [175, 1023] → [0, 1] → [-1, 1]

## API Endpoints

### `GET /health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true,
  "device": "cuda" or "cpu"
}
```

### `POST /predict`
Generate cloud state prediction using DDPM sampling

**Request (multipart/form-data):**
- `frame_0` (file): Input frame at t-45 minutes
- `frame_1` (file): Input frame at t-30 minutes  
- `frame_2` (file): Input frame at t-15 minutes
- `frame_3` (file): Input frame at t=0 (current time)
- `lead_time` (int): Forecast horizon 1-6 (T+15 to T+90 minutes)
- `num_ensemble_samples` (int): Number of ensemble samples (default: 5)

Supported file formats:
- `.h5`, `.hdf5`: HDF5 files with key "IMG_TIR1" (from training)
- `.png`, `.jpg`, `.jpeg`: Image files

**Response:**
```json
{
  "prediction": "base64_encoded_image",
  "evolution_map": "base64_encoded_image",
  "ensemble_samples": ["base64_image_1", "base64_image_2", ...],
  "metrics": {
    "ssim": 0.85,
    "lpips": 0.15,
    "csi": 0.75,
    "mse": 0.005
  },
  "lead_time": 1,
  "timestamp": "2024-01-30T10:30:00",
  "uncertainty": {
    "variance_map": "base64_encoded_image",
    "mean_variance": 0.15,
    "high_uncertainty_regions": 25.5,
    "confidence_level": 87.25
  },
  "solar_irradiance": {
    "cloud_coverage_percent": 45.0,
    "estimated_efficiency": 55.0,
    "irradiance_reduction": 45.0,
    "energy_yield_factor": 0.55,
    "risk_level": "moderate"
  },
  "time_series": [
    {
      "lead_time": 1,
      "prediction": "base64_image",
      "evolution_map": "base64_image",
      "solar_data": {...},
      "metrics": {...}
    },
    ...
  ]
}
```

## Project Structure
```
backend/
├── main.py          # FastAPI application
├── model.py         # Conditional DDPM model wrapper
├── test_model.py    # Model loading test script
├── requirements.txt # Python dependencies
└── README.md        # This file
```

## File Organization

The backend expects the DDPM model at the root of the project:
```
nextsky/
├── satellite_ddpm.pth  # Your trained model (state_dict)
├── backend/
│   ├── main.py
│   ├── model.py
│   ├── test_model.py
│   └── requirements.txt
└── src/
```

## DDPM Sampling

When you call `/predict`, the backend:
1. Loads and preprocesses the 4 input frames
2. Runs DDPM reverse diffusion process (1000 steps)
3. Generates multiple ensemble samples for uncertainty
4. Averages ensemble for main prediction
5. Calculates metrics and solar data
6. Returns everything as base64 encoded images

For faster inference, you can modify the diffusion process in `model.py`:
- Reduce `self.T` for fewer steps (trades quality for speed)
- Use DDIM sampling instead of DDPM for ~50x speedup

## GPU Support

By default, the backend uses CPU. For GPU support:

```bash
# Install CUDA-enabled PyTorch
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# The backend will automatically detect and use GPU if available
```

Check `test_model.py` output to confirm device usage.
