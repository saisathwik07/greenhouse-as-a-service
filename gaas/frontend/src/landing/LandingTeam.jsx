import { motion } from "framer-motion";
import { Users, FlaskConical, GraduationCap } from "lucide-react";

const roles = [
  {
    icon: Users,
    title: "Faculty Mentors",
    desc: "Senior professors from the CSE(IoT) department who guided the project from conception to deployment, providing domain expertise in Industrial IoT and precision agriculture."
  },
  {
    icon: FlaskConical,
    title: "Researchers",
    desc: "Dedicated researchers who designed the sensor network, configured LoRaWAN communication protocols, and validated soil health metrics across grow cycles."
  },
  {
    icon: GraduationCap,
    title: "Student Contributors",
    desc: "CSE(IoT) students who gained hands-on experience deploying real-world IoT infrastructure and contributing to a project that continues to evolve."
  }
];

export default function LandingTeam({ teamGreenhouseImage, facultyDiscussImage }) {
  return (
    <section id="team" className="overflow-hidden bg-background py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#5a9e3a]">Our People</h2>
            <h3 className="mb-6 font-serif text-4xl font-bold text-primary md:text-5xl">
              The Minds Behind the Greenhouse
            </h3>
            <p className="text-lg text-muted-foreground">
              A collaboration between experienced faculty, dedicated researchers, and passionate students — united
              by the mission to redefine farming.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative mb-16 overflow-hidden rounded-3xl shadow-2xl"
        >
          <img
            src={teamGreenhouseImage}
            alt="KITSW Faculty team inside the Smart Greenhouse"
            className="h-[480px] w-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b1a]/80 via-[#0d2b1a]/20 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-white/70">
              KITSW CSE(IoT) Department
            </p>
            <h4 className="font-serif text-2xl font-bold text-white md:text-3xl">
              Faculty & Research Team — Smart Greenhouse Project
            </h4>
          </div>
        </motion.div>

        <div className="mb-16 grid gap-8 md:grid-cols-3">
          {roles.map((role, idx) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="rounded-2xl border border-border bg-card p-8 transition-shadow hover:shadow-lg"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a4a2e]/10">
                  <Icon className="h-6 w-6 text-[#1a4a2e]" />
                </div>
                <h4 className="mb-3 font-serif text-xl font-bold text-primary">{role.title}</h4>
                <p className="leading-relaxed text-muted-foreground">{role.desc}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="overflow-hidden rounded-3xl shadow-xl"
        >
          <img
            src={facultyDiscussImage}
            alt="Faculty discussion at the greenhouse site"
            className="h-80 w-full object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}
