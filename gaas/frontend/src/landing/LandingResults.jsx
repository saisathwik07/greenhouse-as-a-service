import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

function CountUp({ target, suffix }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

const metrics = [
  {
    value: 5,
    suffix: "",
    label: "Sensor Channels",
    description: "Temperature, humidity, soil moisture, pH, and EC tracked for decisions"
  },
  {
    value: 9,
    suffix: "",
    label: "Service Offers",
    description: "Data, AI, IoT dashboard, fertigation, pest, yield, and support modules"
  },
  {
    value: 3,
    suffix: "",
    label: "Plan Tiers",
    description: "Starter, Pro, and Enterprise subscription paths for different users"
  },
  {
    value: 72,
    suffix: "h",
    label: "History Window",
    description: "Quick 24h, 48h, and 72h data ranges for review and export"
  }
];

export default function LandingResults({ harvestImage }) {
  return (
    <section id="results" className="relative overflow-hidden bg-[#0d2b1a] py-24 text-white">
      <div className="absolute inset-0 opacity-10">
        <img src={harvestImage} alt="" className="h-full w-full object-cover" aria-hidden />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d2b1a]/95 via-[#0d2b1a]/80 to-[#0d2b1a]/95" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#a3d977]">Results</h2>
            <h3 className="mb-6 font-serif text-4xl font-bold md:text-5xl">Platform Coverage</h3>
            <p className="text-lg text-white/70">
              The current GaaS codebase already covers the core modules needed for a service-oriented smart greenhouse
              platform.
            </p>
          </motion.div>
        </div>

        <div className="mb-20 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, idx) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.12 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md transition-colors hover:bg-white/10"
            >
              <p className="mb-2 font-serif text-5xl font-bold text-[#a3d977] md:text-6xl">
                <CountUp target={metric.value} suffix={metric.suffix} />
              </p>
              <p className="mb-2 text-lg font-semibold text-white">{metric.label}</p>
              <p className="text-sm leading-relaxed text-white/60">{metric.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-3xl shadow-2xl"
        >
          <img
            src={harvestImage}
            alt="Ripe tomatoes harvested from the Smart Greenhouse"
            className="h-[400px] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d2b1a]/80 to-transparent" />
          <div className="absolute bottom-8 left-8 max-w-md">
            <h4 className="mb-2 font-serif text-2xl font-bold text-white">Physical Greenhouse Proof</h4>
            <p className="text-white/80">
              The live greenhouse validates the services shown above: sensor monitoring, controlled irrigation, crop
              tracking, and data-backed agriculture decisions.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
