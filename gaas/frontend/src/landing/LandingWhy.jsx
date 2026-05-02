import { motion } from "framer-motion";
import { Sprout, Globe, Cpu, Telescope } from "lucide-react";

const pillars = [
  {
    icon: Sprout,
    title: "Service-Based Smart Agriculture",
    desc: "GaaS turns greenhouse infrastructure into usable services: monitoring, recommendations, predictions, downloads, and guided crop decisions.",
    color: "#1a4a2e"
  },
  {
    icon: Globe,
    title: "Food Sustainability",
    desc: "As global populations grow, precision agriculture is no longer optional. This project demonstrates that technology can make food systems more resilient.",
    color: "#2d7a4a"
  },
  {
    icon: Cpu,
    title: "IoT + AI Integration",
    desc: "MQTT telemetry, live dashboards, Express APIs, MongoDB storage, and Flask ML endpoints work together instead of staying as separate experiments.",
    color: "#3d9960"
  },
  {
    icon: Telescope,
    title: "Future Farming Solutions",
    desc: "What started as an academic lab is a blueprint. The systems here can be scaled, replicated, and commercialized for farms across India and beyond.",
    color: "#5a9e3a"
  }
];

export default function LandingWhy() {
  return (
    <section className="overflow-hidden bg-background py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#5a9e3a]">Impact</h2>
            <h3 className="mb-6 font-serif text-4xl font-bold text-primary md:text-5xl">
              Why This Project Matters
            </h3>
            <p className="text-lg text-muted-foreground">
              The Smart Greenhouse is not just an experiment. It is a blueprint for delivering agriculture intelligence as
              an accessible digital service.
            </p>
          </motion.div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.12 }}
                className="group flex gap-6 rounded-2xl border border-border bg-card p-8 transition-all hover:border-[#5a9e3a]/30 hover:shadow-lg"
              >
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${pillar.color}15` }}
                >
                  <Icon className="h-7 w-7" style={{ color: pillar.color }} />
                </div>
                <div>
                  <h4 className="mb-3 font-serif text-xl font-bold text-primary">{pillar.title}</h4>
                  <p className="leading-relaxed text-muted-foreground">{pillar.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
