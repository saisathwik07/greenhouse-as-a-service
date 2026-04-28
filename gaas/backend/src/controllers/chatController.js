/**
 * Agriculture chatbot controller.
 *
 * Self-contained, rule-based NLU engine with deep agriculture / greenhouse domain
 * knowledge. Covers: crop recommendations, fertilizer advice, soil health, pest &
 * disease management, irrigation, sensor troubleshooting, and general greenhouse ops.
 *
 * No external API or model binary required — works out of the box.
 */

/* ------------------------------------------------------------------ */
/*  KNOWLEDGE BASE                                                      */
/* ------------------------------------------------------------------ */

const CROP_INFO = {
  rice: { temp: "22–32 °C", humidity: "70–100 %", ph: "5.5–6.5", soil: "Alluvial / Clay", water: "Flood irrigation" },
  wheat: { temp: "15–25 °C", humidity: "50–70 %", ph: "6.0–7.5", soil: "Loamy / Clay", water: "Sprinkler / Drip" },
  maize: { temp: "18–30 °C", humidity: "50–80 %", ph: "5.5–7.5", soil: "Loamy / Sandy", water: "Furrow / Drip" },
  cotton: { temp: "20–35 °C", humidity: "60–80 %", ph: "5.5–8.0", soil: "Black / Alluvial", water: "Drip" },
  tomato: { temp: "20–30 °C", humidity: "60–80 %", ph: "5.5–7.0", soil: "Loamy / Sandy", water: "Drip" },
  chili: { temp: "20–32 °C", humidity: "55–80 %", ph: "6.0–7.0", soil: "Sandy / Red", water: "Drip" },
  lettuce: { temp: "12–24 °C", humidity: "60–85 %", ph: "6.0–7.0", soil: "Loamy / Black", water: "Drip / Sprinkler" },
  potato: { temp: "15–22 °C", humidity: "60–80 %", ph: "5.0–6.5", soil: "Sandy / Loamy", water: "Drip / Furrow" },
  onion: { temp: "13–25 °C", humidity: "50–70 %", ph: "6.0–7.5", soil: "Loamy / Sandy", water: "Drip" },
  cucumber: { temp: "20–30 °C", humidity: "60–80 %", ph: "5.5–7.0", soil: "Loamy / Sandy", water: "Drip" },
};

const FERTILIZER_INFO = {
  "npk 19-19-19": { use: "Balanced growth", dose: "5 g/L", when: "Every 2 weeks during vegetative stage" },
  "urea 46-0-0": { use: "High-nitrogen for leafy growth", dose: "3 g/L", when: "Early growth stage" },
  "dap 18-46-0": { use: "Phosphorus-rich for roots", dose: "4 g/L", when: "Transplanting & early growth" },
  "mop 0-0-60": { use: "Potassium for fruit quality", dose: "3 g/L", when: "Fruiting & flowering stage" },
  "calcium nitrate": { use: "Prevents blossom end rot", dose: "4 g/L", when: "Fruiting stage" },
};

const PEST_INFO = {
  "powdery mildew": { crops: "Tomato, Cucumber, Lettuce", treatment: "Apply sulfur-based fungicide or neem oil spray. Ensure good ventilation.", prevention: "Avoid overhead watering; space plants for air circulation." },
  "leaf spot": { crops: "Tomato, Chili, Cotton", treatment: "Remove affected leaves. Apply copper-based fungicide.", prevention: "Use disease-resistant varieties; avoid wetting foliage." },
  "aphids": { crops: "Most crops", treatment: "Spray neem oil or insecticidal soap. Introduce ladybugs.", prevention: "Companion planting with marigolds; regular inspection." },
  "whitefly": { crops: "Tomato, Cotton, Chili", treatment: "Yellow sticky traps + neem oil spray.", prevention: "Use reflective mulch; introduce Encarsia wasp." },
  "blight": { crops: "Tomato, Potato", treatment: "Apply mancozeb or chlorothalonil fungicide.", prevention: "Crop rotation; avoid overhead irrigation; use resistant varieties." },
  "root rot": { crops: "Most crops", treatment: "Improve drainage. Apply Trichoderma-based bio-fungicide.", prevention: "Avoid overwatering; use well-draining soil mix." },
};

/* ------------------------------------------------------------------ */
/*  INTENT PATTERNS                                                     */
/* ------------------------------------------------------------------ */

const INTENTS = [
  { intent: "greeting", patterns: [/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|namaste|howdy)\b/i] },
  { intent: "farewell", patterns: [/^(bye|goodbye|see you|take care|exit|quit)\b/i] },
  { intent: "thanks", patterns: [/\b(thanks|thank\s*you|thx|appreciate)\b/i] },
  { intent: "help", patterns: [/\b(help|what can you do|features|commands|menu)\b/i] },

  // Agriculture intents
  { intent: "crop_info", patterns: [/\b(grow|cultivat|plant|crop|farming|harvest|sow)\b/i, /\btell\s*(me\s*)?(about\s*)?(growing|planting)\b/i] },
  { intent: "fertilizer", patterns: [/\b(fertil|nutrient|npk|urea|dap|mop|calcium nitrate|feed|manure|compost)\b/i] },
  { intent: "pest_disease", patterns: [/\b(pest|disease|mildew|blight|aphid|whitefl|fungus|fungal|insect|bug|rot|leaf\s*spot|wilt|infection)\b/i] },
  { intent: "soil", patterns: [/\b(soil|ph|ec|conductiv|organic\s*matter|drainage|loam|clay|sand|acidic|alkaline)\b/i] },
  { intent: "irrigation", patterns: [/\b(water|irrigat|drip|sprinkler|flood|moist|overwater|underwater|pump)\b/i] },
  { intent: "temperature", patterns: [/\b(temp|heat|cold|frost|warm|cool|climate|weather|greenhouse\s*temp)\b/i] },
  { intent: "humidity", patterns: [/\b(humid|dew|condensat|ventilat|mist|fog)\b/i] },
  { intent: "sensor", patterns: [/\b(sensor|reading|monitor|iot|mqtt|data|dashboard|measure)\b/i] },
  { intent: "greenhouse", patterns: [/\b(greenhouse|polyhouse|grow\s*house|tunnel|shade\s*net|controlled\s*environment)\b/i] },
  { intent: "yield", patterns: [/\b(yield|harvest|production|output|predict|forecast)\b/i] },
];

/* ------------------------------------------------------------------ */
/*  RESPONSE GENERATORS                                                 */
/* ------------------------------------------------------------------ */

function extractCropName(msg) {
  const lower = msg.toLowerCase();
  for (const name of Object.keys(CROP_INFO)) {
    if (lower.includes(name)) return name;
  }
  return null;
}

function extractPestName(msg) {
  const lower = msg.toLowerCase();
  for (const name of Object.keys(PEST_INFO)) {
    if (lower.includes(name)) return name;
  }
  return null;
}

function extractFertilizerName(msg) {
  const lower = msg.toLowerCase();
  for (const name of Object.keys(FERTILIZER_INFO)) {
    if (lower.includes(name)) return name;
  }
  return null;
}

function classifyIntent(msg) {
  for (const { intent, patterns } of INTENTS) {
    for (const pat of patterns) {
      if (pat.test(msg)) return intent;
    }
  }
  return "unknown";
}

function generateResponse(message) {
  const intent = classifyIntent(message);

  switch (intent) {
    case "greeting":
      return "Hello! 🌿 I'm your GaaS Agriculture Assistant. Ask me about crops, fertilizers, pests, soil health, irrigation, sensors, or greenhouse management. How can I help?";

    case "farewell":
      return "Goodbye! 🌱 Happy farming! Feel free to come back anytime you need help.";

    case "thanks":
      return "You're welcome! 🌾 Let me know if you have more agriculture questions.";

    case "help":
      return `Here's what I can help with:\n\n🌾 **Crops** — Growing conditions for 10+ crops (e.g. "tell me about tomato")\n🧪 **Fertilizers** — NPK, Urea, DAP, MOP, Calcium Nitrate dosage & timing\n🐛 **Pests & Disease** — Identification, treatment, prevention\n🌍 **Soil** — pH, EC, drainage, soil types\n💧 **Irrigation** — Drip, sprinkler, moisture management\n🌡️ **Temperature & Humidity** — Optimal ranges, ventilation\n📊 **Sensors** — Dashboard, IoT readings, MQTT\n🏠 **Greenhouse** — Setup, environment control\n📈 **Yield** — Prediction, harvest optimization\n\nJust type your question!`;

    case "crop_info": {
      const crop = extractCropName(message);
      if (crop) {
        const c = CROP_INFO[crop];
        return `🌾 **${crop.charAt(0).toUpperCase() + crop.slice(1)}** growing conditions:\n\n🌡️ Temperature: ${c.temp}\n💧 Humidity: ${c.humidity}\n🧪 pH range: ${c.ph}\n🌍 Soil type: ${c.soil}\n💦 Irrigation: ${c.water}\n\nWant to know about fertilizers or pests for ${crop}?`;
      }
      const names = Object.keys(CROP_INFO).map((n) => n.charAt(0).toUpperCase() + n.slice(1));
      return `I have detailed info on these crops: **${names.join(", ")}**.\n\nTry asking: "How to grow tomato?" or "Tell me about rice"`;
    }

    case "fertilizer": {
      const fert = extractFertilizerName(message);
      if (fert) {
        const f = FERTILIZER_INFO[fert];
        return `🧪 **${fert.toUpperCase()}**\n\n📋 Use: ${f.use}\n💊 Dose: ${f.dose}\n📅 When: ${f.when}\n\nNeed dosage for a specific crop?`;
      }
      return `Available fertilizer guides:\n\n${Object.entries(FERTILIZER_INFO)
        .map(([name, f]) => `• **${name.toUpperCase()}** — ${f.use} (${f.dose})`)
        .join("\n")}\n\nAsk about a specific one for detailed guidance!`;
    }

    case "pest_disease": {
      const pest = extractPestName(message);
      if (pest) {
        const p = PEST_INFO[pest];
        return `🐛 **${pest.charAt(0).toUpperCase() + pest.slice(1)}**\n\n🌿 Affected crops: ${p.crops}\n💊 Treatment: ${p.treatment}\n🛡️ Prevention: ${p.prevention}`;
      }
      return `Common greenhouse pests & diseases:\n\n${Object.entries(PEST_INFO)
        .map(([name, p]) => `• **${name.charAt(0).toUpperCase() + name.slice(1)}** — Affects: ${p.crops}`)
        .join("\n")}\n\nAsk about a specific one for treatment details!`;
    }

    case "soil":
      return `🌍 **Soil Health Guide**\n\n**pH levels:**\n• Acidic (< 6.0) — Add lime to raise pH\n• Neutral (6.0–7.0) — Ideal for most crops\n• Alkaline (> 7.0) — Add sulfur or organic matter\n\n**EC (Electrical Conductivity):**\n• Low (< 1.0 mS/cm) — Needs more nutrients\n• Optimal (1.0–2.5 mS/cm) — Good nutrient availability\n• High (> 2.5 mS/cm) — Flush with water, reduce fertilizer\n\n**Tips:** Check soil pH and EC using your GaaS sensors. Navigate to Dashboard → Sensor Data for live readings!`;

    case "irrigation":
      return `💧 **Irrigation Guide**\n\n**Methods:**\n• **Drip** — Most efficient (90-95%), ideal for greenhouse\n• **Sprinkler** — Good for leafy crops, 60-80% efficiency\n• **Flood** — Traditional, for rice paddies\n\n**Moisture targets:**\n• Optimal soil moisture: 40–70%\n• Below 35% → Trigger irrigation\n• Above 80% → Risk of root rot\n\n**Smart tip:** Your GaaS sensors monitor soil moisture in real-time. Set alerts for low moisture on the Dashboard!`;

    case "temperature":
      return `🌡️ **Temperature Management**\n\n**Greenhouse ranges:**\n• Day: 22–28 °C (optimal for most crops)\n• Night: 16–20 °C\n• Critical high: > 35 °C → open vents, activate fans\n• Critical low: < 10 °C → activate heaters\n\n**Actions:**\n• Use shade nets above 32 °C\n• Ensure ventilation fans run at > 30 °C\n• Night heating below 15 °C in winter\n\n**GaaS tip:** Check real-time temperature on your Dashboard. High-temp alerts trigger automatically!`;

    case "humidity":
      return `💨 **Humidity Control**\n\n**Optimal range:** 60–80% RH\n\n**Too high (> 85%):**\n• Risk of fungal disease (powdery mildew, leaf spot)\n• Open vents, run exhaust fans\n• Reduce irrigation frequency\n\n**Too low (< 50%):**\n• Leaf wilting, reduced growth\n• Use misting system or humidifier\n• Mulch soil to retain moisture\n\n**GaaS tip:** Monitor humidity via Dashboard sensors. Alerts fire automatically for critical levels.`;

    case "sensor":
      return `📊 **GaaS Sensor System**\n\nYour dashboard monitors:\n• 🌡️ Temperature (°C)\n• 💧 Humidity (%)\n• 🌍 Soil moisture (%)\n• 🧪 pH level\n• ⚡ EC (mS/cm)\n\n**Where to view:**\n• **Dashboard** — Overview with health scores\n• **Data** — Historical charts & CSV export\n• **IoT / MQTT** — Real-time sensor streams\n• **Live Data** — Live readings with auto-refresh\n\nNavigate using the sidebar menu!`;

    case "greenhouse":
      return `🏠 **Greenhouse Management**\n\n**Key parameters to monitor:**\n1. Temperature: 22–28 °C (day)\n2. Humidity: 60–80%\n3. Soil moisture: 40–70%\n4. pH: 5.5–7.0\n5. EC: 1.0–2.5 mS/cm\n6. Light: 12–16 hours\n\n**Best practices:**\n• Automate irrigation with soil moisture sensors\n• Use shade nets in summer\n• Ensure proper ventilation\n• Monitor pest traps weekly\n• Rotate crops seasonally\n\n**GaaS features:** Dashboard, IoT, AI Analytics, Pest Detection — all in your sidebar!`;

    case "yield":
      return `📈 **Yield Prediction**\n\nYour GaaS platform includes AI-powered yield prediction!\n\n**How to use:**\n1. Go to **Agricultural Services** in the sidebar\n2. Enter crop type, soil type, and nutrient levels\n3. Get predicted yield per hectare\n\n**Factors affecting yield:**\n• Soil nutrients (N, P, K)\n• Temperature & humidity\n• Water management\n• Pest control\n• Fertilizer timing\n\n**Tip:** Maintain optimal sensor readings to maximize yield. Check the AI Analytics page for insights!`;

    default:
      return `I'm your GaaS Agriculture Assistant 🌿. I didn't quite catch that, but I can help with:\n\n• **Crops** — "How to grow tomato?"\n• **Fertilizers** — "What is NPK?"\n• **Pests** — "How to treat powdery mildew?"\n• **Soil** — "What pH is best?"\n• **Sensors** — "How to read my dashboard?"\n• **Greenhouse** — "Best practices?"\n\nTry rephrasing or type **help** for the full menu!`;
  }
}

/* ------------------------------------------------------------------ */
/*  EXPRESS HANDLER                                                     */
/* ------------------------------------------------------------------ */

/**
 * POST /api/chat
 * Body: { message: "user input" }
 * Response: { reply: "bot response" }
 */
async function chatHandler(req, res) {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ error: "Message is required", code: "VALIDATION" });
    }

    const reply = generateResponse(message);
    return res.json({ reply });
  } catch (err) {
    console.error("[chat/message]", err);
    return res.status(500).json({ error: "Chat failed", detail: err.message });
  }
}

module.exports = { chatHandler };
