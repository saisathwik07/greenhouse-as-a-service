import { useEffect, useRef, useState } from "react";
import UpgradeLock from "../components/UpgradeLock";
import { useSubscription } from "../hooks/useSubscription";

const toInputNumber = (value) => (value === "" ? "" : Number(value));
const ROBOFLOW_API_URL = "https://detect.roboflow.com/leaf-disease-f06v7/1?api_key=HfqAqCcq8uzY7qXFsAwB";

function validatePlantImage(predictions) {
  if (!predictions || predictions.length === 0) {
    return { status: "no_data" };
  }

  if (predictions[0].confidence < 40) {
    return { status: "invalid" };
  }

  const plantKeywords = [
    "leaf", "plant", "crop", "disease",
    "rust", "blight", "mildew", "spot", "curl"
  ];

  const isPlant = plantKeywords.some((keyword) =>
    String(predictions[0].name || "").toLowerCase().includes(keyword)
  );

  if (!isPlant) {
    return { status: "not_plant" };
  }

  if (predictions[0].confidence < 60) {
    return { status: "healthy" };
  }

  return { status: "valid" };
}

function predictDisease({ crop, stage, temperature, humidity }) {
  const cropKeyMap = {
    Tomato: "tomato",
    Potato: "potato",
    Rice: "rice",
    Wheat: "wheat",
    Maize: "corn",
    Cotton: "cotton",
    Sugarcane: "sugarcane",
    Chili: "chili",
    Brinjal: "brinjal",
    Cucumber: "cucumber"
  };

  const diseaseMap = {
    wheat: ["Powdery Mildew", "Leaf Rust", "Septoria Leaf Blotch"],
    rice: ["Leaf Blast", "Brown Spot", "Bacterial Leaf Blight"],
    corn: ["Common Rust", "Northern Leaf Blight", "Gray Leaf Spot"],
    potato: ["Late Blight", "Early Blight", "Powdery Mildew"],
    tomato: ["Early Blight", "Septoria Leaf Spot", "Fusarium Wilt"],
    cotton: ["Leaf Curl", "Fusarium Wilt", "Bacterial Blight"],
    sugarcane: ["Red Rot", "Smut", "Wilt"],
    chili: ["Anthracnose", "Powdery Mildew", "Leaf Curl"],
    brinjal: ["Fruit & Shoot Borer", "Wilt", "Phomopsis Blight"],
    cucumber: ["Downy Mildew", "Powdery Mildew", "Anthracnose"]
  };

  const treatmentBySeverity = {
    low: "Continue normal practices, maintain spacing and regular scouting",
    moderate: "Apply preventive spray, improve airflow, remove early infected leaves",
    high: "Apply targeted treatment immediately, reduce humidity stress, isolate infected area",
    critical: "Urgent intervention required; quarantine affected plants and intensify treatment"
  };

  const plantType = cropKeyMap[crop] || String(crop || "").toLowerCase();

  const stageSymptomScore = {
    Seedling: 2,
    Vegetative: 4,
    Flowering: 6,
    Harvest: 5
  }[stage] ?? 4;

  // Ported from ZIP core_app.py risk heuristic (adapted to available UI inputs).
  const humidityRisk =
    humidity > 60 ? Math.min(100, (humidity / 100) * 60) : (humidity / 60) * 30;

  let tempRisk = 5;
  if (temperature >= 20 && temperature <= 28) tempRisk = 50;
  else if (temperature >= 15 && temperature <= 35) tempRisk = 35;
  else if (temperature >= 10 && temperature <= 40) tempRisk = 20;

  const rainfall = 0;
  const rainfallRisk = rainfall > 0 ? Math.min(100, (rainfall / 100) * 50) : 0;

  const ph = 6.5;
  const phDeviation = Math.abs(ph - 6.5);
  const phRisk = Math.min(100, (phDeviation / 2.5) * 50);

  const healthScore = stageSymptomScore; // 0-10 scale

  const diseaseRiskScore = Math.min(
    100,
    Math.max(
      0,
      humidityRisk * 0.3 +
      tempRisk * 0.25 +
      rainfallRisk * 0.15 +
      phRisk * 0.1 +
      (healthScore / 10) * 100 * 0.2
    )
  );

  let severity = "Low Risk";
  let probableDiseases = [];
  if (diseaseRiskScore < 30) {
    severity = "Low Risk";
  } else if (diseaseRiskScore < 60) {
    severity = "Moderate Risk";
    probableDiseases = (diseaseMap[plantType] || ["Fungal/Bacterial Disease"]).slice(0, 1);
  } else if (diseaseRiskScore < 80) {
    severity = "High Risk";
    probableDiseases = (diseaseMap[plantType] || ["Fungal/Bacterial Disease"]).slice(0, 2);
  } else {
    severity = "Critical Risk";
    probableDiseases = (diseaseMap[plantType] || ["Fungal/Bacterial Disease"]).slice(0, 3);
  }

  const primaryDisease = probableDiseases[0];
  const probability = `${Math.round(diseaseRiskScore)}%`;
  const action = severity === "Low Risk"
    ? treatmentBySeverity.low
    : `${treatmentBySeverity[severity.toLowerCase().split(" ")[0]]}. Likely issue: ${primaryDisease}`;

  const nextCheck =
    severity === "Critical Risk" ? "Within 24 hours"
      : severity === "High Risk" ? "Within 48 hours"
        : severity === "Moderate Risk" ? "Within 72 hours"
          : "After 3 days";

  return {
    risk: primaryDisease ? `${severity} - ${primaryDisease}` : severity,
    probability,
    action,
    nextCheck
  };
}

export default function PestDisease() {
  const { canAccess } = useSubscription();
  const allowed = canAccess("pestDisease");
  const [mode, setMode] = useState("prediction");
  const [form, setForm] = useState({
    crop: "Tomato",
    stage: "Vegetative",
    temperature: 31,
    humidity: 69
  });
  const [result, setResult] = useState(null);
  const [capturedImage, setCapturedImage] = useState("");
  const [uploadedImage, setUploadedImage] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [imageResult, setImageResult] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const imageRef = useRef(null);
  const resultCanvasRef = useRef(null);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleRunPrediction = (e) => {
    e.preventDefault();
    if (form.temperature === "" || form.humidity === "") {
      alert("Please fill in all input fields with valid values.");
      return;
    }
    const prediction = predictDisease({
      crop: form.crop,
      stage: form.stage,
      temperature: Number(form.temperature),
      humidity: Number(form.humidity)
    });
    setResult({ crop: form.crop, stage: form.stage, ...prediction });
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error(err);
      alert("Unable to start camera. Please allow camera access.");
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) {
      alert("Camera is not ready.");
      return;
    }
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL("image/jpeg");
    setCapturedImage(imageBase64);
    setUploadedFile(null);
    setUploadedImage("");
  };

  const analyzeImage = async (file, previewImage) => {
    if (!file && !previewImage) {
      alert("Capture or upload an image first.");
      return;
    }
    setImageLoading(true);
    setImageError("");
    try {
      const payloadBase64 = previewImage
        ? String(previewImage).split(",")[1]
        : await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

      const res = await fetch(ROBOFLOW_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payloadBase64
      });
      if (!res.ok) throw new Error("API failed");
      const data = await res.json();
      const predictions = (data.predictions || []).map((p) => ({
        name: p.class || p.name || "unknown_object",
        confidence: Number(((p.confidence || 0) * 100).toFixed(1)),
        x: Number(p.x || 0),
        y: Number(p.y || 0),
        width: Number(p.width || 0),
        height: Number(p.height || 0)
      }));
      setImageResult({
        disease: predictions[0]?.name || "Unknown",
        confidence: predictions[0]?.confidence ?? 0,
        predictions,
        imageBase64: previewImage || uploadedImage
      });
    } catch (err) {
      console.error(err);
      setImageError("Detection error. Please try another image.");
      setImageResult(null);
    } finally {
      setImageLoading(false);
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const preview = String(reader.result || "");
      setUploadedImage(preview);
      setCapturedImage("");
      analyzeImage(file, preview);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    const canvas = resultCanvasRef.current;
    const img = imageRef.current;
    const detections = imageResult?.predictions || [];

    if (!canvas || !img || detections.length === 0) return;

    const draw = () => {
      const displayWidth = img.clientWidth;
      const displayHeight = img.clientHeight;
      const naturalWidth = img.naturalWidth || displayWidth;
      const naturalHeight = img.naturalHeight || displayHeight;
      if (!displayWidth || !displayHeight) return;

      canvas.width = displayWidth;
      canvas.height = displayHeight;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const sx = displayWidth / naturalWidth;
      const sy = displayHeight / naturalHeight;

      detections.forEach((det) => {
        const x = (det.x - det.width / 2) * sx;
        const y = (det.y - det.height / 2) * sy;
        const w = det.width * sx;
        const h = det.height * sy;

        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = "lime";
        ctx.font = "12px Arial";
        ctx.fillText(`${det.name} (${Number(det.confidence).toFixed(1)}%)`, x, Math.max(12, y - 5));
      });
    };

    if (img.complete) draw();
    else img.onload = draw;
  }, [imageResult]);

  return (
    <div className="relative space-y-6 animate-in">
      <div className={allowed ? "" : "pointer-events-none blur-[1px] select-none"}>
      <div>
        <h1 className="text-2xl font-bold text-gaas-heading">Pest & Disease Prediction</h1>
      </div>

      <div className="flex gap-1 bg-gaas-bg p-1 rounded-lg w-fit">
        {[
          { key: "prediction", label: "🔎 Prediction" },
          { key: "image", label: "🖼️ Image Detection" }
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              mode === key
                ? "bg-gaas-accent text-gaas-bg shadow-glow"
                : "text-gaas-muted hover:text-gaas-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "prediction" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-gaas-heading mb-4">Input</h2>
            <form onSubmit={handleRunPrediction} className="space-y-4">
              <div>
                <label className="text-xs text-gaas-muted mb-1.5 block">Crop Type</label>
                <select
                  value={form.crop}
                  onChange={(e) => updateField("crop", e.target.value)}
                  className="input-field w-full"
                >
                  {["Tomato", "Potato", "Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Chili", "Brinjal", "Cucumber"].map((crop) => (
                    <option key={crop} value={crop}>{crop}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gaas-muted mb-1.5 block">Growth Stage</label>
                <select
                  value={form.stage}
                  onChange={(e) => updateField("stage", e.target.value)}
                  className="input-field w-full"
                >
                  {["Seedling", "Vegetative", "Flowering", "Harvest"].map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gaas-muted mb-1.5 block">Temperature (°C)</label>
                <input
                  type="number"
                  value={form.temperature}
                  onChange={(e) => updateField("temperature", toInputNumber(e.target.value))}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="text-xs text-gaas-muted mb-1.5 block">Humidity (%)</label>
                <input
                  type="number"
                  value={form.humidity}
                  onChange={(e) => updateField("humidity", toInputNumber(e.target.value))}
                  className="input-field w-full"
                />
              </div>

              <button type="submit" className="btn-primary w-full">
                Run Prediction
              </button>
            </form>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-gaas-heading mb-4">Output</h2>
            {result ? (
              <div className="bg-gaas-bg rounded-lg p-4 text-sm space-y-1.5 text-gaas-text">
                <p><span className="font-semibold">Crop:</span> {result.crop} ({result.stage} stage)</p>
                <p><span className="font-semibold">Pest/Disease Risk:</span> {result.risk}</p>
                <p><span className="font-semibold">Probability:</span> {result.probability}</p>
                <p><span className="font-semibold">Recommended Action:</span> {result.action}</p>
                <p><span className="font-semibold">Next Check:</span> {result.nextCheck}</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gaas-muted">
                <p>Run prediction to see results</p>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === "image" && (
        <>
          <div>
            <h2 className="text-xl font-semibold text-gaas-heading">Disease Detection (Image-Based)</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-gaas-heading mb-4">Camera Capture</h3>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={startCamera} className="btn-primary">Start Camera</button>
                  <button type="button" onClick={captureImage} className="btn-secondary">Capture Image</button>
                  <button type="button" onClick={() => analyzeImage(null, capturedImage)} className="btn-primary">
                    Analyze
                  </button>
                </div>
                <video ref={videoRef} className="w-full rounded-lg bg-gaas-bg" muted playsInline />
                <canvas ref={canvasRef} className="w-full rounded-lg bg-gaas-bg" />
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-gaas-heading mb-4">Upload Image</h3>
              <div className="space-y-3">
                <input type="file" accept="image/*" onChange={handleUpload} className="input-field w-full" />
                <button type="button" onClick={() => analyzeImage(uploadedFile, uploadedImage)} className="btn-primary">
                  Analyze Image
                </button>
                {uploadedImage && (
                  <img src={uploadedImage} alt="Uploaded preview" className="w-full rounded-lg border border-gaas-border" />
                )}
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-gaas-heading mb-4">Analysis Results</h3>
            {imageLoading ? (
              <div className="text-center py-8 text-gaas-muted animate-pulse-slow">Analyzing image...</div>
            ) : imageError ? (
              <div className="bg-red-100 text-red-600 p-4 rounded">{imageError}</div>
            ) : imageResult ? (
              (() => {
                const normalizedPredictions = (imageResult.predictions || []).map((p) => ({
                  name: p.name || p.label || "unknown_object",
                  confidence: Number(p.confidence || 0)
                }));
                const resultStatus = validatePlantImage(normalizedPredictions);
                const previewImage = imageResult.imageBase64;

                if (resultStatus.status === "not_plant") {
                  return (
                    <div className="bg-red-100 text-red-600 p-4 rounded">
                      ❌ Invalid image. Please upload a plant leaf image.
                    </div>
                  );
                }

                if (resultStatus.status === "invalid") {
                  return (
                    <div className="bg-yellow-100 text-yellow-700 p-4 rounded">
                      ⚠️ Unable to detect plant properly. Try a clear leaf image.
                    </div>
                  );
                }

                if (resultStatus.status === "healthy") {
                  return (
                    <div className="bg-green-100 text-green-700 p-4 rounded">
                      ✅ No disease detected. Plant looks healthy.
                    </div>
                  );
                }

                if (resultStatus.status === "no_data") {
                  return (
                    <div className="text-center py-8 text-gaas-muted">No prediction data available.</div>
                  );
                }

                const sorted = [...normalizedPredictions]
                  .sort((a, b) => b.confidence - a.confidence);
                const mainDisease = sorted[0];
                const otherDiseases = sorted.slice(1, 3);

                const diseaseInfo = {
                  rust: {
                    description: [
                      "Fungal infection that creates orange/brown pustules on leaf surfaces.",
                      "Reduces photosynthesis and weakens plant growth over time.",
                      "Can spread quickly through spores under favorable weather."
                    ],
                    causes: [
                      "High humidity for prolonged hours.",
                      "Poor air circulation between dense plants.",
                      "Infected crop residue left in the field."
                    ],
                    cure: [
                      "Apply recommended fungicide at proper interval.",
                      "Improve spacing and airflow around canopy.",
                      "Remove heavily infected leaves and destroy residues."
                    ]
                  },
                  leaf_curl: {
                    description: [
                      "Leaves curl upward/downward and become thick or distorted.",
                      "New growth becomes stunted and uneven.",
                      "Yield drops due to reduced healthy foliage."
                    ],
                    causes: [
                      "Virus transmission by sucking pests (aphids/whiteflies).",
                      "High pest population in warm, dry conditions.",
                      "Lack of early pest monitoring."
                    ],
                    cure: [
                      "Control vectors using integrated pest management.",
                      "Remove severely affected leaves/shoots early.",
                      "Use tolerant varieties and clean planting material."
                    ]
                  },
                  anthracnose_disease: {
                    description: [
                      "Dark, sunken lesions appear on leaves, stems, and fruits.",
                      "Spots enlarge and may cause tissue rot.",
                      "Severely affected fruits can become unmarketable."
                    ],
                    causes: [
                      "Fungal infection favored by warm, wet weather.",
                      "Water splash spreading spores between plants.",
                      "Overhead irrigation and prolonged leaf wetness."
                    ],
                    cure: [
                      "Spray suitable fungicide according to label schedule.",
                      "Avoid overwatering and improve field drainage.",
                      "Remove infected plant parts to reduce inoculum."
                    ]
                  },
                  powdery_mildew: {
                    description: [
                      "White powder-like fungal growth appears on leaf surfaces.",
                      "Infected leaves may yellow, curl, and dry prematurely.",
                      "Disease pressure rises quickly in favorable microclimate."
                    ],
                    causes: [
                      "Warm days with humid nights.",
                      "Poor ventilation in dense canopy/greenhouse.",
                      "Continuous susceptible crop without sanitation."
                    ],
                    cure: [
                      "Apply sulfur or recommended anti-mildew fungicide.",
                      "Improve ventilation and reduce leaf wetness period.",
                      "Prune crowded foliage and remove infected leaves."
                    ]
                  }
                };

                const normalizeKey = (name) =>
                  String(name || "")
                    .toLowerCase()
                    .replace(/\s+/g, "_");

                const formatName = (name) =>
                  String(name || "")
                    .replace(/_/g, " ")
                    .toUpperCase();

                const info = diseaseInfo[normalizeKey(mainDisease?.name)] || {};
                const descriptionPoints = info.description || ["No data available"];
                const causePoints = info.causes || ["No data available"];
                const curePoints = info.cure || ["No data available"];

                return (
                  <div className="space-y-4">
                    <div className="bg-green-100 p-4 rounded-lg">
                      <p><strong>Detected Disease:</strong> {formatName(mainDisease?.name)}</p>
                      <p><strong>Confidence:</strong> {mainDisease?.confidence}%</p>
                      <p>
                        <strong>Possible Diseases:</strong>{" "}
                        {otherDiseases.map((d) => `${formatName(d.name)} (${d.confidence}%)`).join(", ") || "--"}
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <div className="relative w-[400px]">
                        <img
                          ref={imageRef}
                          src={previewImage}
                          alt="Analyzed preview"
                          className="rounded-lg shadow-md w-[400px]"
                        />
                        <canvas
                          ref={resultCanvasRef}
                          className="absolute top-0 left-0 w-[400px] h-full pointer-events-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded border shadow-sm">
                        <h3 className="font-semibold text-green-700 mb-2">What is it?</h3>
                        <ul className="space-y-1 text-sm text-gaas-text">
                          {descriptionPoints.map((point, idx) => (
                            <li key={idx}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-white p-4 rounded border shadow-sm">
                        <h3 className="font-semibold text-yellow-600 mb-2">Causes</h3>
                        <ul className="space-y-1 text-sm text-gaas-text">
                          {causePoints.map((point, idx) => (
                            <li key={idx}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-white p-4 rounded border shadow-sm">
                        <h3 className="font-semibold text-blue-600 mb-2">Prevention / Cure</h3>
                        <ul className="space-y-1 text-sm text-gaas-text">
                          {curePoints.map((point, idx) => (
                            <li key={idx}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-8 text-gaas-muted">Capture or upload an image and run analysis</div>
            )}
          </div>
        </>
      )}
      </div>
      {!allowed && (
        <UpgradeLock
          title="Upgrade Required"
          message="Pest & Disease AI is available on Standard and Premium plans."
        />
      )}
    </div>
  );
}
