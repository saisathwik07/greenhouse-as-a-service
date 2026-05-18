import { useEffect, useState } from "react";
import { api } from "../../api";
import { toast, Field, EmptyState, StatusBadge, Toggle } from "./cmsUtils";

const EMPTY_SERVICE = {
  title: "", description: "", pricing: "", features: [],
  image: "", category: "general", activeStatus: true, sortOrder: 0,
};

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

  function openNew() {
    setForm({ ...EMPTY_SERVICE });
    setEditing("new");
  }

  function openEdit(svc) {
    setForm({ ...svc, features: svc.features || [] });
    setEditing(svc);
  }

  async function save() {
    if (!form.title?.trim()) { toast("Title is required", false); return; }
    setSaving(true);
    try {
      if (editing === "new") {
        await api.post("/cms/services", form);
        toast("Service created!");
      } else {
        await api.put(`/cms/services/${editing._id}`, form);
        toast("Service updated!");
      }
      setEditing(null);
      await load();
    } catch {
      toast("Save failed", false);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this service?")) return;
    try {
      await api.delete(`/cms/services/${id}`);
      toast("Service deleted!");
      await load();
    } catch {
      toast("Delete failed", false);
    }
  }

  async function toggleActive(svc) {
    try {
      await api.put(`/cms/services/${svc._id}`, { activeStatus: !svc.activeStatus });
      toast(svc.activeStatus ? "Service hidden" : "Service visible");
      await load();
    } catch {
      toast("Toggle failed", false);
    }
  }

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  /* ── Editor view ─── */
  if (editing !== null) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="bg-gradient-to-r from-gaas-accent/5 to-transparent p-4 border-b border-gaas-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-gaas-heading flex items-center gap-2">
            <span className="text-base">{editing === "new" ? "➕" : "✏️"}</span>
            {editing === "new" ? "Create New Service" : "Edit Service"}
          </h3>
          <button onClick={() => setEditing(null)} className="text-xs text-gaas-muted hover:text-gaas-heading font-medium">← Back to list</button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Service Name" value={form.title} onChange={set("title")} placeholder="e.g. Crop Recommendation" />
          <Field label="Description" value={form.description} onChange={set("description")} rows={3} placeholder="What does this service do?" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pricing" value={form.pricing} onChange={set("pricing")} placeholder="e.g. ₹49/mo" />
            <Field label="Category" value={form.category} onChange={set("category")} placeholder="general" />
          </div>
          <Field label="Image URL" value={form.image} onChange={set("image")} placeholder="https://..." />
          {form.image && (
            <img src={form.image} alt="preview" className="h-28 rounded-lg object-cover border border-gaas-border" onError={(e) => { e.target.style.display = "none"; }} />
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">Features (one per line)</label>
            <textarea
              className="w-full rounded-lg border border-gaas-border bg-white px-3 py-2 text-sm focus:border-gaas-accent focus:outline-none focus:ring-1 focus:ring-gaas-accent/30"
              rows={4}
              value={(form.features || []).join("\n")}
              onChange={(e) => setForm((f) => ({ ...f, features: e.target.value.split("\n").filter((s) => s.trim()) }))}
              placeholder={"Feature 1\nFeature 2"}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sort Order" type="number" value={String(form.sortOrder || 0)} onChange={(v) => setForm((f) => ({ ...f, sortOrder: Number(v) || 0 }))} />
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">Visibility</label>
              <Toggle checked={form.activeStatus !== false} onChange={(v) => setForm((f) => ({ ...f, activeStatus: v }))} label={form.activeStatus !== false ? "Visible" : "Hidden"} />
            </div>
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
            <div className="flex gap-3">
              <div className="h-14 w-14 bg-gray-200 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ── List ─── */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
          {services.map((svc) => (
            <div key={svc._id} className={`glass-card overflow-hidden transition-all hover:shadow-md ${!svc.activeStatus ? "opacity-60" : ""}`}>
              {/* Image header */}
              {svc.image ? (
                <div className="h-32 overflow-hidden bg-gray-100">
                  <img src={svc.image} alt="" className="h-full w-full object-cover" onError={(e) => { e.target.parentElement.innerHTML = '<div class="h-full w-full flex items-center justify-center bg-gradient-to-br from-gaas-accent/10 to-emerald-50 text-3xl">🌿</div>'; }} />
                </div>
              ) : (
                <div className="h-20 bg-gradient-to-br from-gaas-accent/10 to-emerald-50 flex items-center justify-center">
                  <span className="text-2xl">🌿</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-bold text-sm text-gaas-heading leading-tight">{svc.title}</h4>
                  <StatusBadge active={svc.activeStatus} />
                </div>
                <p className="text-xs text-gaas-muted line-clamp-2 mb-3">{svc.description}</p>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {svc.pricing && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">{svc.pricing}</span>
                  )}
                  {svc.category && svc.category !== "general" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold capitalize">{svc.category}</span>
                  )}
                  {(svc.features || []).length > 0 && (
                    <span className="text-[10px] text-gaas-muted">{svc.features.length} features</span>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gaas-border/50">
                  <Toggle checked={svc.activeStatus} onChange={() => toggleActive(svc)} label="" />
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
