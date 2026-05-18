import { useEffect, useState } from "react";
import { api } from "../../api";
import { toast, Field, SectionCard } from "./cmsUtils";

const DEFAULT_CONTENT = {
  heroTitle: "", heroSubtitle: "", heroDescription: "",
  aboutTitle: "", aboutDescription: "",
  contactEmail: "", contactPhone: "", contactAddress: "",
  testimonialsTitle: "", footerText: "", homepageImages: [],
};

export default function ContentModule() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    api.get("/cms/content")
      .then(({ data }) => setForm(data || DEFAULT_CONTENT))
      .catch((err) => {
        setError(err?.response?.data?.error || err?.message || "Failed to load");
        setForm({ ...DEFAULT_CONTENT });
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.put("/cms/content", form);
      setForm(data.content || form);
      toast("Website content saved!");
    } catch {
      toast("Save failed", false);
    } finally {
      setSaving(false);
    }
  }

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="glass-card p-8 text-center">
        <span className="text-3xl mb-3 block">⚠️</span>
        <p className="text-sm text-red-600 font-medium mb-3">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary text-sm px-5 py-2">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
          ⚠️ {error} — showing defaults. Changes will create new content on save.
        </div>
      )}

      <SectionCard icon="🏠" title="Homepage Hero" defaultOpen={true} badge="Primary">
        <Field label="Title" value={form?.heroTitle} onChange={set("heroTitle")} placeholder="Main headline" />
        <Field label="Subtitle" value={form?.heroSubtitle} onChange={set("heroSubtitle")} placeholder="Tag line" />
        <Field label="Description" value={form?.heroDescription} onChange={set("heroDescription")} rows={3} placeholder="Brief description" />
      </SectionCard>

      <SectionCard icon="ℹ️" title="About Section">
        <Field label="Title" value={form?.aboutTitle} onChange={set("aboutTitle")} />
        <Field label="Description" value={form?.aboutDescription} onChange={set("aboutDescription")} rows={4} />
      </SectionCard>

      <SectionCard icon="📧" title="Contact Information">
        <Field label="Email" value={form?.contactEmail} onChange={set("contactEmail")} />
        <Field label="Phone" value={form?.contactPhone} onChange={set("contactPhone")} />
        <Field label="Address" value={form?.contactAddress} onChange={set("contactAddress")} rows={2} />
      </SectionCard>

      <SectionCard icon="💬" title="Testimonials">
        <Field label="Section Title" value={form?.testimonialsTitle} onChange={set("testimonialsTitle")} />
      </SectionCard>

      <SectionCard icon="📄" title="Footer">
        <Field label="Footer Text" value={form?.footerText} onChange={set("footerText")} />
      </SectionCard>

      <SectionCard icon="🖼️" title="Homepage Images">
        <p className="text-xs text-gaas-muted">Paste one image URL per line.</p>
        <textarea
          className="w-full rounded-lg border border-gaas-border bg-white px-3 py-2 text-sm focus:border-gaas-accent focus:outline-none focus:ring-1 focus:ring-gaas-accent/30"
          rows={4}
          value={(form?.homepageImages || []).join("\n")}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              homepageImages: e.target.value.split("\n").map((u) => u.trim()).filter(Boolean),
            }))
          }
          placeholder="https://example.com/image1.jpg"
        />
        {(form?.homepageImages || []).length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {form.homepageImages.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt={`preview ${i}`} className="h-20 w-20 rounded-lg object-cover border border-gaas-border" onError={(e) => { e.target.style.display = "none"; }} />
                <button
                  onClick={() => setForm((f) => ({ ...f, homepageImages: f.homepageImages.filter((_, j) => j !== i) }))}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <button onClick={save} disabled={saving} className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50">
        {saving ? "Saving..." : "💾 Save All Website Content"}
      </button>
    </div>
  );
}
