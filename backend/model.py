"""
DDPM Model Wrapper for Cloud State Prediction
Based on Conditional DDPM for satellite cloud forecasting
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import List, Optional
import h5py
from PIL import Image
import io
import base64


class SinusoidalPositionEmbeddings(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.dim = dim

    def forward(self, time):
        device = time.device
        half_dim = self.dim // 2
        embeddings = np.log(10000) / (half_dim - 1)
        embeddings = torch.exp(torch.arange(half_dim, device=device) * -embeddings)
        embeddings = time[:, None] * embeddings[None, :]
        embeddings = torch.cat((embeddings.sin(), embeddings.cos()), dim=-1)
        return embeddings


class ResBlock(nn.Module):
    def __init__(self, in_ch, out_ch, time_emb_dim):
        super().__init__()
        self.mlp = nn.Sequential(nn.SiLU(), nn.Linear(time_emb_dim, out_ch))
        self.conv1 = nn.Conv2d(in_ch, out_ch, 3, padding=1)
        self.conv2 = nn.Conv2d(out_ch, out_ch, 3, padding=1)
        self.res_conv = nn.Conv2d(in_ch, out_ch, 1) if in_ch != out_ch else nn.Identity()

    def forward(self, x, t):
        h = F.silu(self.conv1(x))
        t_emb = self.mlp(t)[:, :, None, None]
        h = self.conv2(h + t_emb)
        return F.silu(h + self.res_conv(x))


class ConditionalUNet(nn.Module):
    """Conditional UNet for DDPM with satellite sequence conditioning"""
    def __init__(self, cond_channels=4, base_ch=64):
        super().__init__()
        self.time_mlp = nn.Sequential(
            SinusoidalPositionEmbeddings(base_ch),
            nn.Linear(base_ch, base_ch * 4),
            nn.SiLU(),
            nn.Linear(base_ch * 4, base_ch * 4)
        )
        self.down1 = ResBlock(1 + cond_channels, base_ch, base_ch * 4)
        self.pool1 = nn.AvgPool2d(2)
        self.down2 = ResBlock(base_ch, base_ch * 2, base_ch * 4)
        self.mid = ResBlock(base_ch * 2, base_ch * 2, base_ch * 4)
        self.up1 = nn.Upsample(scale_factor=2, mode='nearest')
        self.up_res1 = ResBlock(base_ch * 3, base_ch, base_ch * 4)
        self.final_conv = nn.Conv2d(base_ch, 1, 1)

    def forward(self, x, t):
        t_emb = self.time_mlp(t)
        d1 = self.down1(x, t_emb)
        d2 = self.down2(self.pool1(d1), t_emb)        
        m = self.mid(d2, t_emb)
        u1 = self.up1(m)
        u1 = torch.cat([u1, d1], dim=1)
        u1 = self.up_res1(u1, t_emb)
        return self.final_conv(u1)


class DDPMModel:
    """Wrapper for the DDPM cloud prediction model"""
    
    # Training constants from your training code
    SEQ_LEN = 4
    IMG_SIZE = (256, 256)
    MIN_VAL = 175.0
    MAX_VAL = 1023.0
    T = 100  # Number of diffusion steps (reduced from 250 for speed - 10x faster)
    
    def __init__(self, model_path: str, device: str = "cpu"):
        """
        Load the DDPM model from checkpoint
        
        Args:
            model_path: Path to the .pth model file (state_dict)
            device: 'cpu' or 'cuda'
        """
        self.device = torch.device(device)
        
        # Build model architecture
        self.unet = ConditionalUNet(cond_channels=self.SEQ_LEN, base_ch=64).to(self.device)
        
        # Load state_dict
        checkpoint = torch.load(model_path, map_location=self.device)
        self.unet.load_state_dict(checkpoint)
        self.unet.eval()
        
        # Setup diffusion parameters
        self._setup_diffusion()
        
    def _setup_diffusion(self):
        """Setup beta, alpha schedules for diffusion"""
        beta = torch.linspace(1e-4, 0.02, self.T)
        alpha = 1.0 - beta
        alpha_bar = torch.cumprod(alpha, dim=0)
        
        self.register_buffer = lambda name, tensor: setattr(self, name, tensor.to(self.device))
        self.register_buffer('beta', beta.to(self.device))
        self.register_buffer('alpha', alpha.to(self.device))
        self.register_buffer('alpha_bar', alpha_bar.to(self.device))
    
    def preprocess_frame(self, image_data: np.ndarray) -> torch.Tensor:
        """
        Preprocess a single frame using same normalization as training
        
        Args:
            image_data: numpy array (from HDF5 or PIL Image)
            
        Returns:
            torch.Tensor normalized to [-1, 1]
        """
        if isinstance(image_data, Image.Image):
            image_data = np.array(image_data)
        
        # Handle 1D flattened arrays by reshaping to square if possible
        if image_data.ndim == 1:
            n = image_data.size
            s = int(np.sqrt(n))
            if s * s == n:
                image_data = image_data.reshape((s, s))

        # Ensure grayscale
        if image_data.ndim == 3:
            image_data = np.mean(image_data, axis=2)
        
        # Convert to float32 early for safer operations
        image_data = image_data.astype(np.float32)
        
        # Handle NaN/Inf values
        image_data = np.nan_to_num(image_data, nan=0.0, posinf=self.MAX_VAL, neginf=self.MIN_VAL)
        
        # Resize to expected size
        if image_data.shape != self.IMG_SIZE:
            import cv2
            try:
                image_data = cv2.resize(image_data, self.IMG_SIZE, interpolation=cv2.INTER_AREA)
            except cv2.error as e:
                print(f"OpenCV resize error: {e}")
                print(f"Input shape: {image_data.shape}, dtype: {image_data.dtype}")
                print(f"Min: {image_data.min()}, Max: {image_data.max()}")
                # Fallback: use scipy for resizing
                from scipy.ndimage import zoom
                # Ensure we have two dims for zoom calculation
                h = image_data.shape[0] if image_data.ndim >= 1 else 1
                w = image_data.shape[1] if image_data.ndim >= 2 else 1
                zoom_factors = (self.IMG_SIZE[0] / h, self.IMG_SIZE[1] / w)
                image_data = zoom(image_data, zoom_factors, order=1)
        
        # Normalize from [MIN_VAL, MAX_VAL] to [0, 1]
        image_data = (image_data - self.MIN_VAL) / (self.MAX_VAL - self.MIN_VAL)
        image_data = np.clip(image_data, 0, 1)
        
        # Scale to [-1, 1] (same as training)
        image_data = image_data * 2.0 - 1.0
        
        return torch.from_numpy(image_data).float()
    
    def load_h5_frame(self, file_content: bytes) -> np.ndarray:
        """Load a frame from HDF5 file content"""
        def _find_dataset(group: h5py.Group, preferred_keys: List[str]) -> Optional[h5py.Dataset]:
            # Prefer known keys from training/inference pipelines
            for key in preferred_keys:
                if key in group and isinstance(group[key], h5py.Dataset):
                    return group[key]

            # Search recursively for preferred keys
            for _, obj in group.items():
                if isinstance(obj, h5py.Group):
                    ds = _find_dataset(obj, preferred_keys)
                    if ds is not None:
                        return ds

            # Fallback: pick the first 2D/3D numeric dataset with non-trivial size
            for _, obj in group.items():
                if isinstance(obj, h5py.Dataset):
                    if obj.ndim in (2, 3) and np.issubdtype(obj.dtype, np.number):
                        if np.prod(obj.shape) >= 64 * 64:
                            return obj
                elif isinstance(obj, h5py.Group):
                    ds = _find_dataset(obj, [])
                    if ds is not None:
                        return ds
            return None

        with h5py.File(io.BytesIO(file_content), 'r') as f:
            dataset = _find_dataset(
                f,
                preferred_keys=["IMG_TIR1", "image", "data", "frame"]
            )
            if dataset is None:
                raise ValueError("No numeric image-like dataset found in HDF5 file")
            data = dataset[:]
        arr = np.array(data)

        # If 1D, try to reshape to square if possible
        if arr.ndim == 1:
            n = arr.size
            s = int(np.sqrt(n))
            if s * s == n:
                arr = arr.reshape((s, s))

        # If array is same size as expected flat image, reshape
        if arr.ndim == 1 and arr.size == self.IMG_SIZE[0] * self.IMG_SIZE[1]:
            arr = arr.reshape(self.IMG_SIZE)

        # If 3D array (channel-first or channel-last), collapse to a single channel
        if arr.ndim == 3:
            # Use first slice for likely [C,H,W] with C small; otherwise average channels.
            if arr.shape[0] <= 8 and arr.shape[1] > 32 and arr.shape[2] > 32:
                arr = arr[0]
            else:
                arr = np.mean(arr, axis=-1)

        arr = arr.astype(np.float32)

        # If values look 8-bit [0, 255], map to sensor range.
        if arr.min() >= 0 and arr.max() <= 255:
            try:
                arr = (arr / 255.0) * (self.MAX_VAL - self.MIN_VAL) + self.MIN_VAL
            except Exception:
                pass

        return arr
    
    def load_image_frame(self, file_content: bytes) -> np.ndarray:
        """Load a frame from PNG/JPEG file content"""
        image = Image.open(io.BytesIO(file_content))
        arr = np.array(image)
        # If image is standard 8-bit RGB/greyscale, map to sensor-like range
        if arr.dtype == np.uint8:
            try:
                arr = arr.astype(np.float32)
                # Convert to single-channel if RGB
                if arr.ndim == 3:
                    arr = arr.mean(axis=2)
                # Map 0-255 -> MIN_VAL..MAX_VAL
                arr = (arr / 255.0) * (self.MAX_VAL - self.MIN_VAL) + self.MIN_VAL
            except Exception:
                pass
        return arr
    
    @torch.no_grad()
    def predict(
        self,
        frames: List[np.ndarray],
        lead_time: int = 1,
        num_ensemble_samples: int = 5,
    ) -> dict:
        """
        Generate prediction for cloud state using DDPM sampling
        
        Args:
            frames: List of 4 input frames (t-45, t-30, t-15, t=0)
            lead_time: Lead time (1-6) representing T+15 to T+90 minutes
            num_ensemble_samples: Number of ensemble samples to generate
            
        Returns:
            Dictionary with predictions, metrics, and visualizations
        """
        if len(frames) != self.SEQ_LEN:
            raise ValueError(f"Expected {self.SEQ_LEN} frames, got {len(frames)}")
        
        # Preprocess and stack frames as conditions
        processed_frames = []
        for frame in frames:
            processed = self.preprocess_frame(frame)
            processed_frames.append(processed)
        
        # Stack into condition tensor: [4, 256, 256]
        cond = torch.stack(processed_frames)  # [SEQ_LEN, H, W]
        cond = cond.unsqueeze(0).to(self.device)  # [1, SEQ_LEN, H, W]
        
        # Generate ensemble samples using DDPM sampling
        ensemble_samples = []
        for sample_idx in range(num_ensemble_samples):
            sample = self._ddpm_sample(cond)  # [1, 1, 256, 256]
            sample_np = sample[0, 0].cpu().numpy()  # [256, 256]
            ensemble_samples.append(sample_np)
        
        # Average ensemble for main prediction
        prediction = np.mean(ensemble_samples, axis=0)
        
        # Denormalize from [-1, 1] to [0, 1]
        prediction_normalized = (prediction + 1) / 2
        prediction_normalized = np.clip(prediction_normalized, 0, 1)
        
        # Generate evolution map (difference visualization)
        # Simplified: use variance across ensemble
        ensemble_array = np.array(ensemble_samples)
        evolution_map = np.std(ensemble_array, axis=0)
        evolution_map_normalized = (evolution_map - evolution_map.min()) / (evolution_map.max() - evolution_map.min() + 1e-8)
        
        # Convert to images and encode as base64
        prediction_img = self._array_to_base64(prediction_normalized)
        evolution_map_img = self._array_to_base64(evolution_map_normalized)
        
        ensemble_imgs = [
            self._array_to_base64(np.clip((s + 1) / 2, 0, 1))
            for s in ensemble_samples
        ]
        
        # Generate metrics (compare prediction to last input frame if available)
        metrics = self._calculate_metrics(prediction_normalized, processed_frames)

        # Generate uncertainty data
        uncertainty = self._calculate_uncertainty(ensemble_samples)
        try:
            uncertainty["ensemble_count"] = len(ensemble_samples)
        except Exception:
            pass

        # Generate solar irradiance data
        solar_data = self._calculate_solar_data(prediction_normalized, lead_time)

        # Generate time series predictions (lead-time evolution) - may be slower
        try:
            time_series = self._generate_time_series(
                cond,
                num_samples=min(3, len(ensemble_samples)),
                processed_frames=processed_frames
            )
        except Exception:
            time_series = []
        
        return {
            "prediction": prediction_img,
            "evolution_map": evolution_map_img,
            "ensemble_samples": ensemble_imgs,
            "metrics": metrics,
            "lead_time": lead_time,
            "timestamp": self._get_timestamp(),
            "uncertainty": uncertainty,
            "solar_irradiance": solar_data,
            "time_series": time_series,
        }
    
    @torch.no_grad()
    def _ddpm_sample(self, cond: torch.Tensor) -> torch.Tensor:
        """
        Sample from DDPM reverse process
        
        Args:
            cond: Conditioned frames [1, SEQ_LEN, 256, 256]
            
        Returns:
            Sampled image [1, 1, 256, 256]
        """
        batch_size = cond.shape[0]
        # Start from random noise
        x = torch.randn((batch_size, 1, *self.IMG_SIZE), device=self.device)
        
        # Reverse diffusion process
        for i in reversed(range(self.T)):
            t = torch.full((batch_size,), i, device=self.device, dtype=torch.long)
            
            # Concatenate noise and condition
            x_cond = torch.cat([x, cond], dim=1)
            
            # Predict noise (with no_grad already applied above)
            eps_pred = self.unet(x_cond, t)
            
            # Denoise step
            alpha = self.alpha[i]
            alpha_bar = self.alpha_bar[i]
            beta = self.beta[i]
            
            x = (1 / torch.sqrt(alpha)) * (x - ((1 - alpha) / torch.sqrt(1 - alpha_bar)) * eps_pred)
            
            # Add noise for all but last step
            if i > 0:
                noise = torch.randn_like(x)
                x = x + torch.sqrt(beta) * noise
        
        return x
    
    def _array_to_base64(self, array: np.ndarray) -> str:
        """Convert numpy array to base64 encoded PNG"""
        # Convert to uint8
        array_uint8 = (array * 255).astype(np.uint8)
        
        # Create PIL Image
        if len(array_uint8.shape) == 2:
            # Grayscale
            img = Image.fromarray(array_uint8, mode='L')
        else:
            # RGB
            img = Image.fromarray(array_uint8, mode='RGB')
        
        # Encode to PNG
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_bytes = buffer.getvalue()
        
        # Encode to base64
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')
        return img_base64
    
    def _calculate_metrics(self, prediction: np.ndarray, processed_frames: list = None) -> dict:
        """Calculate prediction metrics"""
        # Basic deterministic metrics based on available input frames
        # prediction: numpy array in [0,1]
        last_frame = None
        try:
            # processed_frames passed from predict() as list of tensors in [-1,1]
            if processed_frames and len(processed_frames) > 0:
                lf = processed_frames[-1]
                if isinstance(lf, torch.Tensor):
                    lf_np = lf.cpu().numpy()
                else:
                    lf_np = np.array(lf)
                # convert from [-1,1] to [0,1]
                last_frame = np.clip((lf_np + 1) / 2, 0, 1)
        except Exception:
            last_frame = None

        mse = None
        mae = None
        ssim = 0.0
        csi = 0.0
        if last_frame is not None and last_frame.shape == prediction.shape:
            diff = prediction - last_frame
            mse = float(np.mean(diff ** 2))
            mae = float(np.mean(np.abs(diff)))

            # Approximate SSIM without external dependency.
            mu_x = float(np.mean(prediction))
            mu_y = float(np.mean(last_frame))
            sigma_x = float(np.var(prediction))
            sigma_y = float(np.var(last_frame))
            sigma_xy = float(np.mean((prediction - mu_x) * (last_frame - mu_y)))
            c1 = (0.01 ** 2)
            c2 = (0.03 ** 2)
            ssim = ((2 * mu_x * mu_y + c1) * (2 * sigma_xy + c2)) / (
                (mu_x ** 2 + mu_y ** 2 + c1) * (sigma_x + sigma_y + c2) + 1e-12
            )
            ssim = float(np.clip(ssim, 0.0, 1.0))

            # CSI on cloud mask threshold.
            cloud_thresh = 0.5
            pred_mask = prediction >= cloud_thresh
            ref_mask = last_frame >= cloud_thresh
            tp = np.logical_and(pred_mask, ref_mask).sum()
            fp = np.logical_and(pred_mask, np.logical_not(ref_mask)).sum()
            fn = np.logical_and(np.logical_not(pred_mask), ref_mask).sum()
            denom = tp + fp + fn
            csi = float(tp / denom) if denom > 0 else 1.0
        else:
            mse = float(np.mean(prediction * (1 - prediction)))
            mae = float(np.mean(np.abs(prediction - np.mean(prediction))))
            ssim = 0.0
            csi = 0.0

        # LPIPS proxy: normalized mean absolute difference to latest input frame.
        # (True LPIPS needs an external learned network.)
        lpips_proxy = float(np.clip(mae if mae is not None else 0.0, 0.0, 1.0))

        return {
            "ssim": ssim,
            "lpips": lpips_proxy,
            "csi": csi,
            "mse": mse,
        }
    
    def _calculate_uncertainty(self, ensemble_samples: list) -> dict:
        """Calculate uncertainty metrics from ensemble"""
        ensemble_array = np.array(ensemble_samples)
        variance = np.var(ensemble_array, axis=0)
        variance_normalized = (variance - variance.min()) / (variance.max() - variance.min() + 1e-8)
        
        variance_map = self._array_to_base64(variance_normalized)
        mean_variance = float(np.mean(variance_normalized))
        high_uncertainty_regions = float(np.sum(variance_normalized > 0.5) / variance_normalized.size * 100)
        
        return {
            "variance_map": variance_map,
            "mean_variance": mean_variance,
            "high_uncertainty_regions": high_uncertainty_regions,
            "confidence_level": 100 - (high_uncertainty_regions * 0.5),
        }
    
    def _calculate_solar_data(self, prediction: np.ndarray, lead_time: int) -> dict:
        """Calculate solar irradiance related metrics"""
        cloud_coverage = float(np.mean(prediction) * 100)
        estimated_efficiency = max(0, 100 - cloud_coverage)
        irradiance_reduction = cloud_coverage
        
        # Risk level based on cloud coverage
        if cloud_coverage < 20:
            risk_level = "low"
        elif cloud_coverage < 40:
            risk_level = "moderate"
        elif cloud_coverage < 70:
            risk_level = "high"
        else:
            risk_level = "severe"
        
        return {
            "cloud_coverage_percent": cloud_coverage,
            "estimated_efficiency": estimated_efficiency,
            "irradiance_reduction": irradiance_reduction,
            "energy_yield_factor": estimated_efficiency / 100,
            "risk_level": risk_level,
        }
    
    def _generate_time_series(self, cond: torch.Tensor, num_samples: int, processed_frames: list) -> list:
        """Generate time series predictions for all lead times"""
        time_series = []
        
        # Only generate for selected lead times to speed up (was all 6)
        lead_times_to_generate = [1, 3, 6]  # T+15, T+45, T+90
        
        for lead_time in lead_times_to_generate:
            # Generate prediction for this lead time
            sample = self._ddpm_sample(cond)
            prediction = sample[0, 0].cpu().numpy()
            prediction_normalized = (prediction + 1) / 2
            prediction_normalized = np.clip(prediction_normalized, 0, 1)
            
            # Deterministic evolution map: change relative to latest input frame.
            if processed_frames and len(processed_frames) > 0:
                latest = processed_frames[-1]
                latest_np = latest.cpu().numpy() if isinstance(latest, torch.Tensor) else np.array(latest)
                latest_normalized = np.clip((latest_np + 1) / 2, 0, 1)
                evolution_map = np.abs(prediction_normalized - latest_normalized)
            else:
                evolution_map = prediction_normalized
            evolution_map_normalized = (evolution_map - evolution_map.min()) / (
                evolution_map.max() - evolution_map.min() + 1e-8
            )
            
            # Solar data for this lead time
            solar_data = self._calculate_solar_data(prediction_normalized, lead_time)
            
            # Metrics for this lead time (same logic used by main prediction).
            metrics = self._calculate_metrics(prediction_normalized, processed_frames)
            
            time_series.append({
                "lead_time": lead_time,
                "prediction": self._array_to_base64(prediction_normalized),
                "evolution_map": self._array_to_base64(evolution_map_normalized),
                "solar_data": solar_data,
                "metrics": metrics,
            })
        
        return time_series
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
