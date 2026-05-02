import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface AboutProps {
  signboardImage: string;
}

export function About({ signboardImage }: AboutProps) {
  const goals = [
    "Deliver live greenhouse data as a service",
    "Recommend crops, fertilizer, and yield forecasts",
    "Enable MQTT-based remote monitoring",
    "Support students, faculty, and researchers",
    "Promote scalable sustainable agriculture"
  ];

  return (
    <section id="about" className="py-24 bg-background overflow-hidden relative">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/5 rounded-3xl transform -rotate-3 scale-105 z-0" />
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border border-border">
              <img 
                src={signboardImage} 
                alt="KITSW CSE(IoT) Smart Green House Signboard" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-60" />
            </div>
            
            <div className="absolute -bottom-8 -right-8 bg-card p-6 rounded-2xl shadow-xl border border-border max-w-[250px] z-20">
              <p className="font-serif italic text-primary text-xl font-medium">"Where computing meets cultivation."</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h2 className="text-accent text-sm font-bold tracking-widest uppercase mb-3">About GaaS</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
              From Greenhouse Prototype to Service Platform
            </h3>
            
            <div className="prose prose-lg text-muted-foreground mb-8">
              <p>
                Greenhouse as a Service (GaaS) extends the KITSW CSE(IoT) smart greenhouse into a production-oriented platform for growers, students, faculty, and research teams. It connects field sensors, dashboards, AI models, subscriptions, and support into one service flow.
              </p>
              <p>
                The website now reflects both sides of the work: the physical greenhouse implementation and the software services built around live data, crop intelligence, fertigation, and research-ready exports.
              </p>
            </div>

            <div className="space-y-4 mb-10">
              <h4 className="font-semibold text-primary text-xl font-serif">Platform Goals</h4>
              <ul className="grid sm:grid-cols-2 gap-3">
                {goals.map((goal, idx) => (
                  <motion.li 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + (idx * 0.1) }}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <CheckCircle2 className="text-accent h-5 w-5 shrink-0" />
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
