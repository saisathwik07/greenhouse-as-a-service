import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Leaf } from "lucide-react";

const links = [
  { label: "About", href: "#about" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Technology", href: "#technology" },
  { label: "Services", href: "#services" },
  { label: "Gallery", href: "#gallery" },
  { label: "Team", href: "#team" },
  { label: "Results", href: "#results" },
  { label: "Contact", href: "#contact" },
];

function scrollTo(id: string) {
  const el = document.querySelector(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0d2b1a]/95 backdrop-blur-xl shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => scrollTo("#hero")}
          className="flex items-center gap-2 text-white font-bold text-lg"
          data-testid="nav-logo"
        >
          <Leaf className="h-6 w-6 text-[#a3d977]" />
          <span className="font-serif">SmartGreenhouse</span>
        </button>

        <div className="hidden lg:flex items-center gap-1">
          {links.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="px-3 py-2 text-sm text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              data-testid={`nav-${link.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => scrollTo("#contact")}
            className="ml-2 px-4 py-2 bg-[#a3d977] text-[#0d2b1a] font-semibold text-sm rounded-full hover:bg-[#b8e88a] transition-colors"
            data-testid="nav-cta"
          >
            Get in Touch
          </button>
        </div>

        <button
          className="lg:hidden text-white"
          onClick={() => setMenuOpen(!menuOpen)}
          data-testid="nav-menu-toggle"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#0d2b1a]/98 backdrop-blur-xl border-t border-white/10"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
              {links.map((link) => (
                <button
                  key={link.href}
                  onClick={() => { scrollTo(link.href); setMenuOpen(false); }}
                  className="text-left px-3 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
