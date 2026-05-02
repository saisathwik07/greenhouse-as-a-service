import { motion } from "framer-motion";
import { Users, FlaskConical, GraduationCap } from "lucide-react";

interface TeamProps {
  teamGreenhouseImage: string;
  facultyDiscussImage: string;
}

const roles = [
  {
    icon: Users,
    title: "Faculty Mentors",
    desc: "Senior professors from the CSE(IoT) department who guided the project from conception to deployment, providing domain expertise in Industrial IoT and precision agriculture.",
  },
  {
    icon: FlaskConical,
    title: "Researchers",
    desc: "Dedicated researchers who designed the sensor network, configured LoRaWAN communication protocols, and validated soil health metrics across grow cycles.",
  },
  {
    icon: GraduationCap,
    title: "Student Contributors",
    desc: "CSE(IoT) students who gained hands-on experience deploying real-world IoT infrastructure and contributing to a project that continues to evolve.",
  },
];

export function Team({ teamGreenhouseImage, facultyDiscussImage }: TeamProps) {
  return (
    <section id="team" className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[#5a9e3a] text-sm font-bold tracking-widest uppercase mb-3">Our People</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
              The Minds Behind the Greenhouse
            </h3>
            <p className="text-muted-foreground text-lg">
              A collaboration between experienced faculty, dedicated researchers, and passionate students — united by the mission to redefine farming.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-3xl overflow-hidden shadow-2xl mb-16"
        >
          <img
            src={teamGreenhouseImage}
            alt="KITSW Faculty team inside the Smart Greenhouse"
            className="w-full h-[480px] object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b1a]/80 via-[#0d2b1a]/20 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <p className="text-white/70 text-sm font-medium tracking-wider uppercase mb-2">KITSW CSE(IoT) Department</p>
            <h4 className="text-white text-2xl md:text-3xl font-serif font-bold">
              Faculty & Research Team — Smart Greenhouse Project
            </h4>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {roles.map((role, idx) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-shadow"
              >
                <div className="h-12 w-12 rounded-2xl bg-[#1a4a2e]/10 flex items-center justify-center mb-6">
                  <Icon className="h-6 w-6 text-[#1a4a2e]" />
                </div>
                <h4 className="text-xl font-bold font-serif text-primary mb-3">{role.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{role.desc}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="rounded-3xl overflow-hidden shadow-xl"
        >
          <img
            src={facultyDiscussImage}
            alt="Faculty discussion at the greenhouse site"
            className="w-full h-80 object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}
