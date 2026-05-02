import { motion } from "framer-motion";

const stages = [
  {
    label: "Seed & Soil Prep",
    desc: "Grow bags filled with the right growing medium. Seeds sown with care.",
    progress: 25
  },
  {
    label: "Early Seedling",
    desc: "First sprouts emerge. Irrigation begins at precise intervals.",
    progress: 50
  },
  {
    label: "Active Growth",
    desc: "Plants growing strong under controlled temperature and humidity.",
    progress: 75
  },
  {
    label: "Mature Crop",
    desc: "Full canopy reached. Harvest-ready plants with optimal nutrition.",
    progress: 100
  }
];

export default function LandingCropGrowth({ plantingCloseImage, plantingPairImage, plantGrowthImage }) {
  return (
    <section id="crop-growth" className="overflow-hidden bg-[#f5fbf0] py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#5a9e3a]">Crop Journey</h2>
            <h3 className="mb-6 font-serif text-4xl font-bold text-primary md:text-5xl">From Seed to Harvest</h3>
            <p className="text-lg text-muted-foreground">
              Watch the lifecycle of our greenhouse crops — every stage tracked, optimized, and nurtured by intelligent
              systems.
            </p>
          </motion.div>
        </div>

        <div className="mb-16 grid items-start gap-16 lg:grid-cols-2">
          <div className="space-y-8">
            {stages.map((stage, idx) => (
              <motion.div
                key={stage.label}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.12 }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-serif text-lg font-bold text-primary">{stage.label}</h4>
                  <span className="text-sm font-bold text-[#5a9e3a]">{stage.progress}%</span>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">{stage.desc}</p>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${stage.progress}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: idx * 0.12 + 0.3, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-[#1a4a2e] to-[#5a9e3a]"
                  />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="overflow-hidden rounded-3xl shadow-xl"
            >
              <img
                src={plantingCloseImage}
                alt="Researchers planting seedlings in greenhouse"
                className="h-64 w-full object-cover"
              />
            </motion.div>
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="overflow-hidden rounded-2xl shadow-lg"
              >
                <img
                  src={plantingPairImage}
                  alt="Pair of researchers examining seedlings"
                  className="h-48 w-full object-cover"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="overflow-hidden rounded-2xl shadow-lg"
              >
                <img
                  src={plantGrowthImage}
                  alt="Tomato plants growing in black grow bags"
                  className="h-48 w-full object-cover"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
