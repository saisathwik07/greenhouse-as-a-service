const axios = require("axios");

const client = axios.create({
  baseURL: process.env.AI_SERVICE_URL || "http://localhost:8000",
  timeout: 10000
});

async function getPrediction() {
  const response = await client.get("/predict");
  return response.data;
}

async function getAnomaly() {
  const response = await client.get("/anomaly");
  return response.data;
}

async function getClustering() {
  const response = await client.get("/clustering");
  return response.data;
}

module.exports = { getPrediction, getAnomaly, getClustering };
