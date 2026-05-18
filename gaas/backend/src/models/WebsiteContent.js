const mongoose = require("mongoose");

/**
 * Singleton document holding all editable website content.
 * Only one document should exist (upserted by the admin CMS).
 */
const websiteContentSchema = new mongoose.Schema(
  {
    /* Hero section */
    heroTitle: { type: String, default: "Smart Greenhouse as a Service" },
    heroSubtitle: {
      type: String,
      default: "KITSW CSE(IoT) Greenhouse-as-a-Service Platform",
    },
    heroDescription: {
      type: String,
      default:
        "A full-stack smart agriculture service combining live IoT telemetry, crop and yield AI, fertigation advisory, MQTT monitoring, subscriptions, and support workflows.",
    },

    /* About section */
    aboutTitle: {
      type: String,
      default: "From Greenhouse Prototype to Service Platform",
    },
    aboutDescription: {
      type: String,
      default:
        "Greenhouse as a Service (GaaS) extends the KITSW CSE(IoT) smart greenhouse into a production-oriented platform for growers, students, faculty, and research teams. It connects field sensors, dashboards, AI models, subscriptions, and support into one service flow.",
    },

    /* Testimonials section */
    testimonialsTitle: {
      type: String,
      default: "What Our Users Say",
    },

    /* Contact section */
    contactEmail: { type: String, default: "iot-lab@kitsw.ac.in" },
    contactPhone: { type: String, default: "" },
    contactAddress: {
      type: String,
      default:
        "Kakatiya Institute of Technology and Science (KITSW), Warangal, Telangana — 506015, India",
    },

    /* Homepage images (array of URLs) */
    homepageImages: { type: [String], default: [] },

    /* Footer */
    footerText: {
      type: String,
      default: "© KITSW. All rights reserved.",
    },

    /** Who last saved this document. */
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.WebsiteContent ||
  mongoose.model("WebsiteContent", websiteContentSchema);
