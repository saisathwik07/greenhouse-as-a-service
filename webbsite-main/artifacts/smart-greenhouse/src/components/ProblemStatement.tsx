import { motion } from "framer-motion";
import { Droplet, EyeOff, CloudRain, TrendingDown, LayoutList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ProblemStatement() {
  const problems = [
    {
      icon: Droplet,
      title: "Water Wastage",
      description: "Traditional irrigation often results in overwatering, depleting precious resources."
    },
    {
      icon: EyeOff,
      title: "Manual Monitoring",
      description: "Farmers lack real-time visibility into soil and crop health without physical inspection."
    },
    {
      icon: CloudRain,
      title: "Climate Dependency",
      description: "Open-field agriculture is highly vulnerable to unpredictable weather patterns."
    },
    {
      icon: TrendingDown,
      title: "Low Efficiency",
      description: "Resource distribution isn't optimized for specific plant needs, lowering yields."
    },
    {
      icon: LayoutList,
      title: "Poor Crop Tracking",
      description: "Lack of historical data makes it difficult to improve farming practices over time."
    }
  ];

  return (
    <section className="py-24 bg-primary text-primary-foreground relative">
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-accent text-sm font-bold tracking-widest uppercase mb-3">The Challenge</h2>
            <h3 className="text-4xl font-serif font-bold mb-6">Why Traditional Farming Needs an Upgrade</h3>
            <p className="text-primary-foreground/80 text-lg">
              Agriculture is the backbone of society, but traditional methods are struggling to keep up with modern resource constraints and climate realities.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {problems.map((problem, idx) => {
            const Icon = problem.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={idx === problems.length - 1 ? "md:col-span-2 lg:col-span-1 lg:col-start-3" : ""}
              >
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-full hover:bg-white/10 transition-colors">
                  <CardContent className="p-8">
                    <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center mb-6">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                    <h4 className="text-xl font-bold mb-3 font-serif text-white">{problem.title}</h4>
                    <p className="text-primary-foreground/70 leading-relaxed">
                      {problem.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
