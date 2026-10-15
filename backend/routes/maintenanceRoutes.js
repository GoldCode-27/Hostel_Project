const express = require("express");
const router = express.Router();
const Maintenance = require("../models/Maintenance");
const Notification = require("../models/Notification"); // NEW IMPORT
const User = require("../models/User");
const { protect, isAdminOrStaff } = require("../middleware/authMiddleware");
const { generateMaintenanceSuggestion } = require("../utils/gemini");

router.post("/assist", protect, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();

  if (!["resident", "staff", "admin"].includes(req.user.role)) {
    return res
      .status(403)
      .json({ message: "Not authorized to request assistance" });
  }

  if (req.user.role === "resident" && !req.user.assignedRoom) {
    return res.status(400).json({
      message: "Room assignment is required to request maintenance assistance",
    });
  }

  if (!title && !description) {
    return res
      .status(400)
      .json({ message: "Enter a title or description to get suggestions" });
  }

  if (title.length > 160 || description.length > 4000) {
    return res
      .status(400)
      .json({ message: "Title or description is too long" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      message:
        "AI assistance is not configured. Set GEMINI_API_KEY on the backend.",
    });
  }

  try {
    const suggestion = await generateMaintenanceSuggestion({
      title,
      description,
    });
    res.json(suggestion);
  } catch (err) {
    console.error("Gemini maintenance assistance error:", err.message);
    res.status(502).json({
      message: "AI assistance is temporarily unavailable. Please try again.",
    });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const { title, description, category, priority, issuePic } = req.body;

    if (req.user.role !== "resident") {
      return res
        .status(403)
        .json({ message: "Only residents can submit maintenance requests" });
    }

    if (!req.user.assignedRoom) {
      return res.status(400).json({
        message:
          "Room assignment is required before submitting a maintenance request",
      });
    }

    const cleanTitle = String(title || "").trim();
    const cleanDescription = String(description || "").trim();
    const allowedCategories = [
      "Plumbing",
      "Electrical",
      "HVAC",
      "Cleaning",
      "Furniture",
      "Security",
      "Other",
    ];
    const allowedPriorities = ["Low", "Medium", "High", "Emergency"];

    if (cleanTitle.length < 3) {
      return res
        .status(400)
        .json({ message: "Issue title must be at least 3 characters" });
    }

    if (cleanDescription.length < 10) {
      return res
        .status(400)
        .json({ message: "Description must be at least 10 characters" });
    }

    if (category && !allowedCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category selected" });
    }

    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority selected" });
    }

    const newRequest = new Maintenance({
      resident: req.user._id,
      title: cleanTitle,
      description: cleanDescription,
      category: category || "Other",
      priority: priority || "Low",
      issuePic,
    });
    const savedRequest = await newRequest.save();
    res.status(201).json(savedRequest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/my", protect, async (req, res) => {
  try {
    const requests = await Maintenance.find({ resident: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/", protect, isAdminOrStaff, async (req, res) => {
  try {
    const requests = await Maintenance.find()
      .populate({
        path: "resident",
        select: "name contactNumber assignedRoom",
        populate: { path: "assignedRoom", select: "roomNumber" },
      })
      .sort({ createdAt: -1 })
      .lean();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", protect, isAdminOrStaff, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Maintenance.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = status;
    if (status === "Resolved") request.resolvedAt = Date.now();
    await request.save();

    // --- 🔴 AUTOMATIC NOTIFICATION TRIGGER ---
    await Notification.create({
      recipient: request.resident,
      title: "Maintenance Update",
      message: `Your request "${request.title}" has been marked as ${status}.`,
      type: "maintenance",
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
