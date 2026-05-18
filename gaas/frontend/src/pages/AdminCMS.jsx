import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ContentModule from "./cms/ContentModule";
import ServicesModule from "./cms/ServicesModule";
import BlogModule from "./cms/BlogModule";

const CMS_TABS = [
  { id: "content", label: "Website Content", icon: "🌐", desc: "Hero, About, Contact, Footer" },
  { id: "services", label: "Services", icon: "⚙️", desc: "Manage platform services" },
  { id: "blogs", label: "Blog", icon: "📰", desc: "Blog posts & articles" },
];

export default function AdminCMS() {
  const [tab, setTab] = useState("content");

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gaas-accent via-emerald-600 to-teal-700 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Admin Control Center</p>
          <h1 className="text-2xl font-bold tracking-tight">CMS Management</h1>
          <p className="text-sm text-white/80 mt-1">
            Manage website content, services, and blog posts — all changes go live instantly.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="glass-card p-1.5 flex gap-1">
        {CMS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
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

      {/* Active module description */}
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
