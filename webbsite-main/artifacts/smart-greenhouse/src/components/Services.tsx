import { motion } from "framer-motion";
import {
  Activity,
  BrainCircuit,
  Bug,
  CreditCard,
  Database,
  Download,
  Droplets,
  Headphones,
  RadioTower,
  ShieldCheck,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const services = [
  {
    icon: Database,
    title: "Data as a Service",
    price: "Included",
    desc: "Live sensor stream, 24h/48h/72h history, CSV downloads, row and grow-bag level views.",
  },
  {
    icon: Sprout,
    title: "Crop Recommendations",
    price: "₹49/mo add-on",
    desc: "AI-powered crop suggestions from soil, temperature, humidity, pH, EC, and moisture inputs.",
  },
  {
    icon: TrendingUp,
    title: "Yield Prediction",
    price: "₹59/mo add-on",
    desc: "ML regression estimates expected yield from crop, soil, NPK, and greenhouse conditions.",
  },
  {
    icon: Bug,
    title: "Pest & Disease Prediction",
    price: "₹79/mo add-on",
    desc: "Image-based crop health support for early detection and faster response decisions.",
  },
  {
    icon: Droplets,
    title: "Fertigation Advisory",
    price: "₹69/mo add-on",
    desc: "NPK, pH, EC, fertilizer dosage, and scheduling guidance for active grow zones.",
  },
  {
    icon: Activity,
    title: "Irrigation Scheduling",
    price: "₹49/mo add-on",
    desc: "Smart watering plans based on crop stage, sensor data, and controlled-environment needs.",
  },
  {
    icon: BrainCircuit,
    title: "AI Analytics",
    price: "Pro feature",
    desc: "Prediction, anomaly detection, and clustering views powered by Flask ML endpoints.",
  },
  {
    icon: RadioTower,
    title: "Real-time IoT Dashboard",
    price: "₹149/mo add-on",
    desc: "MQTT live feed with greenhouse alerts and integration-ready sensor ingestion.",
  },
  {
    icon: Headphones,
    title: "Priority Support",
    price: "₹199/mo add-on",
    desc: "Ticket workflow, screenshots, admin review, and same-day dedicated response channel.",
  },
];

const plans = [
  {
    name: "Starter",
    tagline: "Essentials for monitoring",
    fee: "Base plan",
    items: ["Live sensor dashboard", "Recent data downloads", "Email support"],
  },
  {
    name: "Pro",
    tagline: "For active growers",
    fee: "+ ₹300/mo",
    items: ["Everything in Starter", "Crop & Yield AI", "Pest & Disease detection", "Priority email support"],
  },
  {
    name: "Enterprise",
    tagline: "For full greenhouse operations",
    fee: "+ ₹800/mo",
    items: ["Everything in Pro", "Real-time IoT / MQTT dashboard", "Greenhouse simulation", "Dedicated support"],
  },
];

const platformCapabilities = [
  { icon: CreditCard, text: "Razorpay checkout with backend-verified pricing and GST calculation" },
  { icon: ShieldCheck, text: "Role-aware access for guests, subscribers, and admins" },
  { icon: Download, text: "Research-ready CSV/JSON exports for sensor and dataset workflows" },
];

export function Services() {
  return (
    <section id="services" className="py-24 bg-[#f5fbf0] overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[#5a9e3a] text-sm font-bold tracking-widest uppercase mb-3">Services Offered</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
              What GaaS Provides
            </h3>
            <p className="text-muted-foreground text-lg">
              The reference project is more than a landing page. It provides a subscription-based agriculture platform with realtime data, AI tools, research exports, billing, and support.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {services.map((service, idx) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.06 }}
              >
                <Card className="h-full bg-white border-[#1a4a2e]/10 hover:border-[#5a9e3a]/40 hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="h-12 w-12 rounded-2xl bg-[#1a4a2e]/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-[#1a4a2e]" />
                      </div>
                      <span className="text-xs font-bold text-[#5a9e3a] bg-[#5a9e3a]/10 px-3 py-1 rounded-full">
                        {service.price}
                      </span>
                    </div>
                    <h4 className="text-xl font-bold font-serif text-primary mb-3">{service.title}</h4>
                    <p className="text-muted-foreground leading-relaxed">{service.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-[#0d2b1a] text-white rounded-3xl p-8"
          >
            <h4 className="text-2xl font-serif font-bold mb-4">Platform Capabilities</h4>
            <p className="text-white/70 mb-8">
              These features are already represented in the GaaS codebase through the React frontend, Express backend, MongoDB models, MQTT ingestion, and Flask AI service.
            </p>
            <div className="space-y-4">
              {platformCapabilities.map((capability) => {
                const Icon = capability.icon;
                return (
                  <div key={capability.text} className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-[#a3d977]" />
                    </div>
                    <p className="text-white/80">{capability.text}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid md:grid-cols-3 gap-4"
          >
            {plans.map((plan) => (
              <div key={plan.name} className="bg-white border border-[#1a4a2e]/10 rounded-3xl p-6 shadow-sm">
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5a9e3a]">{plan.tagline}</p>
                  <h5 className="text-2xl font-serif font-bold text-primary mt-2">{plan.name}</h5>
                  <p className="text-sm text-muted-foreground mt-1">{plan.fee}</p>
                </div>
                <ul className="space-y-3">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#a3d977]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
