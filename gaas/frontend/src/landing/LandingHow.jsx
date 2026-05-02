import { motion } from "framer-motion";

export default function LandingHow({ plantationImage, plantingCloseImage }) {
  const steps = [
    {
      num: "01",
      title: "Capture Greenhouse Data",
      desc: "Sensor nodes collect temperature, humidity, soil moisture, pH, EC, row, and grow-bag readings."
    },
    {
      num: "02",
      title: "Ingest Through MQTT & APIs",
      desc: "The backend receives live telemetry, stores history, and keeps fallback simulation ready for demos."
    },
    {
      num: "03",
      title: "Visualize Data as a Service",
      desc: "Users monitor realtime cards, historical charts, alerts, and downloadable CSV datasets."
    },
    {
      num: "04",
      title: "Run AI Agriculture Tools",
      desc: "Crop recommendation, yield prediction, fertilizer scoring, and anomaly analytics turn readings into decisions."
    },
    {
      num: "05",
      title: "Manage Plans & Access",
      desc: "Starter, Pro, and Enterprise plans unlock services through subscription and entitlement checks."
    },
    {
      num: "06",
      title: "Support & Improve Operations",
      desc: "Tickets, notifications, admin analytics, and research exports close the loop for users and operators."
    }
  ];

  return (
    <section id="how-it-works" className="bg-muted/30 py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-accent">Service Flow</h2>
            <h3 className="mb-6 font-serif text-4xl font-bold text-primary">How GaaS Works</h3>
            <p className="text-lg text-muted-foreground">
              The platform converts greenhouse telemetry into dashboards, recommendations, subscriptions, and
              supportable services.
            </p>
          </motion.div>
        </div>

        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="relative">
            <div className="absolute bottom-0 left-8 top-0 hidden w-px bg-border md:block" />
            <div className="space-y-8">
              {steps.map((step, idx) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="group relative pl-0 md:pl-20"
                >
                  <div className="absolute left-[1.125rem] top-1 z-10 hidden h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-background font-bold text-muted-foreground transition-colors group-hover:border-accent group-hover:text-accent md:flex">
                    {step.num}
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow group-hover:shadow-md">
                    <div className="mb-2 font-bold text-accent md:hidden">Step {step.num}</div>
                    <h4 className="mb-2 font-serif text-xl font-bold text-primary">{step.title}</h4>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="overflow-hidden rounded-3xl shadow-xl"
            >
              <img src={plantationImage} alt="Team planting outdoors" className="h-64 w-full object-cover" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="overflow-hidden rounded-3xl shadow-xl"
            >
              <img
                src={plantingCloseImage}
                alt="Close up of planting"
                className="h-80 w-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
