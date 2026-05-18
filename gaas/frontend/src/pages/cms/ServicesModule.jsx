import { useEffect, useState } from "react";
import { api } from "../../api";
import { toast, Field, EmptyState, StatusBadge, Toggle } from "./cmsUtils";

const EMPTY_SERVICE = {
  title: "", description: "", pricing: "", features: [],
  image: "", category: "general", activeStatus: true, sortOrder: 0,
};

const CATEGORIES = ["general", "agriculture", "iot", "ai", "data", "support"];

function FeatureEditor({ features, onChange }) {
  const [newFeat, setNewFeat] = useState("");
  function add() {
    if (!newFeat.trim()) return;
    onChange([...features, newFeat.trim()]);
    setNewFeat("");
  }
  function remove(idx) { onChange(features.filter((_, i) => i !== idx)); }
  function move(idx, dir) {
    const arr = [...features];
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    onChange(arr);
  }
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">Features</label>
      <div className="space-y-1.5 mb-2">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-gaas-border bg-gray-50 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-gaas-accent shrink-0" />
            <span className="flex-1 text-sm text-gaas-text">{f}</span>
            <button onClick={() => move(i, -1)} disabled={i === 0} className="text-[10px] text-gaas-muted hover:text-gaas-heading disabled:opacity-30">↑</button>
            <button onClick={() => move(i, 1)} disabled={i === features.length - 1} className="text-[10px] text-gaas-muted hover:text-gaas-heading disabled:opacity-30">↓</button>
            <button onClick={() => remove(i)} className="text-[10px] text-red-500 hover:text-red-700 font-bold">✕</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-gaas-border bg-white px-3 py-1.5 text-sm focus:border-gaas-accent focus:outline-none"
          value={newFeat} onChange={(e) => setNewFeat(e.target.value)}
          placeholder="Add a feature..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <button onClick={add} type="button" className="rounded-lg bg-gaas-accent/10 px-3 py-1.5 text-xs font-semibold text-gaas-accent hover:bg-gaas-accent/20">+ Add</button>
      </div>
    </div>
  );
}

export default function ServicesModule() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_SERVICE);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/cms/services?all=1");
      setServices(data.services || []);
    } catch {
      toast("Failed to load services", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() { setForm({ ...EMPTY_SERVICE }); setEditing("new"); }
  function openEdit(svc) { setForm({ ...svc, features: svc.features || [] }); setEditing(svc); }

  async function save() {
    if (!form.title?.trim()) { toast("Title is required", false); return; }
    setSaving(true);
    try {
      if (editing === "new") { await api.post("/cms/services", form); toast("Service created!"); }
      else { await api.put(`/cms/services/${editing._id}`, form); toast("Service updated!"); }
      setEditing(null);
      await load();
    } catch { toast("Save failed", false); }
    finally { setSaving(false); }
  }

  async function remove(id) {
    if (!confirm("Delete this service permanently?")) return;
    try { await api.delete(`/cms/services/${id}`); toast("Service deleted!"); await load(); }
    catch { toast("Delete failed", false); }
  }

  async function toggleActive(svc) {
    try {
      await api.put(`/cms/services/${svc._id}`, { activeStatus: !svc.activeStatus });
      toast(svc.activeStatus ? "Service hidden from public" : "Service now visible");
      await load();
    } catch { toast("Toggle failed", false); }
  }

  async function reorder(svc, dir) {
    const idx = services.findIndex((s) => s._id === svc._id);
    const target = idx + dir;
    if (target < 0 || target >= services.length) return;
    try {
      await api.put(`/cms/services/${svc._id}`, { sortOrder: services[target].sortOrder ?? target });
      await api.put(`/cms/services/${services[target]._id}`, { sortOrder: svc.sortOrder ?? idx });
      await load();
    } catch { toast("Reorder failed", false); }
  }

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  /* ── Editor ─── */
  if (editing !== null) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="bg-gradient-to-r from-gaas-accent/5 to-transparent p-4 border-b border-gaas-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-gaas-heading flex items-center gap-2">
            <span className="text-base">{editing === "new" ? "➕" : "✏️"}</span>
            {editing === "new" ? "Create New Service" : `Edit: ${form.title || "Service"}`}
          </h3>
          <button onClick={() => setEditing(null)} className="text-xs text-gaas-muted hover:text-gaas-heading font-medium">← Back to list</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Service Name" value={form.title} onChange={set("title")} placeholder="e.g. Crop Recommendation" />
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">Category</label>
              <select className="w-full rounded-lg border border-gaas-border bg-white px-3 py-2 text-sm focus:border-gaas-accent focus:outline-none" value={form.category} onChange={(e) => set("category")(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <Field label="Description" value={form.description} onChange={set("description")} rows={3} placeholder="What does this service do?" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pricing" value={form.pricing} onChange={set("pricing")} placeholder="e.g. ₹49/mo" />
            <Field label="Sort Order" type="number" value={String(form.sortOrder || 0)} onChange={(v) => setForm((f) => ({ ...f, sortOrder: Number(v) || 0 }))} />
          </div>
          <Field label="Image URL" value={form.image} onChange={set("image")} placeholder="https://..." />
          {form.image && (
            <div className="relative group inline-block">
              <img src={form.image} alt="preview" className="h-32 rounded-lg object-cover border border-gaas-border" onError={(e) => { e.target.style.display = "none"; }} />
              <button onClick={() => set("image")("")} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] opacity-0 group-hover:opacity-100 transition flex items-center justify-center">×</button>
            </div>
          )}
          <FeatureEditor features={form.features || []} onChange={(f) => setForm((prev) => ({ ...prev, features: f }))} />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">Visibility</label>
            <Toggle checked={form.activeStatus !== false} onChange={(v) => setForm((f) => ({ ...f, activeStatus: v }))} label={form.activeStatus !== false ? "Visible on public website" : "Hidden from public website"} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving} className="btn-primary flex-1 py-2.5 text-sm font-semibold disabled:opacity-50">
              {saving ? "Saving..." : editing === "new" ? "Create Service" : "Update Service"}
            </button>
            <button onClick={() => setEditing(null)} className="btn-secondary px-6 py-2.5 text-sm">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading ─── */
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="h-28 bg-gray-200 rounded-lg mb-3" />
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  /* ── List ─── */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-gaas-heading">All Services</h3>
          <p className="text-xs text-gaas-muted mt-0.5">{services.length} service{services.length !== 1 ? "s" : ""} · {services.filter((s) => s.activeStatus).length} active</p>
        </div>
        <button onClick={openNew} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
          <span className="text-base">+</span> Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <EmptyState icon="🌿" title="No services yet. Create your first service to get started." action="+ Add Service" onAction={openNew} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {services.map((svc, idx) => (
            <div key={svc._id} className={`glass-card overflow-hidden transition-all hover:shadow-md ${!svc.activeStatus ? "opacity-60 grayscale-[30%]" : ""}`}>
              {svc.image ? (
                <div className="h-32 overflow-hidden bg-gray-100 relative">
                  <img src={svc.image} alt="" className="h-full w-full object-cover" onError={(e) => { e.target.parentElement.innerHTML = '<div class="h-full w-full flex items-center justify-center bg-gradient-to-br from-gaas-accent/10 to-emerald-50 text-3xl">🌿</div>'; }} />
                  {!svc.activeStatus && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-500 bg-white/80 px-3 py-1 rounded-full">Hidden</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-20 bg-gradient-to-br from-gaas-accent/10 to-emerald-50 flex items-center justify-center">
                  <span className="text-2xl">🌿</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-bold text-sm text-gaas-heading leading-tight">{svc.title}</h4>
                  <StatusBadge active={svc.activeStatus} />
                </div>
                <p className="text-xs text-gaas-muted line-clamp-2 mb-2">{svc.description}</p>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {svc.pricing && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">{svc.pricing}</span>}
                  {svc.category && svc.category !== "general" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold capitalize">{svc.category}</span>}
                  {(svc.features || []).length > 0 && <span className="text-[10px] text-gaas-muted">{svc.features.length} feature{svc.features.length !== 1 ? "s" : ""}</span>}
                </div>
                {(svc.features || []).length > 0 && (
                  <div className="mb-3 space-y-0.5">
                    {svc.features.slice(0, 3).map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-gaas-muted">
                        <span className="h-1 w-1 rounded-full bg-gaas-accent shrink-0" />
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                    {svc.features.length > 3 && <p className="text-[10px] text-gaas-muted pl-2.5">+{svc.features.length - 3} more</p>}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-gaas-border/50">
                  <Toggle checked={svc.activeStatus} onChange={() => toggleActive(svc)} />
                  <div className="flex gap-0.5">
                    <button onClick={() => reorder(svc, -1)} disabled={idx === 0} className="h-6 w-6 rounded text-[10px] text-gaas-muted hover:bg-gray-100 disabled:opacity-30" title="Move up">↑</button>
                    <button onClick={() => reorder(svc, 1)} disabled={idx === services.length - 1} className="h-6 w-6 rounded text-[10px] text-gaas-muted hover:bg-gray-100 disabled:opacity-30" title="Move down">↓</button>
                  </div>
                  <div className="flex-1" />
                  <button onClick={() => openEdit(svc)} className="text-xs px-3 py-1.5 rounded-lg border border-gaas-border hover:bg-gray-50 font-medium">Edit</button>
                  <button onClick={() => remove(svc._id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
