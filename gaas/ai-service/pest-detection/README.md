# Pest Detection

Rule-based pest risk scoring driven by crop, growth stage, temperature
and humidity inputs. The actual scoring lives in the React component
(`gaas/frontend/src/pages/PestDisease.jsx`, function `predictDisease`)
because the entire pipeline is deterministic and lightweight — no
training data or model artifacts are required server-side.

## Inputs

| Field        | Notes                                       |
| ------------ | ------------------------------------------- |
| `crop`       | Tomato, Rice, Wheat, Maize, Chili, Lettuce  |
| `stage`      | Seedling / Vegetative / Flowering / Mature  |
| `temperature`| °C                                          |
| `humidity`   | %                                           |

## Outputs

| Field           | Notes                                          |
| --------------- | ---------------------------------------------- |
| `risk`          | `Low / Medium / High - <primary disease>`      |
| `probability`   | Risk score as a percentage                     |
| `treatments`    | Severity-mapped recommendation                 |

## API surface

The Express backend exposes the same shape at `/api/detect-disease`
(see `gaas/backend/src/server.js`) as a deterministic mock so the
frontend has a server fallback for the prediction tab. Image-based
detection lives in `../disease-detection/`.
