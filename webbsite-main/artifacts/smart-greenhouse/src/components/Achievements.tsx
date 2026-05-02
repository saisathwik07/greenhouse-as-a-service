import { motion } from "framer-motion";
import { Award, Building2, Microscope, Leaf } from "lucide-react";

const achievements = [
  {
    icon: Building2,
    title: "Built at KITSW Innovation Ecosystem",
    desc: "Developed within KITSW's 65-acre autonomous campus — a hub of engineering innovation since 1980, fostering real-world research projects.",
    badge: "Institutional Excellence",
  },
  {
    icon: Microscope,
    title: "Real-World Greenhouse Implementation",
    desc: "Not a simulation. A fully operational smart greenhouse with physical sensors, drip irrigation, and live data telemetry — deployed and tested over multiple grow cycles.",
    badge: "Deployed & Operational",
  },
  {
    icon: Award,
    title: "Full-Stack GaaS Platform",
    desc: "The project includes a React frontend, Express backend, MongoDB models, MQTT ingestion, Flask AI endpoints, Razorpay subscription flow, and support ticketing.",
    badge: "Service Ready",
  },
  {
    icon: Leaf,
    title: "Sustainable Agriculture Experimentation",
    desc: "Successfully demonstrating that IoT-enabled controlled-environment agriculture can dramatically reduce water consumption while increasing crop output.",
    badge: "Proven Results",
  },
];

export function Achievements() {
  return (
    <section className="py-24 bg-[#f5fbf0] overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[#5a9e3a] text-sm font-bold tracking-widest uppercase mb-3">Milestones</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
              Achievements
            </h3>
            <p className="text-muted-foreground text-lg">
              Every milestone connects the real greenhouse deployment with the software services needed to operate it as a scalable GaaS product.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {achievements.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.12 }}
                className="bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-[#5a9e3a]/30 transition-all group"
              >
                <div className="flex items-start gap-5">
                  <div className="h-14 w-14 shrink-0 rounded-2xl bg-[#1a4a2e]/10 group-hover:bg-[#1a4a2e]/15 flex items-center justify-center transition-colors">
                    <Icon className="h-7 w-7 text-[#1a4a2e]" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block mb-3">
                      <span className="text-xs font-bold tracking-wider uppercase text-[#5a9e3a] bg-[#5a9e3a]/10 px-3 py-1 rounded-full">
                        {item.badge}
                      </span>
                    </div>
                    <h4 className="text-xl font-bold font-serif text-primary mb-3">{item.title}</h4>
                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
