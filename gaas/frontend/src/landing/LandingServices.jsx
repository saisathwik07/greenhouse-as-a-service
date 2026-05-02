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
  TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";
import { LCard, LCardContent } from "./landingUi";

const services = [
  {
    icon: Database,
    title: "Data as a Service",
    price: "Included",
    desc: "Live sensor stream, 24h/48h/72h history, CSV downloads, row and grow-bag level views."
  },
  {
    icon: Sprout,
    title: "Crop Recommendations",
    price: "₹49/mo add-on",
    desc: "AI-powered crop suggestions from soil, temperature, humidity, pH, EC, and moisture inputs."
  },
  {
    icon: TrendingUp,
    title: "Yield Prediction",
    price: "₹59/mo add-on",
    desc: "ML regression estimates expected yield from crop, soil, NPK, and greenhouse conditions."
  },
  {
    icon: Bug,
    title: "Pest & Disease Prediction",
    price: "₹79/mo add-on",
    desc: "Image-based crop health support for early detection and faster response decisions."
  },
  {
    icon: Droplets,
    title: "Fertigation Advisory",
    price: "₹69/mo add-on",
    desc: "NPK, pH, EC, fertilizer dosage, and scheduling guidance for active grow zones."
  },
  {
    icon: Activity,
    title: "Irrigation Scheduling",
    price: "₹49/mo add-on",
    desc: "Smart watering plans based on crop stage, sensor data, and controlled-environment needs."
  },
  {
    icon: BrainCircuit,
    title: "AI Analytics",
    price: "Pro feature",
    desc: "Prediction, anomaly detection, and clustering views powered by Flask ML endpoints."
  },
  {
    icon: RadioTower,
    title: "Real-time IoT Dashboard",
    price: "₹149/mo add-on",
    desc: "MQTT live feed with greenhouse alerts and integration-ready sensor ingestion."
  },
  {
    icon: Headphones,
    title: "Priority Support",
    price: "₹199/mo add-on",
    desc: "Ticket workflow, screenshots, admin review, and same-day dedicated response channel."
  }
];

const plans = [
  {
    name: "Starter",
    tagline: "Essentials for monitoring",
    fee: "Base plan",
    items: ["Live sensor dashboard", "Recent data downloads", "Email support"]
  },
  {
    name: "Pro",
    tagline: "For active growers",
    fee: "+ ₹300/mo",
    items: [
      "Everything in Starter",
      "Crop & Yield AI",
      "Pest & Disease detection",
      "Priority email support"
    ]
  },
  {
    name: "Enterprise",
    tagline: "For full greenhouse operations",
    fee: "+ ₹800/mo",
    items: [
      "Everything in Pro",
      "Real-time IoT / MQTT dashboard",
      "Greenhouse simulation",
      "Dedicated support"
    ]
  }
];

const platformCapabilities = [
  { icon: CreditCard, text: "Razorpay checkout with backend-verified pricing and GST calculation" },
  { icon: ShieldCheck, text: "Role-aware access for guests, subscribers, and admins" },
  { icon: Download, text: "Research-ready CSV/JSON exports for sensor and dataset workflows" }
];

export default function LandingServices() {
  return (
    <section id="services" className="overflow-hidden bg-[#f5fbf0] py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#5a9e3a]">
              Services Offered
            </h2>
            <h3 className="mb-6 font-serif text-4xl font-bold text-primary md:text-5xl">
              What GaaS Provides
            </h3>
            <p className="text-lg text-muted-foreground">
              The reference project is more than a landing page. It provides a subscription-based agriculture
              platform with realtime data, AI tools, research exports, billing, and support.
            </p>
          </motion.div>
        </div>

        <div className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                <LCard className="h-full border-[#1a4a2e]/10 bg-white hover:border-[#5a9e3a]/40 hover:shadow-lg">
                  <LCardContent className="p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a4a2e]/10">
                        <Icon className="h-6 w-6 text-[#1a4a2e]" />
                      </div>
                      <span className="rounded-full bg-[#5a9e3a]/10 px-3 py-1 text-xs font-bold text-[#5a9e3a]">
                        {service.price}
                      </span>
                    </div>
                    <h4 className="mb-3 font-serif text-xl font-bold text-primary">{service.title}</h4>
                    <p className="leading-relaxed text-muted-foreground">{service.desc}</p>
                  </LCardContent>
                </LCard>
              </motion.div>
            );
          })}
        </div>

        <div className="grid items-stretch gap-8 lg:grid-cols-[1fr_1.2fr]">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl bg-[#0d2b1a] p-8 text-white"
          >
            <h4 className="mb-4 font-serif text-2xl font-bold">Platform Capabilities</h4>
            <p className="mb-8 text-white/70">
              These features are already represented in the GaaS codebase through the React frontend, Express
              backend, MongoDB models, MQTT ingestion, and Flask AI service.
            </p>
            <div className="space-y-4">
              {platformCapabilities.map((capability) => {
                const Icon = capability.icon;
                return (
                  <div key={capability.text} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
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
            className="grid gap-4 md:grid-cols-3"
          >
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="rounded-3xl border border-[#1a4a2e]/10 bg-white p-6 shadow-sm"
              >
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5a9e3a]">
                    {plan.tagline}
                  </p>
                  <h5 className="mt-2 font-serif text-2xl font-bold text-primary">{plan.name}</h5>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.fee}</p>
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

        <div className="mt-10 flex justify-center">
          <Link
            to="/login"
            className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-95"
          >
            Continue to GAAS signup / login →
          </Link>
        </div>
      </div>
    </section>
  );
}
