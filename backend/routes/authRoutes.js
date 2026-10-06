const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

// --- SIGNUP ROUTE ---
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      contactNumber,
      address,
      profilePic,
      guardianName,
      emergencyContact,
      bloodGroup,
      courseDetails,
      idProof,
    } = req.body;
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (
      !String(name || "").trim() ||
      !isValidEmail(cleanEmail) ||
      String(password || "").length < 6
    ) {
      return res
        .status(400)
        .json({
          message: "Name, valid email, and 6 character password are required",
        });
    }

    if (
      digitsOnly(contactNumber).length < 10 ||
      digitsOnly(emergencyContact).length < 10
    ) {
      return res
        .status(400)
        .json({
          message: "Valid contact and emergency phone numbers are required",
        });
    }

    if (
      !String(address || "").trim() ||
      !String(guardianName || "").trim() ||
      !String(courseDetails || "").trim() ||
      !idProof
    ) {
      return res
        .status(400)
        .json({
          message:
            "Address, guardian, course details, and ID proof are required",
        });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser)
      return res
        .status(400)
        .json({ message: "User already exists with this email" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Hardcode role to 'resident' for security.
    // Admins/Staff are created from the dashboard.
    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: "resident",
      contactNumber: digitsOnly(contactNumber),
      address: address.trim(),
      profilePic,
      guardianName: guardianName.trim(),
      emergencyContact: digitsOnly(emergencyContact),
      bloodGroup,
      courseDetails: courseDetails.trim(),
      idProof,
    });

    await newUser.save();
    res.status(201).json({ message: "Resident registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- LOGIN ROUTE ---
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!isValidEmail(cleanEmail) || !password) {
      return res
        .status(400)
        .json({ message: "Valid email and password are required" });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "my_super_secret_key_123",
      { expiresIn: "1d" },
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedRoom: user.assignedRoom,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
