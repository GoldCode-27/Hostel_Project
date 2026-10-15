const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  assistantFallback,
  generateHostelAssistantAnswer,
  isHostelAssistantQuestion,
} = require("../utils/gemini");

router.post("/chat", protect, async (req, res) => {
  const question = String(req.body.question || "").trim();

  if (question.length < 2 || question.length > 1200) {
    return res.status(400).json({
      message: "Enter a question between 2 and 1200 characters",
    });
  }

  if (!isHostelAssistantQuestion(question)) {
    return res.json({ answer: assistantFallback });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      message:
        "AI assistant is not configured. Set GEMINI_API_KEY on the backend.",
    });
  }

  try {
    const result = await generateHostelAssistantAnswer(question);
    res.json({ answer: result.supported ? result.answer : assistantFallback });
  } catch (err) {
    console.error("Hostel assistant error:", err.message);
    res.status(502).json({
      message: "The assistant is temporarily unavailable. Please try again.",
    });
  }
});

module.exports = router;
