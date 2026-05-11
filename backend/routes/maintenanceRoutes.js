const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');
const Notification = require('../models/Notification'); // NEW IMPORT
const User = require('../models/User');
const { protect, isAdminOrStaff } = require('../middleware/authMiddleware');

router.post('/', protect, async (req, res) => {
  try {
    const { title, description, priority, issuePic } = req.body;

    if (req.user.role !== 'resident') {
      return res.status(403).json({ message: 'Only residents can submit maintenance requests' });
    }

    if (!req.user.assignedRoom) {
      return res.status(400).json({ message: 'Room assignment is required before submitting a maintenance request' });
    }

    const cleanTitle = String(title || '').trim();
    const cleanDescription = String(description || '').trim();
    const allowedPriorities = ['Low', 'Medium', 'High', 'Emergency'];

    if (cleanTitle.length < 3) {
      return res.status(400).json({ message: 'Issue title must be at least 3 characters' });
    }

    if (cleanDescription.length < 10) {
      return res.status(400).json({ message: 'Description must be at least 10 characters' });
    }

    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority selected' });
    }

    const newRequest = new Maintenance({
      resident: req.user._id,
      title: cleanTitle,
      description: cleanDescription,
      priority: priority || 'Low',
      issuePic
    });
    const savedRequest = await newRequest.save();
    res.status(201).json(savedRequest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my', protect, async (req, res) => {
  try {
    const requests = await Maintenance.find({ resident: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', protect, isAdminOrStaff, async (req, res) => {
  try {
    const requests = await Maintenance.find()
      .populate({ path: 'resident', select: 'name contactNumber assignedRoom', populate: { path: 'assignedRoom', select: 'roomNumber' } })
      .sort({ createdAt: -1 })
      .lean();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, isAdminOrStaff, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Maintenance.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    
    request.status = status;
    if (status === 'Resolved') request.resolvedAt = Date.now();
    await request.save();

    // --- 🔴 AUTOMATIC NOTIFICATION TRIGGER ---
    await Notification.create({
      recipient: request.resident,
      title: 'Maintenance Update',
      message: `Your request "${request.title}" has been marked as ${status}.`,
      type: 'maintenance'
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;