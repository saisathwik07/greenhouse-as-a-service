import { motion } from "framer-motion";
import { Award, Building2, Microscope, Leaf } from "lucide-react";

const achievements = [
  {
    icon: Building2,
    title: "Built at KITSW Innovation Ecosystem",
    desc: "Developed within KITSW's 65-acre autonomous campus — a hub of engineering innovation since 1980, fostering real-world research projects.",
    badge: "Institutional Excellence"
  },
  {
    icon: Microscope,
    title: "Real-World Greenhouse Implementation",
    desc: "Not a simulation. A fully operational smart greenhouse with physical sensors, drip irrigation, and live data telemetry — deployed and tested over multiple grow cycles.",
    badge: "Deployed & Operational"
  },
  {
    icon: Award,
    title: "Full-Stack GaaS Platform",
    desc: "The project includes a React frontend, Express backend, MongoDB models, MQTT ingestion, Flask AI endpoints, Razorpay subscription flow, and support ticketing.",
    badge: "Service Ready"
  },
  {
    icon: Leaf,
    title: "Sustainable Agriculture Experimentation",
    desc: "Successfully demonstrating that IoT-enabled controlled-environment agriculture can dramatically reduce water consumption while increasing crop output.",
    badge: "Proven Results"
  }
];

export default function LandingAchievements() {
  return (
    <section className="overflow-hidden bg-[#f5fbf0] py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#5a9e3a]">Milestones</h2>
            <h3 className="mb-6 font-serif text-4xl font-bold text-primary md:text-5xl">Achievements</h3>
            <p className="text-lg text-muted-foreground">
              Every milestone connects the real greenhouse deployment with the software services needed to operate it as
              a scalable GaaS product.
            </p>
          </motion.div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {achievements.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.12 }}
                className="group rounded-2xl border border-border bg-card p-8 transition-all hover:border-[#5a9e3a]/30 hover:shadow-xl"
              >
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1a4a2e]/10 transition-colors group-hover:bg-[#1a4a2e]/15">
                    <Icon className="h-7 w-7 text-[#1a4a2e]" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-3 inline-block">
                      <span className="rounded-full bg-[#5a9e3a]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#5a9e3a]">
                        {item.badge}
                      </span>
                    </div>
                    <h4 className="mb-3 font-serif text-xl font-bold text-primary">{item.title}</h4>
                    <p className="leading-relaxed text-muted-foreground">{item.desc}</p>
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
