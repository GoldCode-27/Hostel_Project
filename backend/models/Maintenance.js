const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema(
  {
    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "Plumbing",
        "Electrical",
        "HVAC",
        "Cleaning",
        "Furniture",
        "Security",
        "Other",
      ],
      default: "Other",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Emergency"],
      default: "Low",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved"],
      default: "Pending",
    },
    issuePic: { type: String }, // Base64 optional image
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Maintenance", maintenanceSchema);
