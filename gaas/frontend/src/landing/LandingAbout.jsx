import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function LandingAbout({ signboardImage }) {
  const goals = [
    "Deliver live greenhouse data as a service",
    "Recommend crops, fertilizer, and yield forecasts",
    "Enable MQTT-based remote monitoring",
    "Support students, faculty, and researchers",
    "Promote scalable sustainable agriculture"
  ];

  return (
    <section id="about" className="relative overflow-hidden bg-background py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 z-0 -rotate-3 scale-105 rounded-3xl bg-primary/5" />
            <div className="relative z-10 overflow-hidden rounded-3xl border border-border shadow-2xl">
              <img
                src={signboardImage}
                alt="KITSW CSE(IoT) Smart Green House Signboard"
                className="h-auto w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-60" />
            </div>

            <div className="absolute -bottom-8 -right-8 z-20 max-w-[250px] rounded-2xl border border-border bg-card p-6 shadow-xl">
              <p className="font-serif text-xl font-medium italic text-primary">
                &quot;Where computing meets cultivation.&quot;
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-accent">About GaaS</h2>
            <h3 className="mb-6 font-serif text-4xl font-bold text-primary md:text-5xl">
              From Greenhouse Prototype to Service Platform
            </h3>

            <div className="mb-8 max-w-none space-y-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              <p>
                Greenhouse as a Service (GaaS) extends the KITSW CSE(IoT) smart greenhouse into a
                production-oriented platform for growers, students, faculty, and research teams. It
                connects field sensors, dashboards, AI models, subscriptions, and support into one
                service flow.
              </p>
              <p>
                The website now reflects both sides of the work: the physical greenhouse implementation
                and the software services built around live data, crop intelligence, fertigation, and
                research-ready exports.
              </p>
            </div>

            <div className="mb-10 space-y-4">
              <h4 className="font-serif text-xl font-semibold text-primary">Platform Goals</h4>
              <ul className="grid gap-3 sm:grid-cols-2">
                {goals.map((goal, idx) => (
                  <motion.li
                    key={goal}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                    <span>{goal}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
