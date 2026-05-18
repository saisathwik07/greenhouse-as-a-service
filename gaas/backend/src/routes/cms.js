/**
 * CMS routes — public read endpoints + admin write endpoints.
 *
 * Mounted at /api/cms in server.js
 */
const express = require("express");
const WebsiteContent = require("../models/WebsiteContent");
const Service = require("../models/Service");
const Blog = require("../models/Blog");
const { authenticate } = require("../middleware/authenticate");
const { requireAdminRole } = require("../middleware/admin");

const router = express.Router();

/* ========================================================================== */
/*  WEBSITE CONTENT                                                           */
/* ========================================================================== */

/**
 * GET /api/cms/content  (public)
 * Returns the singleton website content document. Creates one with defaults
 * if none exists yet so the landing page always has content to render.
 */
router.get("/content", async (_req, res, next) => {
  try {
    let doc = await WebsiteContent.findOne().lean();
    if (!doc) {
      doc = await WebsiteContent.create({});
      doc = doc.toObject();
    }
    return res.json(doc);
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/cms/content  (admin)
 * Upsert — update the singleton content document.
 */
router.put("/content", authenticate, requireAdminRole, async (req, res, next) => {
  try {
    const allowed = [
      "heroTitle",
      "heroSubtitle",
      "heroDescription",
      "heroBackgroundImage",
      "aboutTitle",
      "aboutDescription",
      "aboutImage",
      "contactEmail",
      "contactPhone",
      "contactAddress",
      "testimonialsTitle",
      "homepageImages",
      "footerText",
      "sectionVisibility",
      "sectionOrder",
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    update.lastUpdatedBy = req.user?.id || null;

    const doc = await WebsiteContent.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    return res.json({ ok: true, content: doc });
  } catch (err) {
    return next(err);
  }
});

/* ========================================================================== */
/*  SERVICE MANAGEMENT                                                        */
/* ========================================================================== */

/**
 * GET /api/cms/services  (public)
 * Returns active services (for public pages). Admin can pass ?all=1 to include
 * inactive services.
 */
router.get("/services", async (req, res, next) => {
  try {
    const filter = req.query.all === "1" ? {} : { activeStatus: true };
    const services = await Service.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    return res.json({ services });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/cms/services  (admin)
 */
router.post("/services", authenticate, requireAdminRole, async (req, res, next) => {
  try {
    const { title, description, pricing, features, image, category, activeStatus, sortOrder } =
      req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    const service = await Service.create({
      title: String(title).trim(),
      description: description || "",
      pricing: pricing || "",
      features: Array.isArray(features) ? features : [],
      image: image || "",
      category: category || "general",
      activeStatus: activeStatus !== false,
      sortOrder: Number(sortOrder) || 0,
    });
    return res.status(201).json({ ok: true, service });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/cms/services/:id  (admin)
 */
router.put("/services/:id", authenticate, requireAdminRole, async (req, res, next) => {
  try {
    const allowed = [
      "title",
      "description",
      "pricing",
      "features",
      "image",
      "category",
      "activeStatus",
      "sortOrder",
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    return res.json({ ok: true, service });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /api/cms/services/:id  (admin)
 */
router.delete("/services/:id", authenticate, requireAdminRole, async (req, res, next) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    return res.json({ ok: true, deleted: req.params.id });
  } catch (err) {
    return next(err);
  }
});

/* ========================================================================== */
/*  BLOG MANAGEMENT                                                           */
/* ========================================================================== */

/**
 * GET /api/cms/blogs  (public)
 * Returns published blogs (newest first). Admin can pass ?all=1 to include drafts.
 */
router.get("/blogs", async (req, res, next) => {
  try {
    const filter = req.query.all === "1" ? {} : { status: "published" };
    const blogs = await Blog.find(filter)
      .sort({ publishDate: -1, createdAt: -1 })
      .lean();
    return res.json({ blogs });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/cms/blogs/:id  (public)
 */
router.get("/blogs/:id", async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id).lean();
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    return res.json({ blog });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/cms/blogs  (admin)
 */
router.post("/blogs", authenticate, requireAdminRole, async (req, res, next) => {
  try {
    const { title, content, thumbnail, author, publishDate, category, tags, status } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    const blog = await Blog.create({
      title: String(title).trim(),
      content: content || "",
      thumbnail: thumbnail || "",
      author: author || "Admin",
      publishDate: publishDate || new Date(),
      category: category || "general",
      tags: Array.isArray(tags) ? tags : [],
      status: status === "published" ? "published" : "draft",
    });
    return res.status(201).json({ ok: true, blog });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/cms/blogs/:id  (admin)
 */
router.put("/blogs/:id", authenticate, requireAdminRole, async (req, res, next) => {
  try {
    const allowed = [
      "title",
      "content",
      "thumbnail",
      "author",
      "publishDate",
      "category",
      "tags",
      "status",
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    return res.json({ ok: true, blog });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /api/cms/blogs/:id  (admin)
 */
router.delete("/blogs/:id", authenticate, requireAdminRole, async (req, res, next) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    return res.json({ ok: true, deleted: req.params.id });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
