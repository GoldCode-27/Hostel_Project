const express = require("express");
const router = express.Router();
const Billing = require("../models/Billing");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { protect, isAdminOrStaff } = require("../middleware/authMiddleware");
const crypto = require("crypto");
const chapaConfig = require("../config/chapa");
const { initiateChapaPayment, verifyChapaPayment } = require("../utils/chapa");

const getBackendBaseUrl = (req) => {
  const requestBaseUrl = `${req.protocol}://${req.get("host")}`;
  const configuredUrl = chapaConfig.backendUrl;

  if (configuredUrl) {
    const configuredIsLocalhost = /localhost|127\.0\.0\.1/i.test(configuredUrl);
    const requestIsLocalhost = /localhost|127\.0\.0\.1/i.test(requestBaseUrl);

    if (!configuredIsLocalhost || requestIsLocalhost) {
      return configuredUrl;
    }
  }

  return requestBaseUrl;
};

const buildBillingReturnUrl = (req) => {
  const requestedReturnUrl = req.body.returnUrl;
  const frontendBaseUrl =
    requestedReturnUrl || chapaConfig.frontendUrl || req.get("origin");

  if (!frontendBaseUrl) return null;
  return `${frontendBaseUrl.replace(/\/+$/, "")}/dashboard/billing`;
};

const withPaymentStatus = (returnUrl, status, invoiceId) => {
  if (!returnUrl) return null;
  const separator = returnUrl.includes("?") ? "&" : "?";
  const invoiceParam = invoiceId
    ? `&invoiceId=${encodeURIComponent(invoiceId)}`
    : "";
  return `${returnUrl}${separator}payment=${status}${invoiceParam}`;
};

const normalizeBillingMonth = (month) =>
  String(month || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeAmount = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : NaN;
};

const applyChapaVerificationToInvoice = async (invoice, verification) => {
  const transaction = verification?.data;
  if (!transaction || transaction.tx_ref !== invoice.transactionId)
    return "PENDING";

  const transactionStatus = String(transaction.status || "").toLowerCase();
  if (transactionStatus === "success") {
    const amountMatches =
      Math.abs(Number(transaction.amount) - Number(invoice.totalAmount)) < 0.01;
    const currencyMatches =
      String(transaction.currency || "").toUpperCase() ===
      String(invoice.currency || chapaConfig.currency).toUpperCase();

    if (!amountMatches || !currencyMatches) return "MISMATCH";

    invoice.status = "Paid";
    invoice.gatewayReference = transaction.reference || transaction.tx_ref;
    invoice.paidAt = Date.now();
    await invoice.save();
    return "COMPLETED";
  }

  if (["failed", "cancelled", "canceled"].includes(transactionStatus)) {
    invoice.status = "Failed";
    await invoice.save();
    return "FAILED";
  }

  return "PENDING";
};

// @route   POST /api/billing
// @desc    Generate a new invoice (Admin/Staff)
router.post("/", protect, isAdminOrStaff, async (req, res) => {
  try {
    const {
      residentId,
      month,
      additionalService,
      additionalAmount,
      discount,
      lateFee,
      dueDate,
    } = req.body;
    const billingMonth = normalizeBillingMonth(month);
    const extraAmount = normalizeAmount(additionalAmount);
    const discountAmount = normalizeAmount(discount);
    const lateFeeAmount = normalizeAmount(lateFee);

    if (!residentId || !billingMonth || !dueDate) {
      return res.status(400).json({
        message: "Resident, billing month, and due date are required",
      });
    }

    if (
      [extraAmount, discountAmount, lateFeeAmount].some(
        (amount) => Number.isNaN(amount) || amount < 0,
      )
    ) {
      return res
        .status(400)
        .json({ message: "Amounts must be valid zero or positive numbers" });
    }

    const user = await User.findById(residentId).populate("assignedRoom");
    if (!user) return res.status(404).json({ message: "Resident not found" });
    if (!user.assignedRoom)
      return res.status(400).json({ message: "Resident has no assigned room" });

    const existingInvoice = await Billing.findOne({
      resident: residentId,
      month: new RegExp(
        `^${billingMonth.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i",
      ),
    }).lean();

    if (existingInvoice) {
      return res.status(409).json({
        message: `Invoice for ${billingMonth} already exists for this resident`,
      });
    }

    const roomFee = user.assignedRoom.pricePerMonth;
    const totalAmount = roomFee + extraAmount + lateFeeAmount - discountAmount;

    if (totalAmount < 0) {
      return res
        .status(400)
        .json({ message: "Discount cannot be greater than the invoice total" });
    }

    const invoice = new Billing({
      resident: residentId,
      room: user.assignedRoom._id,
      month: billingMonth,
      roomFee,
      additionalService: additionalService?.trim() || "",
      additionalAmount: extraAmount,
      discount: discountAmount,
      lateFee: lateFeeAmount,
      totalAmount,
      currency: chapaConfig.currency,
      dueDate,
      transactionId: `TXN-${Date.now()}`,
    });

    await invoice.save();

    await Notification.create({
      recipient: residentId,
      title: "New Invoice Generated",
      message: `Your invoice for ${month} has been generated. Total amount: ${chapaConfig.currency} ${totalAmount}.`,
      type: "billing",
    });

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/billing
router.get("/", protect, isAdminOrStaff, async (req, res) => {
  try {
    const invoices = await Billing.find()
      .populate("resident", "name email contactNumber")
      .populate("room", "roomNumber")
      .sort({ createdAt: -1 })
      .lean();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/billing/my
router.get("/my", protect, async (req, res) => {
  try {
    const invoices = await Billing.find({ resident: req.user._id })
      .populate("room", "roomNumber")
      .sort({ createdAt: -1 })
      .lean();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/billing/:id/initiate-payment
// @desc    Creates a Chapa checkout session
router.post("/:id/initiate-payment", protect, async (req, res) => {
  try {
    const invoice = await Billing.findById(req.params.id).populate("resident");
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    if (
      req.user.role === "resident" &&
      invoice.resident._id.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "You can only pay your own invoice" });
    }

    if (invoice.status === "Paid") {
      return res.status(400).json({ message: "Invoice is already paid" });
    }

    const invoiceCurrency = invoice.currency || "INR";
    if (invoiceCurrency !== chapaConfig.currency) {
      return res.status(409).json({
        message: `This invoice is in ${invoiceCurrency}. Generate a new invoice in ${chapaConfig.currency} before accepting Chapa payment.`,
      });
    }

    if (!chapaConfig.secretKey) {
      return res
        .status(500)
        .json({ message: "CHAPA_SECRET_KEY is not configured" });
    }

    const returnUrl = buildBillingReturnUrl(req);
    if (!returnUrl) {
      return res.status(400).json({ message: "Payment return URL is missing" });
    }

    const txRef = `CHAPA-${invoice._id}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    invoice.transactionId = txRef;
    invoice.status = "Pending";
    await invoice.save();

    const callbackUrl = `${getBackendBaseUrl(req)}/api/billing/payment-callback`;
    const [firstName, ...lastNameParts] = String(
      invoice.resident.name || "Resident",
    )
      .trim()
      .split(/\s+/);
    const payload = {
      amount: String(invoice.totalAmount),
      currency: invoice.currency,
      email: invoice.resident.email,
      first_name: firstName,
      last_name: lastNameParts.join(" ") || firstName,
      tx_ref: txRef,
      callback_url: callbackUrl,
      return_url: withPaymentStatus(returnUrl, "pending", invoice._id),
      customization: {
        title: "Hostel bill payment",
        description: `Payment for ${invoice.month}`,
      },
    };

    const paymentResponse = await initiateChapaPayment(payload);
    const redirectUrl = paymentResponse?.data?.checkout_url;

    if (!redirectUrl) {
      return res.status(502).json({
        message:
          paymentResponse?.message || "Chapa did not return a checkout URL",
      });
    }

    res.json({ redirectUrl });
  } catch (err) {
    console.error(
      "Chapa initialization error:",
      err.response?.data || err.message,
    );
    res.status(502).json({
      message:
        err.response?.data?.message ||
        err.response?.data?.code ||
        "Error initiating payment gateway",
    });
  }
});

// @route   POST /api/billing/payment-callback
// @desc    Re-verifies Chapa callbacks before updating invoices
router.post("/payment-callback", async (req, res) => {
  try {
    const txRef = req.body?.tx_ref || req.body?.data?.tx_ref;
    if (!txRef) {
      return res
        .status(400)
        .json({ message: "Missing Chapa transaction reference" });
    }

    const invoice = await Billing.findOne({ transactionId: txRef });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    if (invoice.status !== "Paid") {
      const verification = await verifyChapaPayment(txRef);
      await applyChapaVerificationToInvoice(invoice, verification);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error(
      "Chapa callback verification error:",
      err.response?.data || err.message,
    );
    return res
      .status(502)
      .json({ message: "Unable to verify Chapa payment callback" });
  }
});

// @route   POST /api/billing/:id/refresh-payment
// @desc    Verifies Chapa transaction status and updates invoice
router.post("/:id/refresh-payment", protect, async (req, res) => {
  try {
    const invoice = await Billing.findById(req.params.id).populate("resident");
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    if (
      req.user.role === "resident" &&
      invoice.resident._id.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "You can only check your own invoice" });
    }

    if (invoice.status === "Paid") {
      return res.json({ invoice, paymentState: "COMPLETED" });
    }

    if (!invoice.transactionId) {
      return res
        .status(400)
        .json({ message: "No Chapa transaction found for this invoice" });
    }

    const verification = await verifyChapaPayment(invoice.transactionId);
    const paymentState = await applyChapaVerificationToInvoice(
      invoice,
      verification,
    );

    res.json({
      invoice,
      paymentState,
    });
  } catch (err) {
    console.error(
      "Chapa status verification error:",
      err.response?.data || err.message,
    );
    res.status(502).json({
      message:
        err.response?.data?.message || "Unable to refresh payment status",
    });
  }
});

// Manual Admin Override
router.put("/:id/pay", protect, isAdminOrStaff, async (req, res) => {
  try {
    const invoice = await Billing.findById(req.params.id);
    invoice.status = "Paid";
    invoice.paidAt = Date.now();
    await invoice.save();
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
