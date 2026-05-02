import { motion } from "framer-motion";
import { useState } from "react";
import { X } from "lucide-react";

interface GalleryProps {
  images: { src: string; alt: string }[];
}

export function Gallery({ images }: GalleryProps) {
  const [selected, setSelected] = useState<{ src: string; alt: string } | null>(null);

  const columns = [
    images.filter((_, i) => i % 3 === 0),
    images.filter((_, i) => i % 3 === 1),
    images.filter((_, i) => i % 3 === 2),
  ];

  return (
    <section id="gallery" className="py-24 bg-[#f5fbf0] overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[#5a9e3a] text-sm font-bold tracking-widest uppercase mb-3">Live Greenhouse</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
              The Greenhouse in Action
            </h3>
            <p className="text-muted-foreground text-lg">
              Real photographs from the field — every image a testament to the project's living, breathing reality.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-4">
              {col.map((img, imgIdx) => (
                <motion.div
                  key={imgIdx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: (colIdx * col.length + imgIdx) * 0.05 }}
                  className="group relative overflow-hidden rounded-2xl cursor-pointer shadow-md hover:shadow-xl transition-shadow"
                  onClick={() => setSelected(img)}
                  data-testid={`gallery-img-${colIdx}-${imgIdx}`}
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b1a]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-3 left-3 right-3 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {img.alt}
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setSelected(null)}
            data-testid="gallery-close"
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={selected.src}
            alt={selected.alt}
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </section>
  );
}
