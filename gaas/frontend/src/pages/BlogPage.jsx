import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api";

export default function BlogPage() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/cms/blogs")
      .then(({ data }) => setBlogs(data.blogs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 text-gaas-muted text-sm animate-pulse">
        Loading blog posts...
      </div>
    );
  }

  return (
    <div className="animate-in">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-card p-5 mb-6"
      >
        <h1 className="text-2xl font-bold text-gaas-heading">Blog</h1>
        <p className="text-sm text-gaas-muted mt-1">
          Latest updates, articles, and insights from the GaaS team.
        </p>
      </motion.div>

      {blogs.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-gaas-muted text-sm">No blog posts published yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog, idx) => (
            <motion.div
              key={blog._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
            >
              <Link
                to={`/blog/${blog._id}`}
                className="block glass-card overflow-hidden hover:shadow-lg transition-shadow group"
              >
                {blog.thumbnail ? (
                  <div className="h-44 overflow-hidden">
                    <img
                      src={blog.thumbnail}
                      alt={blog.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.target.parentElement.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-44 bg-gradient-to-br from-gaas-accent/20 to-emerald-50 flex items-center justify-center">
                    <span className="text-4xl">📝</span>
                  </div>
                )}
                <div className="p-5">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gaas-accent/10 text-gaas-accent font-semibold capitalize">
                      {blog.category || "general"}
                    </span>
                    {(blog.tags || []).slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="font-bold text-gaas-heading text-base mb-1 line-clamp-2 group-hover:text-gaas-accent transition-colors">
                    {blog.title}
                  </h2>
                  <p className="text-xs text-gaas-muted line-clamp-2 mb-3">
                    {(blog.content || "").slice(0, 140)}
                    {(blog.content || "").length > 140 ? "..." : ""}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-gaas-muted">
                    <span>By {blog.author}</span>
                    <span>
                      {blog.publishDate
                        ? new Date(blog.publishDate).toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
