const express = require("express");
const User = require("../models/User");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();

const ALLOWED_PURPOSES = ["", "research", "teaching", "commercial", "learning", "other"];
const ALLOWED_USER_TYPES = ["", "student", "researcher", "faculty", "individual", "organization"];

/** Trim + cap helper used for free-text profile strings. */
function clean(input, max = 120) {
  if (typeof input !== "string") return undefined;
  return input.trim().slice(0, max);
}

/**
 * GET /api/user/profile
 * Returns the logged-in user's profile fields the dashboard surfaces.
 */
router.get("/profile", authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select(
        "name email role plan institution degree yearOfStudy department researchDomain userType purposeOfUsage createdAt lastLoginAt lastActiveAt loginCount"
      )
      .lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      institution: user.institution || "",
      degree: user.degree || "",
      yearOfStudy: user.yearOfStudy || "",
      department: user.department || "",
      researchDomain: user.researchDomain || "",
      userType: user.userType || "",
      purposeOfUsage: user.purposeOfUsage || "",
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      lastActiveAt: user.lastActiveAt,
      loginCount: user.loginCount || 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/user/profile
 * Body: { name?, institution?, degree?, yearOfStudy?, department?,
 *         researchDomain?, userType?, purposeOfUsage? } — partial update.
 */
router.put("/profile", authenticate, async (req, res, next) => {
  try {
    const update = {};
    const name = clean(req.body?.name, 80);
    if (name !== undefined) update.name = name;

    const institution = clean(req.body?.institution, 160);
    if (institution !== undefined) update.institution = institution;

    const degree = clean(req.body?.degree, 80);
    if (degree !== undefined) update.degree = degree;

    const yearOfStudy = clean(req.body?.yearOfStudy, 20);
    if (yearOfStudy !== undefined) update.yearOfStudy = yearOfStudy;

    const department = clean(req.body?.department, 120);
    if (department !== undefined) update.department = department;

    const researchDomain = clean(req.body?.researchDomain, 160);
    if (researchDomain !== undefined) update.researchDomain = researchDomain;

    if (typeof req.body?.userType === "string") {
      const t = req.body.userType.trim().toLowerCase();
      if (!ALLOWED_USER_TYPES.includes(t)) {
        return res.status(400).json({
          error: `userType must be one of: ${ALLOWED_USER_TYPES.filter(Boolean).join(", ")}`,
        });
      }
      update.userType = t;
    }

    if (typeof req.body?.purposeOfUsage === "string") {
      const p = req.body.purposeOfUsage.trim().toLowerCase();
      if (!ALLOWED_PURPOSES.includes(p)) {
        return res.status(400).json({
          error: `purposeOfUsage must be one of: ${ALLOWED_PURPOSES.filter(Boolean).join(", ")}`,
        });
      }
      update.purposeOfUsage = p;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No editable fields supplied" });
    }

    const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true })
      .select(
        "name email institution degree yearOfStudy department researchDomain userType purposeOfUsage"
      )
      .lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true, profile: user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
