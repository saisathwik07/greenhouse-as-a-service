# Image Disease Detection

Image-based plant disease detection backed by Roboflow's
`leaf-disease-f06v7/1` model. The browser uploads or captures an
image, posts it to Roboflow, and renders the top predictions plus a
plant-content sanity check.

## Pipeline

1. User uploads or webcam-captures a leaf image.
2. Frontend (`PestDisease.jsx → analyzeImage`) base64-encodes the image
   and POSTs it to the Roboflow inference endpoint.
3. The response (`predictions: [{ class, confidence, ... }]`) is passed
   through `validatePlantImage` to reject obviously non-plant inputs.
4. The top label, confidence, and bounding boxes are rendered.

## Endpoints

| Method | Path | Service |
| ------ | ---- | ------- |
| POST | `https://detect.roboflow.com/leaf-disease-f06v7/1?api_key=...` | Roboflow (third-party) |
| POST | `/api/detect-disease` | `gaas/backend/src/server.js` — deterministic local mock used as a graceful fallback when the frontend cannot reach Roboflow. |

## Why no Python server here?

The current image pipeline is entirely a client → Roboflow → client
flow. If you later self-host the disease classifier, drop the model
artifact (`disease_model.pt` / ONNX / TFLite, etc.) in this folder and
add the corresponding Flask route to `crop_api.py`.
