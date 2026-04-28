import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../api";

// ========================
// LOCAL FALLBACK DATA
// (only used if backend on port 5000 is also down)
// ========================
function generateReading(row = "row1", bag = "bag1") {
  const r = {
    temperature: +(22 + Math.random() * 8).toFixed(1),
    humidity: +(55 + Math.random() * 30).toFixed(1),
    soil_moisture: +(35 + Math.random() * 40).toFixed(1),
    ph: +(5.8 + Math.random() * 1.5).toFixed(2),
    ec: +(1.0 + Math.random() * 1.6).toFixed(2),
    row, bag,
    timestamp: new Date().toISOString()
  };
  let s = 0;
  if (r.temperature >= 20 && r.temperature <= 30) s += 10;
  if (r.humidity >= 55 && r.humidity <= 80) s += 10;
  if (r.soil_moisture >= 40 && r.soil_moisture <= 70) s += 10;
  if (r.ph >= 5.5 && r.ph <= 7.0) s += 10;
  if (r.ec >= 1.0 && r.ec <= 2.2) s += 10;
  r.healthScore = s;
  return r;
}

function generateHistory(hours = 24) {
  const data = [];
  const now = Date.now();
  for (let i = hours; i > 0; i--) {
    const r = generateReading("row1", "bag1");
    r.timestamp = new Date(now - i * 3600000).toISOString();
    data.push(r);
  }
  return data;
}

function generateAlerts(r) {
  const alerts = [];
  if (r.temperature > 32) alerts.push({ type: "HIGH_TEMP", message: "High temperature detected" });
  if (r.temperature < 18) alerts.push({ type: "LOW_TEMP", message: "Low temperature detected" });
  if (r.soil_moisture < 35) alerts.push({ type: "LOW_MOISTURE", message: "Low soil moisture" });
  if (r.humidity > 85) alerts.push({ type: "HIGH_HUMIDITY", message: "High humidity" });
  return alerts;
}

const ROWS = ["row1", "row2", "row3"];
const BAGS = ["bag1", "bag2", "bag3", "bag4"];

// ========================
// HOOKS
// ========================

export function useSensors({ row, bag, pollInterval = 5000 } = {}) {
  const [realtime, setRealtime] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const backendUp = useRef(null); // null = unknown, true/false

  const fetchRealtime = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (row) params.set("row", row);
      if (bag) params.set("bag", bag);
      const res = await api.get(`/sensors/realtime?${params}`);
      setRealtime(res.data.data);
      setAlerts(res.data.alerts || []);
      setLastUpdated(res.data.lastUpdated);
      setError(null);
      backendUp.current = true;
    } catch (err) {
      backendUp.current = false;
      // Fallback to local data
      const reading = generateReading(row || "row1", bag || "bag1");
      setRealtime(reading);
      setAlerts(generateAlerts(reading));
      setLastUpdated(reading.timestamp);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [row, bag]);

  useEffect(() => {
    fetchRealtime();
    intervalRef.current = setInterval(fetchRealtime, pollInterval);
    return () => clearInterval(intervalRef.current);
  }, [fetchRealtime, pollInterval]);

  return { realtime, alerts, lastUpdated, loading, error, refetch: fetchRealtime };
}

export function useSensorHistory({ row, bag, hours = 24 } = {}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async (customHours) => {
    const h = customHours || hours;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("start", new Date(Date.now() - h * 3600000).toISOString());
      params.set("end", new Date().toISOString());
      if (row) params.set("row", row);
      if (bag) params.set("bag", bag);
      const res = await api.get(`/sensors/history?${params}`);
      setHistory(res.data.data || []);
      setError(null);
    } catch {
      setHistory(generateHistory(h));
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [row, bag, hours]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
}

export function useRows() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    try {
      const res = await api.get("/sensors/rows");
      setRows(res.data.data || []);
    } catch {
      const localRows = ROWS.map(row => {
        const r = generateReading(row, "bag1");
        return { row, bagCount: BAGS.length, latestReading: r, healthScore: r.healthScore };
      });
      setRows(localRows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
    const interval = setInterval(fetchRows, 10000);
    return () => clearInterval(interval);
  }, [fetchRows]);

  return { rows, loading, refetch: fetchRows };
}

export function useBags(row) {
  const [bags, setBags] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBags = useCallback(async () => {
    if (!row) return;
    try {
      const res = await api.get(`/sensors/rows/${row}/bags`);
      setBags(res.data.data || []);
    } catch {
      const localBags = BAGS.map(bag => {
        const r = generateReading(row, bag);
        return { bag, row, latestReading: r, healthScore: r.healthScore };
      });
      setBags(localBags);
    } finally {
      setLoading(false);
    }
  }, [row]);

  useEffect(() => { fetchBags(); }, [fetchBags]);

  return { bags, loading, refetch: fetchBags };
}
