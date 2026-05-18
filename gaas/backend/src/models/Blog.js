const mongoose = require("mongoose");

const BLOG_STATUSES = ["draft", "published"];

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    content: { type: String, default: "", maxlength: 50000 },
    thumbnail: { type: String, default: "" },
    author: { type: String, default: "Admin", trim: true, maxlength: 100 },
    publishDate: { type: Date, default: Date.now },
    category: { type: String, default: "general", trim: true, lowercase: true },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: BLOG_STATUSES,
      default: "draft",
      index: true,
    },
  },
  { timestamps: true }
);

blogSchema.index({ status: 1, publishDate: -1 });

module.exports =
  mongoose.models.Blog || mongoose.model("Blog", blogSchema);
module.exports.BLOG_STATUSES = BLOG_STATUSES;
