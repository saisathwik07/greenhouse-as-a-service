import { useEffect, useState } from "react";
import { api } from "../../api";
import { toast, Field, EmptyState, StatusBadge, Toggle } from "./cmsUtils";

const EMPTY_BLOG = {
  title: "", content: "", thumbnail: "", author: "Admin",
  publishDate: new Date().toISOString().slice(0, 10),
  category: "general", tags: [], status: "draft",
};

export default function BlogModule() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_BLOG);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/cms/blogs?all=1");
      setBlogs(data.blogs || []);
    } catch {
      toast("Failed to load blogs", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setForm({ ...EMPTY_BLOG, publishDate: new Date().toISOString().slice(0, 10) });
    setEditing("new");
  }

  function openEdit(blog) {
    setForm({
      ...blog, tags: blog.tags || [],
      publishDate: blog.publishDate ? new Date(blog.publishDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
    setEditing(blog);
  }

  async function save() {
    if (!form.title?.trim()) { toast("Title is required", false); return; }
    setSaving(true);
    try {
      if (editing === "new") {
        await api.post("/cms/blogs", form);
        toast("Blog created!");
      } else {
        await api.put(`/cms/blogs/${editing._id}`, form);
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

  /* ── Editor ─── */
  if (editing !== null) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-transparent p-4 border-b border-gaas-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-gaas-heading flex items-center gap-2">
            <span className="text-base">{editing === "new" ? "📝" : "✏️"}</span>
            {editing === "new" ? "New Blog Post" : "Edit Blog Post"}
          </h3>
          <button onClick={() => setEditing(null)} className="text-xs text-gaas-muted hover:text-gaas-heading font-medium">← Back</button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Title" value={form.title} onChange={set("title")} placeholder="Post title" />
          <Field label="Content" value={form.content} onChange={set("content")} rows={10} placeholder="Write your blog content here..." />
          <Field label="Thumbnail URL" value={form.thumbnail} onChange={set("thumbnail")} placeholder="https://..." />
          {form.thumbnail && (
            <img src={form.thumbnail} alt="preview" className="h-28 rounded-lg object-cover border border-gaas-border" onError={(e) => { e.target.style.display = "none"; }} />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Author" value={form.author} onChange={set("author")} />
            <Field label="Publish Date" type="date" value={form.publishDate} onChange={set("publishDate")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" value={form.category} onChange={set("category")} />
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">Status</label>
              <select
                className="w-full rounded-lg border border-gaas-border bg-white px-3 py-2 text-sm focus:border-gaas-accent focus:outline-none"
                value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">Tags (comma-separated)</label>
            <input
              className="w-full rounded-lg border border-gaas-border bg-white px-3 py-2 text-sm focus:border-gaas-accent focus:outline-none"
              value={(form.tags || []).join(", ")}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) }))}
              placeholder="agriculture, IoT, research"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving} className="btn-primary flex-1 py-2.5 text-sm font-semibold disabled:opacity-50">
              {saving ? "Saving..." : editing === "new" ? "Create Post" : "Update Post"}
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
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg mb-3" />
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  /* ── List ─── */
  const published = blogs.filter((b) => b.status === "published").length;
  const drafts = blogs.length - published;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gaas-heading">Blog Posts</h3>
          <p className="text-xs text-gaas-muted mt-0.5">
            {blogs.length} total · {published} published · {drafts} draft{drafts !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={openNew} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
          <span className="text-base">+</span> New Post
        </button>
      </div>

      {blogs.length === 0 ? (
        <EmptyState icon="📝" title="No blog posts yet. Write your first blog post." action="+ New Post" onAction={openNew} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
            <div key={blog._id} className={`glass-card overflow-hidden transition-all hover:shadow-md ${blog.status === "draft" ? "opacity-75" : ""}`}>
              {blog.thumbnail ? (
                <div className="h-36 overflow-hidden bg-gray-100">
                  <img src={blog.thumbnail} alt="" className="h-full w-full object-cover" onError={(e) => { e.target.parentElement.innerHTML = '<div class="h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 text-3xl">📝</div>'; }} />
                </div>
              ) : (
                <div className="h-24 bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-bold text-sm text-gaas-heading leading-tight line-clamp-2">{blog.title}</h4>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <StatusBadge active={blog.status === "published"} activeLabel="Published" inactiveLabel="Draft" />
                  <span className="text-[10px] text-gaas-muted">
                    {blog.author} · {blog.publishDate ? new Date(blog.publishDate).toLocaleDateString() : "—"}
                  </span>
                </div>
                {(blog.tags || []).length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {blog.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{tag}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gaas-muted line-clamp-2 mb-3">{blog.content?.slice(0, 100)}</p>
                <div className="flex items-center gap-2 pt-2 border-t border-gaas-border/50">
                  <Toggle checked={blog.status === "published"} onChange={() => toggleStatus(blog)} label="" />
                  <div className="flex-1" />
                  <button onClick={() => openEdit(blog)} className="text-xs px-3 py-1.5 rounded-lg border border-gaas-border hover:bg-gray-50 font-medium">Edit</button>
                  <button onClick={() => remove(blog._id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
