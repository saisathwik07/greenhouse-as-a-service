import { useEffect, useState } from "react";
import { api } from "../../api";
import { toast, Field, EmptyState, StatusBadge, Toggle } from "./cmsUtils";

const SECTION_TYPES = [
  { value: "hero_banner", label: "Hero Banner", icon: "🏠" },
  { value: "text", label: "Text Section", icon: "📝" },
  { value: "image", label: "Image Section", icon: "🖼️" },
  { value: "gallery", label: "Gallery", icon: "🎨" },
  { value: "services", label: "Services", icon: "⚙️" },
  { value: "testimonials", label: "Testimonials", icon: "💬" },
  { value: "contact", label: "Contact", icon: "📧" },
  { value: "feature_cards", label: "Feature Cards", icon: "🃏" },
  { value: "custom", label: "Custom Content", icon: "✨" },
];

const EMPTY_SECTION = { type: "text", title: "", subtitle: "", content: "", image: "", items: [], visible: true, sortOrder: 0 };
const EMPTY_PAGE = { title: "", slug: "", bannerImage: "", description: "", sections: [], visible: true, sortOrder: 0 };

/* ── Section Editor (inline) ─── */
function SectionEditor({ sections, onChange }) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  function addSection() {
    onChange([...sections, { ...EMPTY_SECTION, sortOrder: sections.length }]);
    setExpandedIdx(sections.length);
  }
  function removeSection(idx) { onChange(sections.filter((_, i) => i !== idx)); setExpandedIdx(null); }
  function updateSection(idx, patch) { onChange(sections.map((s, i) => i === idx ? { ...s, ...patch } : s)); }
  function moveSection(idx, dir) {
    const arr = [...sections];
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    onChange(arr);
    setExpandedIdx(t);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-gaas-muted">Sections ({sections.length})</label>
        <button type="button" onClick={addSection} className="text-xs font-semibold text-gaas-accent hover:text-gaas-accent-dark">+ Add Section</button>
      </div>
      <div className="space-y-2">
        {sections.map((sec, idx) => {
          const meta = SECTION_TYPES.find((t) => t.value === sec.type) || { icon: "📦", label: sec.type };
          const open = expandedIdx === idx;
          return (
            <div key={idx} className={`border rounded-lg overflow-hidden transition ${sec.visible ? "border-gaas-border" : "border-dashed border-gray-300 opacity-60"}`}>
              <button type="button" onClick={() => setExpandedIdx(open ? null : idx)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition">
                <span className="text-sm">{meta.icon}</span>
                <span className="flex-1 text-xs font-medium text-gaas-heading truncate">{sec.title || meta.label}</span>
                {!sec.visible && <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Hidden</span>}
                <span className="text-[10px] text-gaas-muted">{open ? "▼" : "▶"}</span>
              </button>
              {open && (
                <div className="p-3 pt-0 space-y-3 border-t border-gaas-border/50">
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gaas-muted">Type</label>
                      <select className="w-full rounded-lg border border-gaas-border bg-white px-2 py-1.5 text-xs" value={sec.type} onChange={(e) => updateSection(idx, { type: e.target.value })}>
                        {SECTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                      </select>
                    </div>
                    <Field label="Title" value={sec.title} onChange={(v) => updateSection(idx, { title: v })} placeholder="Section title" />
                  </div>
                  <Field label="Subtitle" value={sec.subtitle} onChange={(v) => updateSection(idx, { subtitle: v })} placeholder="Optional subtitle" />
                  <Field label="Content" value={sec.content} onChange={(v) => updateSection(idx, { content: v })} rows={4} placeholder="Section content..." />
                  <Field label="Image URL" value={sec.image} onChange={(v) => updateSection(idx, { image: v })} placeholder="https://..." />
                  {sec.image && <img src={sec.image} alt="" className="h-20 rounded-lg object-cover border border-gaas-border" onError={(e) => { e.target.style.display = "none"; }} />}

                  {(sec.type === "gallery" || sec.type === "feature_cards") && (
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gaas-muted">Items (JSON array)</label>
                      <textarea
                        className="w-full rounded-lg border border-gaas-border bg-white px-2 py-1.5 text-xs font-mono"
                        rows={3}
                        value={JSON.stringify(sec.items || [], null, 2)}
                        onChange={(e) => { try { updateSection(idx, { items: JSON.parse(e.target.value) }); } catch {} }}
                        placeholder={'[{"title":"Item","description":"Desc","image":"url"}]'}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <Toggle checked={sec.visible !== false} onChange={(v) => updateSection(idx, { visible: v })} label={sec.visible !== false ? "Visible" : "Hidden"} />
                    <div className="flex-1" />
                    <button type="button" onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="text-xs text-gaas-muted hover:text-gaas-heading disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1} className="text-xs text-gaas-muted hover:text-gaas-heading disabled:opacity-30">↓</button>
                    <button type="button" onClick={() => removeSection(idx)} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {sections.length === 0 && <p className="text-xs text-gaas-muted text-center py-4">No sections. Click "+ Add Section" above.</p>}
    </div>
  );
}

/* ── Main Module ─── */
export default function PagesModule() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PAGE);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { const { data } = await api.get("/cms/pages?all=1"); setPages(data.pages || []); }
    catch { toast("Failed to load pages", false); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openNew() { setForm({ ...EMPTY_PAGE, sections: [] }); setEditing("new"); }
  function openEdit(page) { setForm({ ...page, sections: page.sections || [] }); setEditing(page); }

  async function save() {
    if (!form.title?.trim()) { toast("Title is required", false); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.slug) payload.slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (editing === "new") { await api.post("/cms/pages", payload); toast("Page created!"); }
      else { await api.put(`/cms/pages/${editing._id}`, payload); toast("Page updated!"); }
      setEditing(null);
      await load();
    } catch (e) { toast(e?.response?.data?.error || "Save failed", false); }
    finally { setSaving(false); }
  }

  async function remove(id) {
    if (!confirm("Hide this page? It can be reactivated later.")) return;
    try { await api.delete(`/cms/pages/${id}`); toast("Page hidden"); await load(); }
    catch { toast("Failed", false); }
  }

  async function toggleVisible(page) {
    try {
      await api.put(`/cms/pages/${page._id}`, { visible: !page.visible });
      toast(page.visible ? "Page hidden" : "Page visible");
      await load();
    } catch { toast("Toggle failed", false); }
  }

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  /* ── Editor ─── */
  if (editing !== null) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-transparent p-4 border-b border-gaas-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-gaas-heading flex items-center gap-2">
            <span className="text-base">{editing === "new" ? "📄" : "✏️"}</span>
            {editing === "new" ? "Create New Page" : `Edit: ${form.title || "Page"}`}
          </h3>
          <button onClick={() => setEditing(null)} className="text-xs text-gaas-muted hover:text-gaas-heading font-medium">← Back</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Page Title" value={form.title} onChange={set("title")} placeholder="e.g. About College" />
            <Field label="URL Slug" value={form.slug} onChange={set("slug")} placeholder="auto-generated if empty" />
          </div>
          <Field label="Description" value={form.description} onChange={set("description")} rows={2} placeholder="Brief page description" />
          <Field label="Banner Image URL" value={form.bannerImage} onChange={set("bannerImage")} placeholder="https://..." />
          {form.bannerImage && (
            <div className="relative group inline-block">
              <img src={form.bannerImage} alt="" className="h-28 rounded-lg object-cover border border-gaas-border" onError={(e) => { e.target.style.display = "none"; }} />
              <button type="button" onClick={() => set("bannerImage")("")} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] opacity-0 group-hover:opacity-100 transition flex items-center justify-center">×</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sort Order" type="number" value={String(form.sortOrder || 0)} onChange={(v) => setForm((f) => ({ ...f, sortOrder: Number(v) || 0 }))} />
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">Visibility</label>
              <Toggle checked={form.visible !== false} onChange={(v) => setForm((f) => ({ ...f, visible: v }))} label={form.visible !== false ? "Public" : "Hidden"} />
            </div>
          </div>

          <div className="border-t border-gaas-border pt-4">
            <SectionEditor sections={form.sections || []} onChange={(s) => setForm((f) => ({ ...f, sections: s }))} />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving} className="btn-primary flex-1 py-2.5 text-sm font-semibold disabled:opacity-50">
              {saving ? "Saving..." : editing === "new" ? "Create Page" : "Update Page"}
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
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
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
          <h3 className="text-sm font-bold text-gaas-heading">Pages</h3>
          <p className="text-xs text-gaas-muted mt-0.5">{pages.length} page{pages.length !== 1 ? "s" : ""} · {pages.filter((p) => p.visible).length} visible</p>
        </div>
        <button onClick={openNew} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
          <span className="text-base">+</span> New Page
        </button>
      </div>

      {pages.length === 0 ? (
        <EmptyState icon="📄" title="No pages yet. Create your first dynamic page." action="+ New Page" onAction={openNew} />
      ) : (
        <div className="space-y-2">
          {pages.map((page, idx) => (
            <div key={page._id} className={`glass-card overflow-hidden transition-all hover:shadow-md ${!page.visible ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-4 p-4">
                {page.bannerImage ? (
                  <img src={page.bannerImage} alt="" className="h-16 w-24 rounded-lg object-cover shrink-0 border border-gaas-border" onError={(e) => { e.target.style.display = "none"; }} />
                ) : (
                  <div className="h-16 w-24 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center shrink-0">
                    <span className="text-xl">📄</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-bold text-sm text-gaas-heading truncate">{page.title}</h4>
                    <StatusBadge active={page.visible} activeLabel="Visible" inactiveLabel="Hidden" />
                  </div>
                  <p className="text-[11px] text-gaas-muted truncate">/{page.slug} · {(page.sections || []).length} section{(page.sections || []).length !== 1 ? "s" : ""}</p>
                  {page.description && <p className="text-xs text-gaas-muted truncate mt-0.5">{page.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Toggle checked={page.visible} onChange={() => toggleVisible(page)} />
                  <button onClick={() => openEdit(page)} className="text-xs px-3 py-1.5 rounded-lg border border-gaas-border hover:bg-gray-50 font-medium">Edit</button>
                  <button onClick={() => remove(page._id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium">Hide</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
