import { motion } from "framer-motion";
import { MapPin, Mail, Send, Leaf } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

function SocialIcon({ children, label, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 transition-all hover:bg-[#a3d977] hover:text-[#0d2b1a]"
      data-testid={`social-${label.toLowerCase()}`}
      aria-label={label}
    >
      {children}
    </a>
  );
}

export default function LandingContact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSent(true);
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <section id="contact" className="overflow-hidden bg-[#0d2b1a] py-24 text-white">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#a3d977]">Get in Touch</h2>
            <h3 className="mb-6 font-serif text-4xl md:text-5xl">Discuss GaaS Access or Collaboration</h3>
            <p className="text-lg text-white/70">
              Interested in live greenhouse data, AI crop services, research exports, or a deployment partnership?
              Reach out to the team.
            </p>
          </motion.div>
        </div>

        <div className="mx-auto grid max-w-5xl gap-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-12 space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <MapPin className="h-6 w-6 text-[#a3d977]" />
                </div>
                <div>
                  <p className="mb-1 font-bold text-white">Address</p>
                  <p className="text-white/70">Kakatiya Institute of Technology and Science (KITSW)</p>
                  <p className="text-white/70">Warangal, Telangana — 506015, India</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Mail className="h-6 w-6 text-[#a3d977]" />
                </div>
                <div>
                  <p className="mb-1 font-bold text-white">Department</p>
                  <p className="text-white/70">CSE(IoT) — Industrial IoT Laboratory</p>
                  <p className="text-sm text-white/60">iot-lab@kitsw.ac.in</p>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-4 text-sm font-bold uppercase tracking-wider text-white/60">
                Follow the Project
              </p>
              <div className="flex gap-3">
                <SocialIcon label="LinkedIn" href="https://linkedin.com">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
                    <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zM8.34 18.34V10.5H5.67v7.84h2.67zM7 9.34a1.55 1.55 0 100-3.11 1.55 1.55 0 000 3.11zm11.34 9V14.1c0-2.27-1.21-3.32-2.83-3.32-1.3 0-1.88.71-2.2 1.21V10.5H10.6v7.84h2.7v-4.38c0-1.16.21-2.28 1.65-2.28 1.42 0 1.44 1.33 1.44 2.36v4.3h2.95z" />
                  </svg>
                </SocialIcon>
                <SocialIcon label="Twitter" href="https://twitter.com">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817-5.967 6.817H1.677l7.73-8.835L1.254 2.25h6.832l4.713 6.231 5.445-6.231zm-1.16 17.52h1.834L7.084 4.126H5.117L17.084 19.77z" />
                  </svg>
                </SocialIcon>
                <SocialIcon label="GitHub" href="https://github.com">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.475 2 2 6.487 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.704-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.31.678.92.678 1.855 0 1.339-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.487 17.522 2 12 2z"
                    />
                  </svg>
                </SocialIcon>
              </div>
            </div>

            <p className="mt-8 text-sm text-white/50">
              Prefer the in-app workflow?{" "}
              <Link to="/help" className="underline decoration-[#a3d977]/50 hover:text-[#a3d977]">
                Help Center
              </Link>{" "}
              (after you sign in).
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            {sent ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-md">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#a3d977]/20">
                  <Send className="h-8 w-8 text-[#a3d977]" />
                </div>
                <h4 className="mb-3 font-serif text-2xl font-bold text-white">Message Sent</h4>
                <p className="text-white/70">Thank you for reaching out. The team will respond within 48 hours.</p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your full name"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/30 transition-colors focus:border-[#a3d977] focus:outline-none"
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/30 transition-colors focus:border-[#a3d977] focus:outline-none"
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us which GaaS service or collaboration you are interested in..."
                    className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/30 transition-colors focus:border-[#a3d977] focus:outline-none"
                    data-testid="input-message"
                  />
                </div>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a3d977] py-4 font-bold text-[#0d2b1a] transition-colors hover:bg-[#b8e88a]"
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
          className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-10 md:flex-row"
        >
          <div className="flex items-center gap-2 text-white/60">
            <Leaf className="h-5 w-5 text-[#a3d977]" />
            <span className="font-serif font-medium text-white">Smart Greenhouse as a Service</span>
          </div>
          <p className="text-sm text-white/40">
            Kakatiya Institute of Technology and Science — CSE(IoT) Department, Warangal
          </p>
          <p className="text-sm text-white/40">&copy; {new Date().getFullYear()} KITSW. All rights reserved.</p>
        </motion.div>
      </div>
    </section>
  );
}
