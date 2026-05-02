import { motion } from "framer-motion";

interface CropGrowthProps {
  plantingCloseImage: string;
  plantingPairImage: string;
  plantGrowthImage: string;
}

const stages = [
  { label: "Seed & Soil Prep", desc: "Grow bags filled with the right growing medium. Seeds sown with care.", progress: 25 },
  { label: "Early Seedling", desc: "First sprouts emerge. Irrigation begins at precise intervals.", progress: 50 },
  { label: "Active Growth", desc: "Plants growing strong under controlled temperature and humidity.", progress: 75 },
  { label: "Mature Crop", desc: "Full canopy reached. Harvest-ready plants with optimal nutrition.", progress: 100 },
];

export function CropGrowth({ plantingCloseImage, plantingPairImage, plantGrowthImage }: CropGrowthProps) {
  return (
    <section id="crop-growth" className="py-24 bg-[#f5fbf0] overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[#5a9e3a] text-sm font-bold tracking-widest uppercase mb-3">Crop Journey</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
              From Seed to Harvest
            </h3>
            <p className="text-muted-foreground text-lg">
              Watch the lifecycle of our greenhouse crops — every stage tracked, optimized, and nurtured by intelligent systems.
            </p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-start mb-16">
          <div className="space-y-8">
            {stages.map((stage, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.12 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold font-serif text-primary text-lg">{stage.label}</h4>
                  <span className="text-[#5a9e3a] font-bold text-sm">{stage.progress}%</span>
                </div>
                <p className="text-muted-foreground text-sm mb-4">{stage.desc}</p>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${stage.progress}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: idx * 0.12 + 0.3, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#1a4a2e] to-[#5a9e3a] rounded-full"
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
              className="rounded-3xl overflow-hidden shadow-xl"
            >
              <img
                src={plantingCloseImage}
                alt="Researchers planting seedlings in greenhouse"
                className="w-full h-64 object-cover"
              />
            </motion.div>
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="rounded-2xl overflow-hidden shadow-lg"
              >
                <img
                  src={plantingPairImage}
                  alt="Pair of researchers examining seedlings"
                  className="w-full h-48 object-cover"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="rounded-2xl overflow-hidden shadow-lg"
              >
                <img
                  src={plantGrowthImage}
                  alt="Tomato plants growing in black grow bags"
                  className="w-full h-48 object-cover"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
