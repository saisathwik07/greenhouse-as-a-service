const mongoose = require("mongoose");

/**
 * Dynamic section embedded in a Page.
 * Each section has a type that controls how the frontend renders it.
 */
const sectionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "hero_banner",
        "text",
        "image",
        "gallery",
        "services",
        "testimonials",
        "contact",
        "feature_cards",
        "custom",
      ],
    },
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    content: { type: String, default: "", maxlength: 10000 },
    image: { type: String, default: "" },
    /** For gallery / feature_cards — array of { title, description, image } */
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    visible: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true }
);

const pageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 100,
    },
    bannerImage: { type: String, default: "" },
    description: { type: String, default: "", maxlength: 2000 },
    sections: { type: [sectionSchema], default: [] },
    visible: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

pageSchema.index({ visible: 1, sortOrder: 1 });

module.exports =
  mongoose.models.Page || mongoose.model("Page", pageSchema);
