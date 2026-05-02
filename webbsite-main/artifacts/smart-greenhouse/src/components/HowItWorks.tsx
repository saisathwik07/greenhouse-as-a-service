import { motion } from "framer-motion";

interface HowItWorksProps {
  plantationImage: string;
  plantingCloseImage: string;
}

export function HowItWorks({ plantationImage, plantingCloseImage }: HowItWorksProps) {
  const steps = [
    { num: "01", title: "Capture Greenhouse Data", desc: "Sensor nodes collect temperature, humidity, soil moisture, pH, EC, row, and grow-bag readings." },
    { num: "02", title: "Ingest Through MQTT & APIs", desc: "The backend receives live telemetry, stores history, and keeps fallback simulation ready for demos." },
    { num: "03", title: "Visualize Data as a Service", desc: "Users monitor realtime cards, historical charts, alerts, and downloadable CSV datasets." },
    { num: "04", title: "Run AI Agriculture Tools", desc: "Crop recommendation, yield prediction, fertilizer scoring, and anomaly analytics turn readings into decisions." },
    { num: "05", title: "Manage Plans & Access", desc: "Starter, Pro, and Enterprise plans unlock services through subscription and entitlement checks." },
    { num: "06", title: "Support & Improve Operations", desc: "Tickets, notifications, admin analytics, and research exports close the loop for users and operators." }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-accent text-sm font-bold tracking-widest uppercase mb-3">Service Flow</h2>
            <h3 className="text-4xl font-serif font-bold text-primary mb-6">How GaaS Works</h3>
            <p className="text-muted-foreground text-lg">
              The platform converts greenhouse telemetry into dashboards, recommendations, subscriptions, and supportable services.
            </p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-border hidden md:block" />
            <div className="space-y-8">
              {steps.map((step, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="relative pl-0 md:pl-20 group"
                >
                  <div className="hidden md:flex absolute left-[1.125rem] top-1 h-10 w-10 rounded-full bg-background border-2 border-border items-center justify-center font-bold text-muted-foreground group-hover:border-accent group-hover:text-accent transition-colors z-10">
                    {step.num}
                  </div>
                  <div className="bg-card p-6 rounded-2xl shadow-sm border border-border group-hover:shadow-md transition-shadow">
                    <div className="md:hidden text-accent font-bold mb-2">Step {step.num}</div>
                    <h4 className="text-xl font-bold font-serif text-primary mb-2">{step.title}</h4>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="grid gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="rounded-3xl overflow-hidden shadow-xl"
            >
              <img src={plantationImage} alt="Team planting outdoors" className="w-full h-64 object-cover" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="rounded-3xl overflow-hidden shadow-xl"
            >
              <img src={plantingCloseImage} alt="Close up of planting" className="w-full h-80 object-cover" />
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
