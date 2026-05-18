import { useEffect, useState } from "react";
import { api } from "../../api";
import { toast, Field, SectionCard, Toggle } from "./cmsUtils";

const DEFAULT_CONTENT = {
  heroTitle: "", heroSubtitle: "", heroDescription: "", heroBackgroundImage: "",
  aboutTitle: "", aboutDescription: "", aboutImage: "",
  contactEmail: "", contactPhone: "", contactAddress: "",
  testimonialsTitle: "", footerText: "", homepageImages: [],
  sectionVisibility: { hero: true, about: true, services: true, testimonials: true, contact: true, footer: true },
  sectionOrder: ["hero", "about", "services", "testimonials", "contact", "footer"],
};

const SECTION_META = {
  hero: { icon: "🏠", label: "Hero" },
  about: { icon: "ℹ️", label: "About" },
  services: { icon: "⚙️", label: "Services" },
  testimonials: { icon: "💬", label: "Testimonials" },
  contact: { icon: "📧", label: "Contact" },
  footer: { icon: "📄", label: "Footer" },
};

function getVisibility(form, key) {
  if (!form?.sectionVisibility) return true;
  const sv = form.sectionVisibility;
  if (sv instanceof Map) return sv.get(key) !== false;
  return sv[key] !== false;
}

function setVisibility(form, key, val) {
  const sv = form?.sectionVisibility || {};
  const obj = sv instanceof Map ? Object.fromEntries(sv) : { ...sv };
  obj[key] = val;
  return obj;
}

function SectionOrderManager({ order, visibility, onReorder, onToggle }) {
  function move(idx, dir) {
    const arr = [...order];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onReorder(arr);
  }

  return (
    <div className="space-y-1.5">
      {order.map((key, idx) => {
        const meta = SECTION_META[key] || { icon: "📦", label: key };
        const visible = visibility?.[key] !== false;
        return (
          <div key={key} className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition ${visible ? "border-gaas-border bg-white" : "border-dashed border-gray-200 bg-gray-50 opacity-60"}`}>
            <span className="text-sm">{meta.icon}</span>
            <span className="flex-1 text-sm font-medium text-gaas-heading">{meta.label}</span>
            <Toggle checked={visible} onChange={(v) => onToggle(key, v)} />
            <div className="flex gap-0.5">
              <button onClick={() => move(idx, -1)} disabled={idx === 0} className="h-6 w-6 rounded text-xs text-gaas-muted hover:bg-gray-100 disabled:opacity-30">↑</button>
              <button onClick={() => move(idx, 1)} disabled={idx === order.length - 1} className="h-6 w-6 rounded text-xs text-gaas-muted hover:bg-gray-100 disabled:opacity-30">↓</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ContentModule() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    api.get("/cms/content")
      .then(({ data }) => {
        const sv = data?.sectionVisibility;
        if (sv && typeof sv === "object" && !(sv instanceof Map)) {
          data.sectionVisibility = { ...DEFAULT_CONTENT.sectionVisibility, ...sv };
        } else {
          data.sectionVisibility = { ...DEFAULT_CONTENT.sectionVisibility };
        }
        if (!Array.isArray(data?.sectionOrder) || data.sectionOrder.length === 0) {
          data.sectionOrder = [...DEFAULT_CONTENT.sectionOrder];
        }
        setForm(data || DEFAULT_CONTENT);
      })
      .catch((err) => {
        setError(err?.response?.data?.error || err?.message || "Failed to load");
        setForm({ ...DEFAULT_CONTENT });
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.sectionVisibility instanceof Map) {
        payload.sectionVisibility = Object.fromEntries(payload.sectionVisibility);
      }
      const { data } = await api.put("/cms/content", payload);
      if (data.content) {
        const c = data.content;
        if (c.sectionVisibility && typeof c.sectionVisibility === "object") {
          c.sectionVisibility = { ...DEFAULT_CONTENT.sectionVisibility, ...(c.sectionVisibility instanceof Map ? Object.fromEntries(c.sectionVisibility) : c.sectionVisibility) };
        }
        if (!Array.isArray(c.sectionOrder) || c.sectionOrder.length === 0) c.sectionOrder = [...DEFAULT_CONTENT.sectionOrder];
        setForm(c);
      }
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

  const vis = form?.sectionVisibility || DEFAULT_CONTENT.sectionVisibility;
  const order = form?.sectionOrder || DEFAULT_CONTENT.sectionOrder;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
          ⚠️ {error} — showing defaults. Changes will create new content on save.
        </div>
      )}

      {/* Section Visibility & Order Control */}
      <SectionCard icon="🎛️" title="Section Visibility & Order" defaultOpen={true} badge="Layout Control">
        <p className="text-xs text-gaas-muted mb-3">Toggle sections on/off and reorder them with the arrow buttons. Changes affect the public landing page.</p>
        <SectionOrderManager
          order={order}
          visibility={vis}
          onReorder={(newOrder) => setForm((f) => ({ ...f, sectionOrder: newOrder }))}
          onToggle={(key, val) => setForm((f) => ({ ...f, sectionVisibility: setVisibility(f, key, val) }))}
        />
      </SectionCard>

      <SectionCard icon="🏠" title="Homepage Hero" badge={getVisibility(form, "hero") ? "Visible" : "Hidden"}>
        <Field label="Title" value={form?.heroTitle} onChange={set("heroTitle")} placeholder="Main headline" />
        <Field label="Subtitle" value={form?.heroSubtitle} onChange={set("heroSubtitle")} placeholder="Tag line" />
        <Field label="Description" value={form?.heroDescription} onChange={set("heroDescription")} rows={3} placeholder="Brief description" />
        <Field label="Hero Background Image URL" value={form?.heroBackgroundImage} onChange={set("heroBackgroundImage")} placeholder="https://..." />
        {form?.heroBackgroundImage && (
          <div className="relative group inline-block">
            <img src={form.heroBackgroundImage} alt="Hero bg" className="h-24 rounded-lg object-cover border border-gaas-border" onError={(e) => { e.target.style.display = "none"; }} />
            <button onClick={() => set("heroBackgroundImage")("")} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] opacity-0 group-hover:opacity-100 transition flex items-center justify-center">×</button>
          </div>
        )}
      </SectionCard>

      <SectionCard icon="ℹ️" title="About Section" badge={getVisibility(form, "about") ? "Visible" : "Hidden"}>
        <Field label="Title" value={form?.aboutTitle} onChange={set("aboutTitle")} />
        <Field label="Description" value={form?.aboutDescription} onChange={set("aboutDescription")} rows={4} />
        <Field label="About Image URL" value={form?.aboutImage} onChange={set("aboutImage")} placeholder="https://..." />
        {form?.aboutImage && (
          <div className="relative group inline-block">
            <img src={form.aboutImage} alt="About" className="h-24 rounded-lg object-cover border border-gaas-border" onError={(e) => { e.target.style.display = "none"; }} />
            <button onClick={() => set("aboutImage")("")} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] opacity-0 group-hover:opacity-100 transition flex items-center justify-center">×</button>
          </div>
        )}
      </SectionCard>

      <SectionCard icon="📧" title="Contact Information" badge={getVisibility(form, "contact") ? "Visible" : "Hidden"}>
        <Field label="Email" value={form?.contactEmail} onChange={set("contactEmail")} />
        <Field label="Phone" value={form?.contactPhone} onChange={set("contactPhone")} />
        <Field label="Address" value={form?.contactAddress} onChange={set("contactAddress")} rows={2} />
      </SectionCard>

      <SectionCard icon="💬" title="Testimonials" badge={getVisibility(form, "testimonials") ? "Visible" : "Hidden"}>
        <Field label="Section Title" value={form?.testimonialsTitle} onChange={set("testimonialsTitle")} />
      </SectionCard>

      <SectionCard icon="📄" title="Footer" badge={getVisibility(form, "footer") ? "Visible" : "Hidden"}>
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
