# NextSky

NextSky is a cloud-nowcasting dashboard that combines a React frontend with a FastAPI backend and a trained Conditional DDPM model to forecast short-term cloud evolution from satellite frames. The app lets users upload recent thermal infrared frames, select a forecast lead time, and inspect predictions, ensemble variability, uncertainty maps, and solar irradiance impact metrics.

## Overview

This project is designed for short-range solar and cloud forecasting, especially in the context of renewable energy planning. It uses the most recent 4 satellite frames as inputs and predicts a future cloud state for lead times from 15 to 90 minutes.

Key capabilities include:

- Uploading 4 input frames for forecasting
- Selecting forecast lead time from 1 to 6 steps
- Running model inference through a backend API
- Viewing main prediction, evolution map, and ensemble samples
- Inspecting uncertainty heatmaps and confidence statistics
- Estimating solar irradiance impacts and cloud coverage
- Browsing results in a dashboard UI

## Tech stack

- Frontend: React + TypeScript + Vite
- UI: Tailwind CSS + Radix UI primitives
- Backend: FastAPI
- Model: Conditional Denoising Diffusion Probabilistic Model (DDPM)
- Data handling: NumPy, PyTorch, HDF5/image ingestion

## Repository structure

```text
nextsky/
├── backend/                  # FastAPI API and model runtime
│   ├── main.py               # API entrypoint
│   ├── model.py              # DDPM model wrapper and inference logic
│   ├── requirements.txt      # Python dependencies
│   ├── test_model.py         # Model verification script
│   └── README.md             # Backend-specific docs
├── src/                      # React frontend source
│   ├── components/           # Dashboard widgets and UI pieces
│   ├── lib/                  # API helpers and utilities
│   ├── App.tsx               # App root
│   ├── main.tsx              # React bootstrap
│   └── index.css             # Global styling
├── public/
├── test/                     # Example HDF5 input files
├── satellite_ddpm.pth       # Trained model weights
├── package.json              # Frontend scripts and dependencies
├── vite.config.ts            # Vite config
├── tsconfig*.json            # TypeScript config
├── eslint.config.js          # ESLint config
├── index.html                # Vite entry HTML
├── README.md                 # Project documentation
└── ...
```

## Prerequisites

Before running the app, make sure you have:

- Node.js 18+ and npm
- Python 3.10+
- A trained model file at the project root named `satellite_ddpm.pth`

## Installation

### 1) Install frontend dependencies

```bash
npm install
```

### 2) Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

## Running the project

### Start the backend

From the project root:

```bash
cd backend
python main.py
```

The API will be served on:

- http://localhost:8000
- Swagger docs: http://localhost:8000/docs

### Start the frontend

In a separate terminal:

```bash
npm run dev
```

The application should open in the browser at the Vite dev server URL, typically:

- http://localhost:5173

## Model and data workflow

The backend expects four input frames representing recent cloud state at different timestamps. These are passed to the DDPM model, which reconstructs a future cloud scene and produces:

- main prediction image
- evolution map
- ensemble sample set
- uncertainty map
- summary metrics
- solar irradiance estimates

The system supports common input formats including:

- HDF5 files such as `.h5` / `.hdf5`
- Standard image files such as `.png`, `.jpg`, and `.jpeg`

## API usage

The main prediction endpoint is:

- `POST /predict`

Request fields include:

- `frame_0`
- `frame_1`
- `frame_2`
- `frame_3`
- `lead_time` (1 to 6)
- `num_ensemble_samples` (optional)
- optional latitude / longitude / location metadata

The backend responds with a JSON payload containing generated images, metrics, uncertainty data, and solar estimates.

## Dashboard workflow

1. Upload four satellite frames in the app.
2. Select the lead time (for example, T+15 to T+90 minutes).
3. Run the prediction.
4. Inspect the prediction, uncertainty, and ensemble outputs.
5. Review solar metrics and cloud evolution trends for planning.

## Example validation

A lightweight backend smoke check is included:

```bash
cd backend
python test_model.py
```

This verifies that the model file loads and the inference pipeline initializes correctly.

## Notes

- The trained model should live at the repository root as `satellite_ddpm.pth`.
- The backend defaults to CPU unless CUDA is available.
- For local development, the frontend is configured to talk to the backend via localhost CORS settings.

## License

This project is provided as-is for research and internal use unless otherwise specified by the repository owner.

