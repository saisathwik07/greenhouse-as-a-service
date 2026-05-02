import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface ResultsProps {
  harvestImage: string;
}

interface MetricProps {
  value: number;
  suffix: string;
  label: string;
  description: string;
}

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

const metrics: MetricProps[] = [
  { value: 5, suffix: "", label: "Sensor Channels", description: "Temperature, humidity, soil moisture, pH, and EC tracked for decisions" },
  { value: 9, suffix: "", label: "Service Offers", description: "Data, AI, IoT dashboard, fertigation, pest, yield, and support modules" },
  { value: 3, suffix: "", label: "Plan Tiers", description: "Starter, Pro, and Enterprise subscription paths for different users" },
  { value: 72, suffix: "h", label: "History Window", description: "Quick 24h, 48h, and 72h data ranges for review and export" },
];

export function Results({ harvestImage }: ResultsProps) {
  return (
    <section id="results" className="py-24 bg-[#0d2b1a] text-white overflow-hidden relative">
      <div className="absolute inset-0 opacity-10">
        <img src={harvestImage} alt="" className="w-full h-full object-cover" aria-hidden="true" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d2b1a]/95 via-[#0d2b1a]/80 to-[#0d2b1a]/95" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[#a3d977] text-sm font-bold tracking-widest uppercase mb-3">Results</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              Platform Coverage
            </h3>
            <p className="text-white/70 text-lg">
              The current GaaS codebase already covers the core modules needed for a service-oriented smart greenhouse platform.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {metrics.map((metric, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.12 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center hover:bg-white/10 transition-colors"
            >
              <p className="text-5xl md:text-6xl font-bold font-serif text-[#a3d977] mb-2">
                <CountUp target={metric.value} suffix={metric.suffix} />
              </p>
              <p className="text-white font-semibold text-lg mb-2">{metric.label}</p>
              <p className="text-white/60 text-sm leading-relaxed">{metric.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-3xl overflow-hidden shadow-2xl"
        >
          <img
            src={harvestImage}
            alt="Ripe tomatoes harvested from the Smart Greenhouse"
            className="w-full h-[400px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d2b1a]/80 to-transparent" />
          <div className="absolute bottom-8 left-8 max-w-md">
            <h4 className="text-white text-2xl font-serif font-bold mb-2">Physical Greenhouse Proof</h4>
            <p className="text-white/80">
              The live greenhouse validates the services shown above: sensor monitoring, controlled irrigation, crop tracking, and data-backed agriculture decisions.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
