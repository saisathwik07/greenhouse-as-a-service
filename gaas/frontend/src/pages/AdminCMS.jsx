import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";

const CMS_TABS = [
  { id: "content", label: "Website Content" },
  { id: "services", label: "Services" },
  { id: "blogs", label: "Blog" },
];

/* ─── helpers ─────────────────────────────────────────────────────────── */

function toast(msg, ok = true) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.className = `fixed top-4 right-4 z-[9999] rounded-lg px-5 py-3 text-sm font-semibold shadow-lg transition-all ${
    ok
      ? "bg-emerald-600 text-white"
      : "bg-red-600 text-white"
  }`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function Field({ label, value, onChange, type = "text", rows, placeholder }) {
  const cls =
    "w-full rounded-lg border border-gaas-border bg-white px-3 py-2 text-sm focus:border-gaas-accent focus:outline-none";
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">
        {label}
      </label>
      {rows ? (
        <textarea
          className={cls}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={cls}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

/* ─── Website Content tab ─────────────────────────────────────────────── */

function ContentTab() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/cms/content")
      .then(({ data }) => setForm(data))
      .catch(() => toast("Failed to load content", false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.put("/cms/content", form);
      setForm(data.content);
      toast("Website content saved!");
    } catch {
      toast("Save failed", false);
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return <p className="text-sm text-gaas-muted py-6 text-center">Loading content...</p>;
  }

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">
          Hero Section
        </h3>
        <Field label="Title" value={form.heroTitle || ""} onChange={set("heroTitle")} />
        <Field label="Subtitle" value={form.heroSubtitle || ""} onChange={set("heroSubtitle")} />
        <Field
          label="Description"
          value={form.heroDescription || ""}
          onChange={set("heroDescription")}
          rows={3}
        />
      </div>

      {/* About */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">
          About Section
        </h3>
        <Field label="Title" value={form.aboutTitle || ""} onChange={set("aboutTitle")} />
        <Field
          label="Description"
          value={form.aboutDescription || ""}
          onChange={set("aboutDescription")}
          rows={4}
        />
      </div>

      {/* Contact */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">
          Contact Information
        </h3>
        <Field label="Email" value={form.contactEmail || ""} onChange={set("contactEmail")} />
        <Field label="Phone" value={form.contactPhone || ""} onChange={set("contactPhone")} />
        <Field
          label="Address"
          value={form.contactAddress || ""}
          onChange={set("contactAddress")}
          rows={2}
        />
      </div>

      {/* Footer + Testimonials */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">
          Misc
        </h3>
        <Field
          label="Testimonials Title"
          value={form.testimonialsTitle || ""}
          onChange={set("testimonialsTitle")}
        />
        <Field label="Footer Text" value={form.footerText || ""} onChange={set("footerText")} />
      </div>

      {/* Homepage Images */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">
          Homepage Images (URL list)
        </h3>
        <p className="text-xs text-gaas-muted">
          Paste one image URL per line.
        </p>
        <textarea
          className="w-full rounded-lg border border-gaas-border bg-white px-3 py-2 text-sm focus:border-gaas-accent focus:outline-none"
          rows={5}
          value={(form.homepageImages || []).join("\n")}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              homepageImages: e.target.value
                .split("\n")
                .map((u) => u.trim())
                .filter(Boolean),
            }))
          }
          placeholder="https://example.com/image1.jpg"
        />
        {(form.homepageImages || []).length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {form.homepageImages.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`preview ${i}`}
                className="h-20 w-20 rounded-lg object-cover border border-gaas-border"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="btn-primary w-full py-2.5 text-sm font-semibold rounded-lg bg-gaas-accent text-white hover:bg-gaas-accent/90 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Content"}
      </button>
    </div>
  );
}

/* ─── Services tab ────────────────────────────────────────────────────── */

const EMPTY_SERVICE = {
  title: "",
  description: "",
  pricing: "",
  features: [],
  image: "",
  category: "general",
  activeStatus: true,
  sortOrder: 0,
};

function ServicesTab() {
  const [services, setServices] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | service obj
  const [form, setForm] = useState(EMPTY_SERVICE);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const { data } = await api.get("/cms/services?all=1");
      setServices(data.services || []);
    } catch {
      toast("Failed to load services", false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm(EMPTY_SERVICE);
    setEditing("new");
  }

  function openEdit(svc) {
    setForm({ ...svc, features: svc.features || [] });
    setEditing(svc);
  }

  async function save() {
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
      await api.put(`/cms/services/${svc._id}`, {
        activeStatus: !svc.activeStatus,
      });
      toast(svc.activeStatus ? "Service disabled" : "Service enabled");
      await load();
    } catch {
      toast("Toggle failed", false);
    }
  }

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  if (editing !== null) {
    return (
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">
            {editing === "new" ? "Add Service" : "Edit Service"}
          </h3>
          <button
            onClick={() => setEditing(null)}
            className="text-sm text-gaas-muted hover:text-gaas-heading"
          >
            ← Back
          </button>
        </div>
        <Field label="Title" value={form.title} onChange={set("title")} placeholder="Service title" />
        <Field label="Description" value={form.description} onChange={set("description")} rows={3} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Pricing" value={form.pricing} onChange={set("pricing")} placeholder="e.g. ₹49/mo" />
          <Field label="Category" value={form.category} onChange={set("category")} placeholder="general" />
        </div>
        <Field label="Image URL" value={form.image} onChange={set("image")} placeholder="https://..." />
        {form.image && (
          <img
            src={form.image}
            alt="preview"
            className="h-24 rounded-lg object-cover border border-gaas-border"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">
            Features (one per line)
          </label>
          <textarea
            className="w-full rounded-lg border border-gaas-border bg-white px-3 py-2 text-sm focus:border-gaas-accent focus:outline-none"
            rows={4}
            value={(form.features || []).join("\n")}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                features: e.target.value.split("\n").filter((s) => s.trim()),
              }))
            }
            placeholder="Feature 1&#10;Feature 2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Sort Order"
            type="number"
            value={String(form.sortOrder || 0)}
            onChange={(v) => setForm((f) => ({ ...f, sortOrder: Number(v) || 0 }))}
          />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">
              Status
            </label>
            <select
              className="w-full rounded-lg border border-gaas-border bg-white px-3 py-2 text-sm"
              value={form.activeStatus ? "active" : "inactive"}
              onChange={(e) =>
                setForm((f) => ({ ...f, activeStatus: e.target.value === "active" }))
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary w-full py-2.5 text-sm font-semibold rounded-lg bg-gaas-accent text-white hover:bg-gaas-accent/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : editing === "new" ? "Create Service" : "Update Service"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">
          All Services ({services.length})
        </h3>
        <button
          onClick={openNew}
          className="rounded-lg bg-gaas-accent px-4 py-2 text-sm font-semibold text-white hover:bg-gaas-accent/90"
        >
          + Add Service
        </button>
      </div>

      {services.length === 0 && (
        <p className="text-sm text-gaas-muted text-center py-8">
          No services yet. Click "Add Service" to create one.
        </p>
      )}

      <div className="space-y-2">
        {services.map((svc) => (
          <div
            key={svc._id}
            className={`glass-card p-4 flex items-center gap-4 ${
              !svc.activeStatus ? "opacity-60" : ""
            }`}
          >
            {svc.image && (
              <img
                src={svc.image}
                alt=""
                className="h-12 w-12 rounded-lg object-cover shrink-0"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gaas-heading text-sm truncate">
                {svc.title}
              </p>
              <p className="text-xs text-gaas-muted truncate">{svc.description}</p>
              <div className="flex gap-2 mt-1">
                {svc.pricing && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                    {svc.pricing}
                  </span>
                )}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    svc.activeStatus
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {svc.activeStatus ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => toggleActive(svc)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gaas-border hover:bg-gray-50"
                title={svc.activeStatus ? "Disable" : "Enable"}
              >
                {svc.activeStatus ? "Disable" : "Enable"}
              </button>
              <button
                onClick={() => openEdit(svc)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gaas-border hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={() => remove(svc._id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Blog tab ────────────────────────────────────────────────────────── */

const EMPTY_BLOG = {
  title: "",
  content: "",
  thumbnail: "",
  author: "Admin",
  publishDate: new Date().toISOString().slice(0, 10),
  category: "general",
  tags: [],
  status: "draft",
};

function BlogTab() {
  const [blogs, setBlogs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_BLOG);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const { data } = await api.get("/cms/blogs?all=1");
      setBlogs(data.blogs || []);
    } catch {
      toast("Failed to load blogs", false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm({
      ...EMPTY_BLOG,
      publishDate: new Date().toISOString().slice(0, 10),
    });
    setEditing("new");
  }

  function openEdit(blog) {
    setForm({
      ...blog,
      tags: blog.tags || [],
      publishDate: blog.publishDate
        ? new Date(blog.publishDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    setEditing(blog);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing === "new") {
        await api.post("/cms/blogs", payload);
        toast("Blog created!");
      } else {
        await api.put(`/cms/blogs/${editing._id}`, payload);
        toast("Blog updated!");
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
    if (!confirm("Delete this blog post?")) return;
    try {
      await api.delete(`/cms/blogs/${id}`);
      toast("Blog deleted!");
      await load();
    } catch {
      toast("Delete failed", false);
    }
  }

  async function toggleStatus(blog) {
    const newStatus = blog.status === "published" ? "draft" : "published";
    try {
      await api.put(`/cms/blogs/${blog._id}`, { status: newStatus });
      toast(newStatus === "published" ? "Blog published!" : "Blog unpublished");
      await load();
    } catch {
      toast("Status change failed", false);
    }
  }

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  if (editing !== null) {
    return (
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">
            {editing === "new" ? "New Blog Post" : "Edit Blog Post"}
          </h3>
          <button
            onClick={() => setEditing(null)}
            className="text-sm text-gaas-muted hover:text-gaas-heading"
          >
            ← Back
          </button>
        </div>
        <Field label="Title" value={form.title} onChange={set("title")} placeholder="Post title" />
        <Field
          label="Content"
          value={form.content}
          onChange={set("content")}
          rows={10}
          placeholder="Write your blog content here..."
        />
        <Field
          label="Thumbnail URL"
          value={form.thumbnail}
          onChange={set("thumbnail")}
          placeholder="https://..."
        />
        {form.thumbnail && (
          <img
            src={form.thumbnail}
            alt="preview"
            className="h-24 rounded-lg object-cover border border-gaas-border"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Author" value={form.author} onChange={set("author")} />
          <Field
            label="Publish Date"
            type="date"
            value={form.publishDate}
            onChange={set("publishDate")}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" value={form.category} onChange={set("category")} />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">
              Status
            </label>
            <select
              className="w-full rounded-lg border border-gaas-border bg-white px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">
            Tags (comma-separated)
          </label>
          <input
            className="w-full rounded-lg border border-gaas-border bg-white px-3 py-2 text-sm focus:border-gaas-accent focus:outline-none"
            value={(form.tags || []).join(", ")}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              }))
            }
            placeholder="agriculture, IoT, research"
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary w-full py-2.5 text-sm font-semibold rounded-lg bg-gaas-accent text-white hover:bg-gaas-accent/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : editing === "new" ? "Create Post" : "Update Post"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">
          All Blog Posts ({blogs.length})
        </h3>
        <button
          onClick={openNew}
          className="rounded-lg bg-gaas-accent px-4 py-2 text-sm font-semibold text-white hover:bg-gaas-accent/90"
        >
          + New Post
        </button>
      </div>

      {blogs.length === 0 && (
        <p className="text-sm text-gaas-muted text-center py-8">
          No blog posts yet. Click "New Post" to write one.
        </p>
      )}

      <div className="space-y-2">
        {blogs.map((blog) => (
          <div
            key={blog._id}
            className={`glass-card p-4 flex items-center gap-4 ${
              blog.status === "draft" ? "opacity-70" : ""
            }`}
          >
            {blog.thumbnail && (
              <img
                src={blog.thumbnail}
                alt=""
                className="h-12 w-12 rounded-lg object-cover shrink-0"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gaas-heading text-sm truncate">
                {blog.title}
              </p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className="text-[10px] text-gaas-muted">
                  By {blog.author} ·{" "}
                  {blog.publishDate
                    ? new Date(blog.publishDate).toLocaleDateString()
                    : "—"}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    blog.status === "published"
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {blog.status}
                </span>
                {(blog.tags || []).slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => toggleStatus(blog)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gaas-border hover:bg-gray-50"
              >
                {blog.status === "published" ? "Unpublish" : "Publish"}
              </button>
              <button
                onClick={() => openEdit(blog)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gaas-border hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={() => remove(blog._id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main CMS page ───────────────────────────────────────────────────── */

export default function AdminCMS() {
  const [tab, setTab] = useState("content");

  return (
    <div className="space-y-5 animate-in">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-card p-5"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gaas-accent">
            Content Management
          </p>
          <h1 className="text-2xl font-bold text-gaas-heading">CMS Panel</h1>
          <p className="text-sm text-gaas-muted mt-0.5">
            Manage website content, services, and blog posts without touching code.
          </p>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto">
          {CMS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                tab === t.id
                  ? "bg-gaas-accent text-white"
                  : "bg-white text-gaas-muted hover:text-gaas-heading border border-gaas-border"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {tab === "content" && <ContentTab />}
          {tab === "services" && <ServicesTab />}
          {tab === "blogs" && <BlogTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
