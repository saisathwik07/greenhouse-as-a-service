import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api";

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/cms/services")
      .then(({ data }) => setServices(data.services || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 text-gaas-muted text-sm animate-pulse">
        Loading services...
      </div>
    );
  }

  return (
    <div className="animate-in">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-card p-5 mb-6"
      >
        <h1 className="text-2xl font-bold text-gaas-heading">Our Services</h1>
        <p className="text-sm text-gaas-muted mt-1">
          Explore all the services available on the GaaS platform.
        </p>
      </motion.div>

      {services.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-gaas-muted text-sm">No services available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((svc, idx) => (
            <motion.div
              key={svc._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
              className="glass-card overflow-hidden hover:shadow-lg transition-shadow"
            >
              {svc.image ? (
                <div className="h-40 overflow-hidden">
                  <img
                    src={svc.image}
                    alt={svc.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.parentElement.style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div className="h-40 bg-gradient-to-br from-gaas-accent/20 to-emerald-50 flex items-center justify-center">
                  <span className="text-4xl">🌿</span>
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-gaas-heading text-base">
                    {svc.title}
                  </h3>
                  {svc.pricing && (
                    <span className="shrink-0 text-[11px] px-2.5 py-0.5 rounded-full bg-gaas-accent/10 text-gaas-accent font-bold whitespace-nowrap">
                      {svc.pricing}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gaas-muted mb-3 line-clamp-3">
                  {svc.description}
                </p>
                {(svc.features || []).length > 0 && (
                  <ul className="space-y-1.5">
                    {svc.features.map((feat, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-xs text-gaas-muted"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-gaas-accent shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                )}
                {svc.category && svc.category !== "general" && (
                  <span className="inline-block mt-3 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                    {svc.category}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
