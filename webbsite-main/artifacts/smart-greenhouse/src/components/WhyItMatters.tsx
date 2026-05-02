import { motion } from "framer-motion";
import { Sprout, Globe, Cpu, Telescope } from "lucide-react";

const pillars = [
  {
    icon: Sprout,
    title: "Service-Based Smart Agriculture",
    desc: "GaaS turns greenhouse infrastructure into usable services: monitoring, recommendations, predictions, downloads, and guided crop decisions.",
    color: "#1a4a2e",
  },
  {
    icon: Globe,
    title: "Food Sustainability",
    desc: "As global populations grow, precision agriculture is no longer optional. This project demonstrates that technology can make food systems more resilient.",
    color: "#2d7a4a",
  },
  {
    icon: Cpu,
    title: "IoT + AI Integration",
    desc: "MQTT telemetry, live dashboards, Express APIs, MongoDB storage, and Flask ML endpoints work together instead of staying as separate experiments.",
    color: "#3d9960",
  },
  {
    icon: Telescope,
    title: "Future Farming Solutions",
    desc: "What started as an academic lab is a blueprint. The systems here can be scaled, replicated, and commercialized for farms across India and beyond.",
    color: "#5a9e3a",
  },
];

export function WhyItMatters() {
  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[#5a9e3a] text-sm font-bold tracking-widest uppercase mb-3">Impact</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
              Why This Project Matters
            </h3>
            <p className="text-muted-foreground text-lg">
              The Smart Greenhouse is not just an experiment. It is a blueprint for delivering agriculture intelligence as an accessible digital service.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.12 }}
                className="group flex gap-6 bg-card border border-border rounded-2xl p-8 hover:shadow-lg hover:border-[#5a9e3a]/30 transition-all"
              >
                <div
                  className="h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${pillar.color}15` }}
                >
                  <Icon className="h-7 w-7" style={{ color: pillar.color }} />
                </div>
                <div>
                  <h4 className="text-xl font-bold font-serif text-primary mb-3">{pillar.title}</h4>
                  <p className="text-muted-foreground leading-relaxed">{pillar.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
