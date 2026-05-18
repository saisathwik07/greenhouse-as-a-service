import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import ContentModule from "./cms/ContentModule";
import ServicesModule from "./cms/ServicesModule";
import BlogModule from "./cms/BlogModule";

const CMS_TABS = [
  { id: "content", label: "Website", icon: "🌐", desc: "Manage homepage sections, images, and content" },
  { id: "services", label: "Services", icon: "⚙️", desc: "Create, edit, and control platform services" },
  { id: "blogs", label: "Blog", icon: "📰", desc: "Write, publish, and manage blog posts" },
];

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3 min-w-0">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-gaas-heading leading-tight">{value}</p>
        <p className="text-[11px] text-gaas-muted truncate">{label}{sub ? ` · ${sub}` : ""}</p>
      </div>
    </div>
  );
}

export default function AdminCMS() {
  const [tab, setTab] = useState("content");
  const [stats, setStats] = useState({ services: 0, activeServices: 0, blogs: 0, published: 0 });

  useEffect(() => {
    Promise.allSettled([
      api.get("/cms/services?all=1"),
      api.get("/cms/blogs?all=1"),
    ]).then(([svcResult, blogResult]) => {
      const svcs = svcResult.status === "fulfilled" ? svcResult.value.data.services || [] : [];
      const blogs = blogResult.status === "fulfilled" ? blogResult.value.data.blogs || [] : [];
      setStats({
        services: svcs.length,
        activeServices: svcs.filter((s) => s.activeStatus).length,
        blogs: blogs.length,
        published: blogs.filter((b) => b.status === "published").length,
      });
    });
  }, [tab]); // refresh when tab changes

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gaas-accent via-emerald-600 to-teal-700 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute right-20 bottom-2 h-16 w-16 rounded-full bg-white/5" />
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Admin Control Center</p>
          <h1 className="text-2xl font-bold tracking-tight">CMS Management</h1>
          <p className="text-sm text-white/80 mt-1">
            Full control over your website content, services, and blog — changes go live instantly.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="⚙️" label="Services" value={stats.services} sub={`${stats.activeServices} active`} />
        <StatCard icon="📰" label="Blog Posts" value={stats.blogs} sub={`${stats.published} published`} />
        <StatCard icon="🌐" label="Sections" value="6" sub="configurable" />
        <StatCard icon="🎛️" label="Controls" value="Live" sub="real-time" />
      </div>

      {/* Tab Navigation */}
      <div className="glass-card p-1.5 flex gap-1">
        {CMS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === t.id
                ? "bg-gaas-accent text-white shadow-sm"
                : "text-gaas-muted hover:text-gaas-heading hover:bg-gray-50"
            }`}
          >
            <span className="text-base">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Module description */}
      <div className="flex items-center gap-3 px-1">
        <div className="h-1 w-8 rounded-full bg-gaas-accent" />
        <p className="text-xs text-gaas-muted font-medium">
          {CMS_TABS.find((t) => t.id === tab)?.desc}
        </p>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "content" && <ContentModule />}
          {tab === "services" && <ServicesModule />}
          {tab === "blogs" && <BlogModule />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
