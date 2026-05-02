import { motion } from "framer-motion";
import { Droplet, EyeOff, CloudRain, TrendingDown, LayoutList } from "lucide-react";

const problems = [
  {
    icon: Droplet,
    title: "Water Wastage",
    description:
      "Traditional irrigation often results in overwatering, depleting precious resources."
  },
  {
    icon: EyeOff,
    title: "Manual Monitoring",
    description:
      "Farmers lack real-time visibility into soil and crop health without physical inspection."
  },
  {
    icon: CloudRain,
    title: "Climate Dependency",
    description: "Open-field agriculture is highly vulnerable to unpredictable weather patterns."
  },
  {
    icon: TrendingDown,
    title: "Low Efficiency",
    description:
      "Resource distribution isn't optimized for specific plant needs, lowering yields."
  },
  {
    icon: LayoutList,
    title: "Poor Crop Tracking",
    description:
      "Lack of historical data makes it difficult to improve farming practices over time."
  }
];

function problemItemClass(idx) {
  const base =
    "flex h-full flex-col rounded-2xl border border-white/15 bg-white/[0.07] p-8 text-left shadow-sm backdrop-blur-sm transition-colors hover:bg-white/[0.12]";
  if (idx < 3) return `${base} md:col-span-1 lg:col-span-2`;
  if (idx === 3) return `${base} md:col-span-1 lg:col-span-2 lg:col-start-2`;
  return `${base} md:col-span-1 lg:col-span-2 lg:col-start-4`;
}

export default function LandingProblem() {
  return (
    <section className="relative bg-primary py-24 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent opacity-5" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="relative z-10 mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-accent">
              The Challenge
            </h2>
            <h3 className="mb-6 font-serif text-4xl font-bold text-white md:text-5xl">
              Why Traditional Farming Needs an Upgrade
            </h3>
            <p className="text-lg text-white/80">
              Agriculture is the backbone of society, but traditional methods are struggling to keep up
              with modern resource constraints and climate realities.
            </p>
          </motion.div>
        </div>

        {/* 6-col on lg: row1 = three cards; row2 = two cards centered (no empty middle column) */}
        <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-6">
          {problems.map((problem, idx) => {
            const Icon = problem.icon;
            return (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.06 }}
                className={problemItemClass(idx)}
              >
                <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/25">
                  <Icon className="h-6 w-6 text-accent" aria-hidden />
                </div>
                <h4 className="mb-3 font-serif text-xl font-semibold leading-snug text-white">
                  {problem.title}
                </h4>
                <p className="flex-1 font-sans text-sm leading-relaxed text-white/85 sm:text-[15px]">
                  {problem.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
