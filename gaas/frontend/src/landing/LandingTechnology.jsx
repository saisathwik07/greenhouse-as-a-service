import { motion } from "framer-motion";
import { Wifi, Droplets, Thermometer, Zap, Server, Radio, Database } from "lucide-react";

const technologies = [
  {
    icon: Radio,
    title: "MQTT / LoRaWAN Telemetry",
    desc: "Sensor readings move through greenhouse topics and long-range wireless links for remote monitoring."
  },
  {
    icon: Droplets,
    title: "Soil & Nutrient Monitoring",
    desc: "Temperature, humidity, soil moisture, pH, and EC are tracked for crop and fertigation decisions."
  },
  {
    icon: Thermometer,
    title: "Live Sensor Dashboard",
    desc: "Realtime and historical dashboards expose greenhouse health, alerts, and last-updated status."
  },
  {
    icon: Zap,
    title: "Fertigation Control",
    desc: "Dosage, pH, EC targets, fertilizer type, and schedule data support controlled nutrient delivery."
  },
  {
    icon: Wifi,
    title: "React Service Interface",
    desc: "The frontend presents dashboards, AI tools, subscriptions, tickets, and admin analytics."
  },
  {
    icon: Server,
    title: "Express + Flask APIs",
    desc: "Node.js handles users, billing, support, and data APIs while Flask serves AI/ML predictions."
  },
  {
    icon: Database,
    title: "MongoDB Data Layer",
    desc: "Sensor readings, plans, subscriptions, tickets, notifications, and analytics events are persisted."
  }
];

export default function LandingTechnology({ sensorImage }) {
  return (
    <section id="technology" className="overflow-hidden bg-background py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#5a9e3a]">
              Technology Stack
            </h2>
            <h3 className="mb-6 font-serif text-4xl font-bold text-primary md:text-5xl">
              Powered by Industrial IoT
            </h3>
            <p className="text-lg text-muted-foreground">
              The platform combines deployed greenhouse hardware with production web services, AI endpoints, data exports,
              and subscription workflows.
            </p>
          </motion.div>
        </div>

        <div className="grid items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#1a4a2e]/20 to-[#5a9e3a]/10 blur-xl" />
            <div className="relative overflow-hidden rounded-3xl border border-[#1a4a2e]/20 shadow-2xl">
              <img
                src={sensorImage}
                alt="LoRaWAN IoT Sensor for Soil Moisture"
                className="h-[500px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b1a]/90 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#a3d977]" />
                  <span className="text-sm font-medium text-white">Live Sensor Active</span>
                </div>
                <p className="text-lg font-bold text-white">LSE01 LoRaWAN Sensor</p>
                <p className="text-sm text-white/70">Soil Moisture & EC — Model LSE01</p>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {technologies.map((tech, idx) => {
              const Icon = tech.icon;
              return (
                <motion.div
                  key={tech.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                  className={`rounded-2xl border border-border bg-card p-5 transition-all group hover:border-[#5a9e3a]/40 hover:shadow-lg ${
                    idx === technologies.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""
                  }`}
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a4a2e]/10 transition-colors group-hover:bg-[#1a4a2e]/20">
                    <Icon className="h-5 w-5 text-[#1a4a2e]" />
                  </div>
                  <h4 className="mb-1 font-serif font-bold text-primary">{tech.title}</h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">{tech.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
