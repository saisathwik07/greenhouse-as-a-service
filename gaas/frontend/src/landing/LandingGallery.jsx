import { motion } from "framer-motion";
import { useState } from "react";
import { X } from "lucide-react";

export default function LandingGallery({ images }) {
  const [selected, setSelected] = useState(null);

  const columns = [
    images.filter((_, i) => i % 3 === 0),
    images.filter((_, i) => i % 3 === 1),
    images.filter((_, i) => i % 3 === 2)
  ];

  return (
    <section id="gallery" className="overflow-hidden bg-[#f5fbf0] py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#5a9e3a]">
              Live Greenhouse
            </h2>
            <h3 className="mb-6 font-serif text-4xl font-bold text-primary md:text-5xl">
              The Greenhouse in Action
            </h3>
            <p className="text-lg text-muted-foreground">
              Real photographs from the field — every image a testament to the project&apos;s living, breathing
              reality.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-4">
              {col.map((img, imgIdx) => (
                <motion.div
                  key={`${colIdx}-${imgIdx}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: (colIdx * col.length + imgIdx) * 0.05 }}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl shadow-md transition-shadow hover:shadow-xl"
                  onClick={() => setSelected(img)}
                  data-testid={`gallery-img-${colIdx}-${imgIdx}`}
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b1a]/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute bottom-3 left-3 right-3 text-sm font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {img.alt}
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelected(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 text-white/80 hover:text-white"
            onClick={() => setSelected(null)}
            data-testid="gallery-close"
            aria-label="Close"
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={selected.src}
            alt={selected.alt}
            className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
