"""
FastAPI Backend for NextSky Cloud Nowcasting
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from pathlib import Path
import numpy as np
from typing import List
import torch
import logging
from dotenv import load_dotenv
import asyncio

# Load environment variables
load_dotenv()


def _read_inference_timeout() -> float | None:
    """
    Read inference timeout from environment.

    Returns:
        float timeout in seconds, or None to disable timeout.
    """
    raw_timeout = os.getenv("INFERENCE_TIMEOUT", "").strip()
    if not raw_timeout:
        return None

    try:
        timeout = float(raw_timeout)
    except ValueError:
        logger.warning(
            f"Invalid INFERENCE_TIMEOUT='{raw_timeout}'. Disabling inference timeout."
        )
        return None

    # Non-positive values intentionally disable timeout
    return timeout if timeout > 0 else None

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from model import DDPMModel

# Configurable inference timeout (seconds). None means disabled.
INFERENCE_TIMEOUT = _read_inference_timeout()

# Global model instance
MODEL = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup, cleanup on shutdown"""
    global MODEL
    
    # Startup
    model_path = Path(__file__).parent.parent / "satellite_ddpm.pth"
    
    logger.info(f"Model path: {model_path}")
    logger.info(f"Model exists: {model_path.exists()}")
    
    if not model_path.exists():
        logger.error(f"Model file not found at {model_path}")
        logger.error(f"Current working directory: {os.getcwd()}")
        logger.error(f"Available files in parent dir: {list(Path(__file__).parent.parent.iterdir())}")
        MODEL = None
    else:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading model from {model_path} on {device}")
        try:
            MODEL = DDPMModel(str(model_path), device=device)
            logger.info("✓ Model loaded successfully!")
        except Exception as e:
            logger.error(f"✗ Error loading model: {str(e)}", exc_info=True)
            MODEL = None
    
    yield
    
    # Cleanup
    logger.info("Shutting down - cleaning up model")
    MODEL = None


app = FastAPI(
    title="NextSky API",
    description="Cloud Nowcasting Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "model_loaded": MODEL is not None,
        "device": "cuda" if torch.cuda.is_available() else "cpu",
    }


@app.post("/predict")
async def predict(
    frame_0: UploadFile = File(...),
    frame_1: UploadFile = File(...),
    frame_2: UploadFile = File(...),
    frame_3: UploadFile = File(...),
    lead_time: int = Form(...),
    num_ensemble_samples: int = Form(5),
    latitude: float = Form(None),
    longitude: float = Form(None),
    location_name: str = Form(None),
):
    """
    Generate cloud state prediction
    
    Args:
        frame_0: Input frame at t-45
        frame_1: Input frame at t-30
        frame_2: Input frame at t-15
        frame_3: Input frame at t=0 (current)
        lead_time: Forecast horizon (1-6) for T+15 to T+90 minutes
        num_ensemble_samples: Number of ensemble samples to generate (default: 5)
        latitude: Location latitude (optional, for solar prediction)
        longitude: Location longitude (optional, for solar prediction)
        location_name: Human-readable location name (optional)
    
    Returns:
        Prediction response with base64 encoded images and metrics
    """
    if MODEL is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Please check server logs.",
        )
    
    if not 1 <= lead_time <= 6:
        raise HTTPException(
            status_code=400,
            detail="lead_time must be between 1 and 6",
        )
    
    try:
        logger.info(f"Starting prediction - lead_time: {lead_time}, location: {location_name}")
        
        # Read input files
        frames_data = []
        files = [frame_0, frame_1, frame_2, frame_3]
        
        for i, file in enumerate(files):
            content = await file.read()
            logger.info(f"Loaded frame {i}: {len(content)} bytes")
            
            # Determine file type and load accordingly
            if file.filename.endswith(('.h5', '.hdf5')):
                frame = MODEL.load_h5_frame(content)
            else:  # PNG, JPEG, etc.
                frame = MODEL.load_image_frame(content)
            
            frames_data.append(frame)
        
        # Log frame array details (shape, dtype, min/max) when possible
        for i, frame in enumerate(frames_data):
            try:
                logger.info(f"Frame {i} array shape={getattr(frame, 'shape', None)}, dtype={getattr(frame, 'dtype', None)}, min={np.nanmin(frame)}, max={np.nanmax(frame)}")
            except Exception:
                logger.info(f"Frame {i} metadata unavailable; raw bytes length logged earlier")

        logger.info("All frames loaded, starting model inference...")
        
        # Run inference (optional timeout)
        try:
            # Cap ensemble samples to a small number to keep latency reasonable
            try:
                requested_ensembles = int(num_ensemble_samples)
            except Exception:
                requested_ensembles = 2
            ensembles = max(1, min(requested_ensembles, 2))
            logger.info(f"Ensemble samples requested={requested_ensembles}, using capped={ensembles}")

            inference_task = asyncio.to_thread(
                MODEL.predict,
                frames_data,
                lead_time,
                ensembles
            )
            if INFERENCE_TIMEOUT is None:
                result = await inference_task
            else:
                result = await asyncio.wait_for(
                    inference_task,
                    timeout=INFERENCE_TIMEOUT
                )
            
            # Add location data to result
            if latitude is not None and longitude is not None:
                result["location"] = {
                    "latitude": latitude,
                    "longitude": longitude,
                    "name": location_name or "Unknown"
                }
            
            logger.info("✓ Prediction completed successfully")
            return result
            
        except asyncio.TimeoutError:
            logger.error(f"Model inference timeout after {INFERENCE_TIMEOUT} seconds")
            raise HTTPException(
                status_code=504,
                detail=(
                    f"Model inference timeout after {INFERENCE_TIMEOUT} seconds. "
                    "Increase INFERENCE_TIMEOUT or set it to 0 to disable timeout."
                )
            )
    
    except Exception as e:
        # If the exception is an HTTPException (e.g., timeout -> 504), re-raise
        if isinstance(e, HTTPException):
            raise

        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn
    
    api_host = os.getenv("API_HOST", "127.0.0.1")
    api_port = int(os.getenv("API_PORT", 8000))
    
    logger.info(f"Starting NextSky API on {api_host}:{api_port}")
    
    uvicorn.run(
        app,
        host=api_host,
        port=api_port,
    )
