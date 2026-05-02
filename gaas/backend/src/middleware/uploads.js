/**
 * Disk-based screenshot upload pipeline used by ticket endpoints.
 *
 * Files are stored under `uploads/tickets/<userId>/<random>.<ext>` and served
 * statically from the `/uploads` URL prefix. We deliberately keep this lean —
 * no S3, no antivirus — because tickets are low volume and admins inspect
 * uploads in-context.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const UPLOAD_ROOT = path.resolve(__dirname, "..", "..", "uploads");
const TICKET_UPLOAD_DIR = path.join(UPLOAD_ROOT, "tickets");

if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
if (!fs.existsSync(TICKET_UPLOAD_DIR))
  fs.mkdirSync(TICKET_UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per file.

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const uid = String(req.user?.id || "anon");
    const dir = path.join(TICKET_UPLOAD_DIR, uid);
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename(_req, file, cb) {
    const random = crypto.randomBytes(12).toString("hex");
    const ext = path.extname(file.originalname || "").toLowerCase().slice(0, 8);
    cb(null, `${Date.now()}-${random}${ext || ""}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
  cb(new Error("Only PNG/JPEG/WEBP/GIF images are allowed"));
};

const ticketUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
});

/**
 * Translate multer's `req.files` into the Attachment shape used by the
 * Ticket model. URLs are public-relative so the frontend can render them
 * via `<img src="/uploads/...">` without re-fetching.
 */
function filesToAttachments(files) {
  if (!Array.isArray(files)) return [];
  return files.map((f) => {
    const rel = path.relative(UPLOAD_ROOT, f.path).split(path.sep).join("/");
    return {
      url: `/uploads/${rel}`,
      filename: f.originalname || "",
      mimeType: f.mimetype || "",
      sizeBytes: f.size || 0,
    };
  });
}

/**
 * Express error wrapper so multer's `LIMIT_FILE_SIZE` etc. surface as JSON
 * instead of HTML stack traces.
 */
function multerErrorHandler(err, _req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    const code = err.code === "LIMIT_FILE_SIZE" ? "FILE_TOO_LARGE" : err.code;
    return res.status(400).json({ error: err.message, code });
  }
  if (err.message && err.message.includes("images are allowed")) {
    return res.status(400).json({ error: err.message, code: "BAD_FILE_TYPE" });
  }
  return next(err);
}

module.exports = {
  UPLOAD_ROOT,
  ticketUpload,
  filesToAttachments,
  multerErrorHandler,
};
