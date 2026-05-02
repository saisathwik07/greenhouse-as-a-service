import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function LandingHero({ backgroundImage }) {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 z-0">
        <img src={backgroundImage} alt="Greenhouse Exterior" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-primary/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
      </div>

      <div className="container relative z-10 mx-auto mt-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="mb-6 inline-block rounded-full border border-accent/30 bg-accent/20 px-3 py-1 text-sm font-medium tracking-wide text-accent backdrop-blur-sm">
            KITSW CSE(IoT) Greenhouse-as-a-Service Platform
          </span>
          <h1 className="mb-6 text-5xl font-bold leading-tight text-white md:text-7xl lg:text-8xl">
            Smart Greenhouse <br />
            <span className="italic text-accent">as a Service</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl font-sans text-lg font-light leading-relaxed text-white/90 md:text-xl">
            A full-stack smart agriculture service combining live IoT telemetry, crop and yield AI,
            fertigation advisory, MQTT monitoring, subscriptions, and support workflows.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/login"
              data-testid="button-get-started"
              className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-full bg-accent px-8 py-6 text-lg font-semibold text-accent-foreground shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all hover:bg-accent/90 hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] sm:w-auto sm:rounded-full"
            >
              Get Started
            </Link>
            <button
              type="button"
              data-testid="button-explore-services"
              className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-full border border-white/30 px-8 py-6 text-lg font-medium text-primary-foreground backdrop-blur-sm transition-colors hover:bg-white/10 sm:w-auto"
              onClick={() =>
                document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore Services
            </button>
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/20 blur-[1px]"
            style={{
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{
              y: [0, -100],
              x: [0, (Math.random() - 0.5) * 50],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>
    </section>
  );
}
