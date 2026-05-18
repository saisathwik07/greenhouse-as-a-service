import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { API_URL } from "../config";

/* ── Section renderers ─── */
function HeroBanner({ section }) {
  return (
    <div className="relative min-h-[40vh] flex items-center justify-center overflow-hidden rounded-2xl mb-8">
      {section.image && <img src={section.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d2b1a]/80 to-[#1a4a2e]/60" />
      <div className="relative z-10 text-center text-white px-6 py-16">
        {section.title && <h1 className="text-4xl md:text-5xl font-bold mb-3">{section.title}</h1>}
        {section.subtitle && <p className="text-lg text-white/80">{section.subtitle}</p>}
        {section.content && <p className="mt-4 max-w-2xl mx-auto text-white/70">{section.content}</p>}
      </div>
    </div>
  );
}

function TextSection({ section }) {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {section.title && <h2 className="text-2xl font-bold text-[#1a4a2e] mb-3">{section.title}</h2>}
      {section.subtitle && <p className="text-sm text-[#5a9e3a] font-semibold uppercase tracking-wider mb-2">{section.subtitle}</p>}
      {section.content && <div className="prose prose-green max-w-none text-[#374151] whitespace-pre-wrap">{section.content}</div>}
    </div>
  );
}

function ImageSection({ section }) {
  return (
    <div className="py-10 px-4">
      {section.title && <h2 className="text-2xl font-bold text-[#1a4a2e] mb-4 text-center">{section.title}</h2>}
      {section.image && <img src={section.image} alt={section.title || ""} className="w-full max-w-4xl mx-auto rounded-2xl shadow-lg" />}
      {section.content && <p className="mt-4 text-center text-[#6B7280] max-w-2xl mx-auto">{section.content}</p>}
    </div>
  );
}

function GallerySection({ section }) {
  const items = section.items || [];
  return (
    <div className="py-10 px-4">
      {section.title && <h2 className="text-2xl font-bold text-[#1a4a2e] mb-6 text-center">{section.title}</h2>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl overflow-hidden shadow-md">
            {item.image && <img src={item.image} alt={item.title || ""} className="w-full h-48 object-cover" />}
            {item.title && <p className="p-3 text-sm font-medium text-[#1a4a2e]">{item.title}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCards({ section }) {
  const items = section.items || [];
  return (
    <div className="py-10 px-4">
      {section.title && <h2 className="text-2xl font-bold text-[#1a4a2e] mb-6 text-center">{section.title}</h2>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {items.map((item, i) => (
          <div key={i} className="rounded-2xl border border-[#1a4a2e]/10 bg-white p-6 shadow-sm hover:shadow-md transition">
            {item.image && <img src={item.image} alt="" className="h-12 w-12 rounded-xl object-cover mb-4" />}
            {item.title && <h3 className="font-bold text-[#1a4a2e] mb-2">{item.title}</h3>}
            {item.description && <p className="text-sm text-[#6B7280]">{item.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomSection({ section }) {
  return (
    <div className="py-10 px-4 max-w-4xl mx-auto">
      {section.title && <h2 className="text-2xl font-bold text-[#1a4a2e] mb-3">{section.title}</h2>}
      {section.image && <img src={section.image} alt="" className="w-full rounded-xl mb-4" />}
      {section.content && <div className="prose prose-green max-w-none whitespace-pre-wrap">{section.content}</div>}
    </div>
  );
}

const RENDERERS = {
  hero_banner: HeroBanner,
  text: TextSection,
  image: ImageSection,
  gallery: GallerySection,
  feature_cards: FeatureCards,
  custom: CustomSection,
};

export default function DynamicPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    axios
      .get(`${API_URL}/cms/pages/${slug}`)
      .then(({ data }) => setPage(data.page))
      .catch((e) => setError(e?.response?.data?.error || "Page not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#5a9e3a] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center">
        <div>
          <span className="text-5xl mb-4 block">📄</span>
          <h2 className="text-xl font-bold text-[#1a4a2e] mb-2">Page Not Found</h2>
          <p className="text-[#6B7280]">{error || "The page you're looking for doesn't exist."}</p>
        </div>
      </div>
    );
  }

  const visibleSections = (page.sections || [])
    .filter((s) => s.visible !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-[#f5fbf0]"
    >
      {page.bannerImage && !visibleSections.some((s) => s.type === "hero_banner") && (
        <div className="relative h-[30vh] overflow-hidden">
          <img src={page.bannerImage} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d2b1a]/60 to-transparent" />
          <div className="absolute bottom-8 left-8 text-white">
            <h1 className="text-3xl font-bold">{page.title}</h1>
            {page.description && <p className="mt-2 text-white/80">{page.description}</p>}
          </div>
        </div>
      )}

      <div className="container mx-auto">
        {visibleSections.map((section) => {
          const Renderer = RENDERERS[section.type] || CustomSection;
          return (
            <motion.div
              key={section._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Renderer section={section} />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
