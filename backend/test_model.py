"""
Test script to verify model loading
Run this to ensure your DDPM model loads correctly
"""
import sys
from pathlib import Path
import torch

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from model import DDPMModel, ConditionalUNet

def test_model_loading():
    """Test if model loads correctly"""
    model_path = backend_dir.parent / "satellite_ddpm.pth"
    
    print(f"🔍 Looking for model at: {model_path}")
    print(f"   Model exists: {model_path.exists()}")
    
    if not model_path.exists():
        print("❌ Model file not found!")
        return False
    
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"\n📦 Loading model on {device.upper()}...")
        
        model = DDPMModel(str(model_path), device=device)
        print("✅ Model loaded successfully!")
        
        # Print model info
        print(f"\n📊 Model Information:")
        print(f"   Device: {device}")
        print(f"   Image Size: {model.IMG_SIZE}")
        print(f"   Sequence Length: {model.SEQ_LEN}")
        print(f"   Normalization Range: [{model.MIN_VAL}, {model.MAX_VAL}]")
        print(f"   Diffusion Steps: {model.T}")
        
        # Test UNet architecture
        print(f"\n🏗️  UNet Architecture:")
        print(f"   Input channels: {model.SEQ_LEN + 1} (4 conditions + 1 noise)")
        print(f"   Output channels: 1 (predicted frame)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_dummy_inference():
    """Test a dummy inference to ensure everything works"""
    model_path = backend_dir.parent / "satellite_ddpm.pth"
    
    if not model_path.exists():
        print("⏭️  Skipping inference test (model not found)")
        return True
    
    try:
        import numpy as np
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"\n🧪 Testing dummy inference...")
        
        model = DDPMModel(str(model_path), device=device)
        
        # Create dummy input (4 frames of 256x256)
        dummy_frames = [np.random.uniform(175, 1023, (256, 256)).astype(np.float32) for _ in range(4)]
        
        print("   Running inference with dummy data...")
        result = model.predict(dummy_frames, lead_time=1, num_ensemble_samples=2)
        
        print("✅ Inference successful!")
        print(f"\n📤 Output Keys:")
        for key in result.keys():
            if isinstance(result[key], list):
                print(f"   {key}: list of {len(result[key])} items")
            elif isinstance(result[key], dict):
                print(f"   {key}: dict with {len(result[key])} fields")
            else:
                print(f"   {key}: {type(result[key]).__name__}")
        
        return True
        
    except Exception as e:
        print(f"❌ Inference test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("NextSky DDPM Model Test")
    print("=" * 60)
    
    model_loaded = test_model_loading()
    
    if model_loaded:
        inference_ok = test_dummy_inference()
        
        if inference_ok:
            print("\n" + "=" * 60)
            print("✅ All tests passed! Model is ready.")
            print("=" * 60)
            print("\nTo start the server, run:")
            print("  python main.py")
        else:
            print("\n⚠️  Model loaded but inference failed")
    else:
        print("\n❌ Model loading failed")
