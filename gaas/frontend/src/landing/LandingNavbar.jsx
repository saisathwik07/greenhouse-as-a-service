import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  { label: "Contact", href: "#contact" }
];

function scrollToHash(id) {
  const el = document.querySelector(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export default function LandingNavbar() {
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
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0d2b1a]/95 backdrop-blur-xl shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <button
          type="button"
          onClick={() => scrollToHash("#hero")}
          className="flex items-center gap-2 text-lg font-bold text-white"
          data-testid="nav-logo"
        >
          <Leaf className="h-6 w-6 text-[#a3d977]" />
          <span className="font-serif">SmartGreenhouse</span>
        </button>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => scrollToHash(link.href)}
              className="rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              data-testid={`nav-${link.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              {link.label}
            </button>
          ))}
          <Link
            to="/login"
            className="ml-2 rounded-full bg-[#a3d977] px-4 py-2 text-sm font-semibold text-[#0d2b1a] transition-colors hover:bg-[#b8e88a]"
            data-testid="nav-cta"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          className="text-white lg:hidden"
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
            className="border-t border-white/10 bg-[#0d2b1a]/98 backdrop-blur-xl lg:hidden"
          >
            <div className="container mx-auto flex flex-col gap-1 px-4 py-4">
              {links.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => {
                    scrollToHash(link.href);
                    setMenuOpen(false);
                  }}
                  className="rounded-lg px-3 py-3 text-left text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                </button>
              ))}
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg bg-[#a3d977] px-3 py-3 text-center text-sm font-semibold text-[#0d2b1a]"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
