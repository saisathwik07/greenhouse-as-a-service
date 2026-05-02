import { useRef, useState } from "react";

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/gif";

/**
 * Reusable image dropzone with previews + remove buttons. Holds its own
 * preview list and exposes the deduplicated File[] via `onChange`.
 */
export default function ScreenshotDropzone({ files, onChange, disabled, idPrefix = "ss" }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  function handlePicked(list) {
    setError("");
    const next = Array.isArray(files) ? [...files] : [];
    for (const f of list) {
      if (!f.type.startsWith("image/")) {
        setError("Only images are supported (PNG, JPG, WEBP, GIF).");
        continue;
      }
      if (f.size > MAX_BYTES) {
        setError(`"${f.name}" is larger than 5 MB.`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        setError(`You can attach at most ${MAX_FILES} screenshots.`);
        break;
      }
      const dup = next.some(
        (x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified
      );
      if (!dup) next.push(f);
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(idx) {
    const next = (files || []).filter((_, i) => i !== idx);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={`${idPrefix}-input`}
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gaas-border bg-gray-50/60 px-4 py-5 text-center transition cursor-pointer hover:border-gaas-accent/50 hover:bg-gaas-accent/5 ${
          disabled ? "opacity-60 pointer-events-none" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (disabled) return;
          handlePicked(Array.from(e.dataTransfer.files || []));
        }}
      >
        <p className="text-sm font-semibold text-gaas-heading">
          Drop screenshots or click to browse
        </p>
        <p className="text-[11px] text-gaas-muted">
          Up to {MAX_FILES} images · 5 MB each · PNG / JPG / WEBP / GIF
        </p>
        <input
          ref={inputRef}
          id={`${idPrefix}-input`}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handlePicked(Array.from(e.target.files || []))}
        />
      </label>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </p>
      )}

      {!!files?.length && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {files.map((f, idx) => {
            const url = URL.createObjectURL(f);
            return (
              <li
                key={`${f.name}-${idx}`}
                className="relative group rounded-lg overflow-hidden border border-gaas-border bg-white"
              >
                <img
                  src={url}
                  alt={f.name}
                  className="h-20 w-full object-cover"
                  onLoad={() => URL.revokeObjectURL(url)}
                />
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="absolute top-1 right-1 rounded-full bg-black/70 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center hover:bg-red-600"
                  aria-label="Remove attachment"
                  disabled={disabled}
                >
                  ×
                </button>
                <p className="text-[10px] text-gaas-muted truncate px-1.5 pb-1">
                  {f.name}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
