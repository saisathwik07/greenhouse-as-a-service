import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface HeroProps {
  backgroundImage: string;
}

export function Hero({ backgroundImage }: HeroProps) {
  return (
    <section id="hero" className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src={backgroundImage} 
          alt="Greenhouse Exterior" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
      </div>

      <div className="container relative z-10 mx-auto px-4 text-center mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="inline-block py-1 px-3 rounded-full bg-accent/20 border border-accent/30 text-accent font-medium tracking-wide text-sm mb-6 backdrop-blur-sm">
            KITSW CSE(IoT) Greenhouse-as-a-Service Platform
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight">
            Smart Greenhouse <br/>
            <span className="text-accent italic">as a Service</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/90 font-sans font-light leading-relaxed mb-10">
            A full-stack smart agriculture service combining live IoT telemetry, crop and yield AI, fertigation advisory, MQTT monitoring, subscriptions, and support workflows.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto font-semibold rounded-full px-8 py-6 text-lg shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]"
              onClick={() => {
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
              }}
              data-testid="button-explore"
            >
              Explore Platform
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto rounded-full px-8 py-6 text-lg border-white/30 text-primary-foreground hover:bg-white/10 backdrop-blur-sm"
              onClick={() => {
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
              }}
              data-testid="button-contact"
            >
              Request Demo
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Floating particles simplified for react */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/20 blur-[1px]"
            style={{
              width: Math.random() * 6 + 2 + 'px',
              height: Math.random() * 6 + 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
            }}
            animate={{
              y: [0, -100],
              x: [0, (Math.random() - 0.5) * 50],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>
    </section>
  );
}
