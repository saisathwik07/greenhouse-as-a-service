import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api";

export default function BlogPostPage() {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/cms/blogs/${id}`)
      .then(({ data }) => setBlog(data.blog))
      .catch(() => setError("Blog post not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-12 text-gaas-muted text-sm animate-pulse">
        Loading post...
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="glass-card p-8 text-center animate-in">
        <p className="text-red-600 text-sm mb-4">{error || "Post not found."}</p>
        <Link to="/blog" className="text-sm text-gaas-accent hover:underline">
          ← Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="animate-in max-w-3xl mx-auto"
    >
      <Link
        to="/blog"
        className="inline-flex items-center text-sm text-gaas-muted hover:text-gaas-heading mb-4"
      >
        ← Back to Blog
      </Link>

      {blog.thumbnail && (
        <div className="rounded-xl overflow-hidden mb-6 shadow-lg">
          <img
            src={blog.thumbnail}
            alt={blog.title}
            className="w-full h-64 md:h-80 object-cover"
            onError={(e) => {
              e.target.parentElement.style.display = "none";
            }}
          />
        </div>
      )}

      <div className="glass-card p-6 md:p-8">
        <div className="flex gap-2 mb-4 flex-wrap">
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gaas-accent/10 text-gaas-accent font-semibold capitalize">
            {blog.category || "general"}
          </span>
          {(blog.tags || []).map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gaas-heading mb-3 leading-tight">
          {blog.title}
        </h1>

        <div className="flex items-center gap-4 text-xs text-gaas-muted mb-8 pb-4 border-b border-gaas-border">
          <span>By {blog.author}</span>
          <span>•</span>
          <span>
            {blog.publishDate
              ? new Date(blog.publishDate).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : ""}
          </span>
        </div>

        <div className="prose prose-sm max-w-none text-gaas-heading/80 leading-relaxed whitespace-pre-wrap">
          {blog.content}
        </div>
      </div>
    </motion.div>
  );
}
