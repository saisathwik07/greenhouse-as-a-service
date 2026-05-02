import { motion } from "framer-motion";
import { Wifi, Droplets, Thermometer, Zap, Server, Radio, Database } from "lucide-react";

interface TechnologyProps {
  sensorImage: string;
}

const technologies = [
  { icon: Radio, title: "MQTT / LoRaWAN Telemetry", desc: "Sensor readings move through greenhouse topics and long-range wireless links for remote monitoring." },
  { icon: Droplets, title: "Soil & Nutrient Monitoring", desc: "Temperature, humidity, soil moisture, pH, and EC are tracked for crop and fertigation decisions." },
  { icon: Thermometer, title: "Live Sensor Dashboard", desc: "Realtime and historical dashboards expose greenhouse health, alerts, and last-updated status." },
  { icon: Zap, title: "Fertigation Control", desc: "Dosage, pH, EC targets, fertilizer type, and schedule data support controlled nutrient delivery." },
  { icon: Wifi, title: "React Service Interface", desc: "The frontend presents dashboards, AI tools, subscriptions, tickets, and admin analytics." },
  { icon: Server, title: "Express + Flask APIs", desc: "Node.js handles users, billing, support, and data APIs while Flask serves AI/ML predictions." },
  { icon: Database, title: "MongoDB Data Layer", desc: "Sensor readings, plans, subscriptions, tickets, notifications, and analytics events are persisted." },
];

export function Technology({ sensorImage }: TechnologyProps) {
  return (
    <section id="technology" className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[#5a9e3a] text-sm font-bold tracking-widest uppercase mb-3">Technology Stack</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
              Powered by Industrial IoT
            </h3>
            <p className="text-muted-foreground text-lg">
              The platform combines deployed greenhouse hardware with production web services, AI endpoints, data exports, and subscription workflows.
            </p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-[#1a4a2e]/20 to-[#5a9e3a]/10 rounded-3xl blur-xl" />
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-[#1a4a2e]/20">
              <img
                src={sensorImage}
                alt="LoRaWAN IoT Sensor for Soil Moisture"
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b1a]/90 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-[#a3d977] animate-pulse" />
                  <span className="text-white text-sm font-medium">Live Sensor Active</span>
                </div>
                <p className="text-white font-bold text-lg">LSE01 LoRaWAN Sensor</p>
                <p className="text-white/70 text-sm">Soil Moisture & EC — Model LSE01</p>
              </div>
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {technologies.map((tech, idx) => {
              const Icon = tech.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                  className={`group bg-card border border-border rounded-2xl p-5 hover:shadow-lg hover:border-[#5a9e3a]/40 transition-all ${
                    idx === technologies.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""
                  }`}
                >
                  <div className="h-10 w-10 rounded-xl bg-[#1a4a2e]/10 group-hover:bg-[#1a4a2e]/20 flex items-center justify-center mb-4 transition-colors">
                    <Icon className="h-5 w-5 text-[#1a4a2e]" />
                  </div>
                  <h4 className="font-bold text-primary mb-1 font-serif">{tech.title}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{tech.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
