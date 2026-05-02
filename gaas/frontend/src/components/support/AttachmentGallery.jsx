import { useState } from "react";

/**
 * Render a row of saved screenshot thumbnails. Clicking opens a lightbox.
 * `attachments` are server-shaped `{ url, filename, mimeType, sizeBytes }`.
 */
export default function AttachmentGallery({ attachments, label }) {
  const [lightbox, setLightbox] = useState(null);
  if (!attachments?.length) return null;

  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-[11px] uppercase tracking-wide text-gaas-muted font-semibold">
          {label}
        </p>
      )}
      <ul className="flex flex-wrap gap-2">
        {attachments.map((a, idx) => (
          <li key={`${a.url}-${idx}`}>
            <button
              type="button"
              onClick={() => setLightbox(a)}
              className="block rounded-md overflow-hidden border border-gaas-border bg-white hover:border-gaas-accent/60 transition"
              title={a.filename || "screenshot"}
            >
              <img
                src={a.url}
                alt={a.filename || `attachment ${idx + 1}`}
                className="h-16 w-16 object-cover"
                loading="lazy"
              />
            </button>
          </li>
        ))}
      </ul>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
        >
          <div
            className="relative max-w-4xl max-h-full bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 z-10 bg-black/70 text-white w-8 h-8 rounded-full text-lg font-bold hover:bg-red-600"
              aria-label="Close"
            >
              ×
            </button>
            <img
              src={lightbox.url}
              alt={lightbox.filename || "screenshot"}
              className="max-h-[80vh] max-w-[90vw] block"
            />
            <p className="px-4 py-2 text-xs text-gaas-muted bg-white border-t border-gaas-border">
              {lightbox.filename || "Untitled"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
