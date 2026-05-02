import { motion } from "framer-motion";
import { MapPin, Mail, Send, Github, Linkedin, Twitter, Leaf } from "lucide-react";
import { useState } from "react";

export function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <section id="contact" className="py-24 bg-[#0d2b1a] text-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[#a3d977] text-sm font-bold tracking-widest uppercase mb-3">Get in Touch</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              Discuss GaaS Access or Collaboration
            </h3>
            <p className="text-white/70 text-lg">
              Interested in live greenhouse data, AI crop services, research exports, or a deployment partnership? Reach out to the team.
            </p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="space-y-8 mb-12">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-[#a3d977]" />
                </div>
                <div>
                  <p className="font-bold text-white mb-1">Address</p>
                  <p className="text-white/70">Kakatiya Institute of Technology and Science (KITSW)</p>
                  <p className="text-white/70">Warangal, Telangana — 506015, India</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-[#a3d977]" />
                </div>
                <div>
                  <p className="font-bold text-white mb-1">Department</p>
                  <p className="text-white/70">CSE(IoT) — Industrial IoT Laboratory</p>
                  <p className="text-white/60 text-sm">iot-lab@kitsw.ac.in</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-white/60 text-sm mb-4 uppercase tracking-wider font-bold">Follow the Project</p>
              <div className="flex gap-3">
                {[
                  { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com" },
                  { icon: Twitter, label: "Twitter", href: "https://twitter.com" },
                  { icon: Github, label: "GitHub", href: "https://github.com" },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-11 w-11 rounded-xl bg-white/10 hover:bg-[#a3d977] hover:text-[#0d2b1a] flex items-center justify-center transition-all"
                    data-testid={`social-${s.label.toLowerCase()}`}
                    aria-label={s.label}
                  >
                    <s.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            {sent ? (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-[#a3d977]/20 flex items-center justify-center mx-auto mb-6">
                  <Send className="h-8 w-8 text-[#a3d977]" />
                </div>
                <h4 className="text-white text-2xl font-serif font-bold mb-3">Message Sent</h4>
                <p className="text-white/70">Thank you for reaching out. The team will respond within 48 hours.</p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 space-y-5"
              >
                <div>
                  <label className="block text-white/70 text-sm mb-2 font-medium">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your full name"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#a3d977] transition-colors"
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2 font-medium">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#a3d977] transition-colors"
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2 font-medium">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us which GaaS service or collaboration you are interested in..."
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#a3d977] transition-colors resize-none"
                    data-testid="input-message"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#a3d977] text-[#0d2b1a] font-bold py-4 rounded-xl hover:bg-[#b8e88a] transition-colors flex items-center justify-center gap-2"
                  data-testid="button-send"
                >
                  <Send className="h-4 w-4" />
                  Send Message
                </button>
              </form>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="border-t border-white/10 mt-20 pt-10 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2 text-white/60">
            <Leaf className="h-5 w-5 text-[#a3d977]" />
            <span className="font-serif text-white font-medium">Smart Greenhouse as a Service</span>
          </div>
          <p className="text-white/40 text-sm">
            Kakatiya Institute of Technology and Science — CSE(IoT) Department, Warangal
          </p>
          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} KITSW. All rights reserved.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
