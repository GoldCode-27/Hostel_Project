const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, isAdminOrStaff } = require('../middleware/authMiddleware');
const phonePeConfig = require('../config/phonepe');
const {
  decodePhonePeResponse,
  initiatePhonePePayment,
  checkPhonePePaymentStatus
} = require('../utils/phonepe');

const getBackendBaseUrl = (req) => {
  const requestBaseUrl = `${req.protocol}://${req.get('host')}`;
  const configuredUrl = phonePeConfig.backendUrl;

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
  const frontendBaseUrl = requestedReturnUrl || phonePeConfig.frontendUrl || req.get('origin');

  if (!frontendBaseUrl) return null;
  return `${frontendBaseUrl.replace(/\/+$/, '')}/dashboard/billing`;
};

const withPaymentStatus = (returnUrl, status, invoiceId) => {
  if (!returnUrl) return null;
  const separator = returnUrl.includes('?') ? '&' : '?';
  const invoiceParam = invoiceId ? `&invoiceId=${encodeURIComponent(invoiceId)}` : '';
  return `${returnUrl}${separator}payment=${status}${invoiceParam}`;
};

const normalizePhoneNumber = (number) => {
  const digits = String(number || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : undefined;
};

const normalizeBillingMonth = (month) => String(month || '').trim().replace(/\s+/g, ' ');

const normalizeAmount = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : NaN;
};

const isPaymentSuccessful = (statusResponse) => {
  if (isPaymentFailed(statusResponse)) return false;
  return statusResponse?.state === 'COMPLETED' ||
    statusResponse?.paymentDetails?.some((payment) => payment.state === 'COMPLETED');
};

const isPaymentFailed = (statusResponse) => {
  return ['FAILED', 'CANCELLED', 'CANCELED'].includes(statusResponse?.state) ||
    statusResponse?.paymentDetails?.some((payment) => ['FAILED', 'CANCELLED', 'CANCELED'].includes(payment.state));
};

const normalizePaymentState = (value) => String(value || '').toUpperCase();

const getPhonePeCallbackState = (phonePeResponse, query = {}) => {
  return normalizePaymentState(
    query.state ||
    query.status ||
    query.code ||
    phonePeResponse?.state ||
    phonePeResponse?.status ||
    phonePeResponse?.code ||
    phonePeResponse?.payload?.state ||
    phonePeResponse?.payload?.status ||
    phonePeResponse?.payload?.code ||
    phonePeResponse?.data?.state ||
    phonePeResponse?.data?.status ||
    phonePeResponse?.data?.code
  );
};

const isCallbackSuccessful = (callbackState) => {
  return ['COMPLETED', 'SUCCESS', 'PAYMENT_SUCCESS'].includes(callbackState);
};

const isCallbackFailed = (callbackState) => {
  return ['FAILED', 'FAILURE', 'PAYMENT_FAILED', 'PAYMENT_ERROR', 'PAYMENT_DECLINED', 'CANCELLED', 'CANCELED'].includes(callbackState) ||
    callbackState.includes('FAIL') ||
    callbackState.includes('CANCEL') ||
    callbackState.includes('DECLIN');
};

const isPhonePeSandbox = () => phonePeConfig.apiBaseUrl?.includes('pg-sandbox');

const isPhonePeSimulatorStatusError = (err) => {
  const message = err.response?.data?.message || err.message || '';
  return message.includes('getCustomApiScenario') || message.includes('Template.getCustomApiScenario');
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checkPhonePePaymentStatusWithRetry = async (merchantOrderId) => {
  let statusResponse;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    statusResponse = await checkPhonePePaymentStatus(merchantOrderId);

    if (isPaymentSuccessful(statusResponse) || isPaymentFailed(statusResponse)) {
      return statusResponse;
    }

    if (attempt < 2) {
      await sleep(1500);
    }
  }

  return statusResponse;
};

const getGatewayReference = (statusResponse) => {
  return statusResponse?.paymentDetails?.[0]?.transactionId || statusResponse?.orderId;
};

const applyPhonePeStatusToInvoice = async (invoice, statusResponse) => {
  if (isPaymentSuccessful(statusResponse)) {
    invoice.status = 'Paid';
    invoice.gatewayReference = getGatewayReference(statusResponse);
    invoice.paidAt = Date.now();
    await invoice.save();
    return invoice;
  }

  if (isPaymentFailed(statusResponse)) {
    invoice.status = 'Failed';
    await invoice.save();
  }

  return invoice;
};

const markInvoicePaidFromSandboxCallback = async (invoice) => {
  invoice.status = 'Paid';
  invoice.gatewayReference = invoice.gatewayReference || `${invoice.transactionId}-PHONEPE-UAT`;
  invoice.paidAt = Date.now();
  await invoice.save();
  return invoice;
};

// @route   POST /api/billing
// @desc    Generate a new invoice (Admin/Staff)
router.post('/', protect, isAdminOrStaff, async (req, res) => {
  try {
    const { residentId, month, additionalService, additionalAmount, discount, lateFee, dueDate } = req.body;
    const billingMonth = normalizeBillingMonth(month);
    const extraAmount = normalizeAmount(additionalAmount);
    const discountAmount = normalizeAmount(discount);
    const lateFeeAmount = normalizeAmount(lateFee);

    if (!residentId || !billingMonth || !dueDate) {
      return res.status(400).json({ message: "Resident, billing month, and due date are required" });
    }

    if ([extraAmount, discountAmount, lateFeeAmount].some((amount) => Number.isNaN(amount) || amount < 0)) {
      return res.status(400).json({ message: "Amounts must be valid zero or positive numbers" });
    }

    const user = await User.findById(residentId).populate('assignedRoom');
    if (!user) return res.status(404).json({ message: "Resident not found" });
    if (!user.assignedRoom) return res.status(400).json({ message: "Resident has no assigned room" });

    const existingInvoice = await Billing.findOne({
      resident: residentId,
      month: new RegExp(`^${billingMonth.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    }).lean();

    if (existingInvoice) {
      return res.status(409).json({ message: `Invoice for ${billingMonth} already exists for this resident` });
    }

    const roomFee = user.assignedRoom.pricePerMonth;
    const totalAmount = (roomFee + extraAmount + lateFeeAmount) - discountAmount;

    if (totalAmount < 0) {
      return res.status(400).json({ message: "Discount cannot be greater than the invoice total" });
    }

    const invoice = new Billing({
      resident: residentId,
      room: user.assignedRoom._id,
      month: billingMonth,
      roomFee,
      additionalService: additionalService?.trim() || '',
      additionalAmount: extraAmount,
      discount: discountAmount,
      lateFee: lateFeeAmount,
      totalAmount,
      dueDate,
      transactionId: `TXN-${Date.now()}` // Internal reference ID for PhonePe
    });

    await invoice.save();

    await Notification.create({
      recipient: residentId,
      title: 'New Invoice Generated',
      message: `Your invoice for ${month} has been generated. Total amount: ₹${totalAmount}.`,
      type: 'billing'
    });

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/billing
router.get('/', protect, isAdminOrStaff, async (req, res) => {
  try {
    const invoices = await Billing.find()
      .populate('resident', 'name email contactNumber')
      .populate('room', 'roomNumber')
      .sort({ createdAt: -1 })
      .lean();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/billing/my
router.get('/my', protect, async (req, res) => {
  try {
    const invoices = await Billing.find({ resident: req.user._id })
      .populate('room', 'roomNumber')
      .sort({ createdAt: -1 })
      .lean();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// REAL PHONEPE UAT GATEWAY INTEGRATION
// ==========================================

// @route   POST /api/billing/:id/initiate-payment
// @desc    Initiates PhonePe gateway redirect
router.post('/:id/initiate-payment', protect, async (req, res) => {
  try {
    const invoice = await Billing.findById(req.params.id).populate('resident');
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    if (req.user.role === 'resident' && invoice.resident._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only pay your own invoice" });
    }

    if (invoice.status === 'Paid') {
      return res.status(400).json({ message: "Invoice is already paid" });
    }

    if (!phonePeConfig.clientId || !phonePeConfig.clientSecret || !phonePeConfig.clientVersion) {
      return res.status(500).json({ message: "Payment Gateway not configured in .env" });
    }

    const returnUrl = buildBillingReturnUrl(req);
    if (!returnUrl) {
      return res.status(400).json({ message: "Payment return URL is missing" });
    }

    const merchantOrderId = `TXN-${invoice._id}-${Date.now()}`;
    invoice.transactionId = merchantOrderId;
    invoice.status = 'Pending';
    await invoice.save();

    const callbackUrl = `${getBackendBaseUrl(req)}/api/billing/payment-callback?merchantOrderId=${encodeURIComponent(merchantOrderId)}&returnUrl=${encodeURIComponent(returnUrl)}`;

    // PhonePe expects amount in paise (Rupees * 100)
    const amountInPaise = Math.round(invoice.totalAmount * 100);
    
    const payload = {
      merchantOrderId,
      amount: amountInPaise,
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: `Hostel bill payment for ${invoice.month}`,
        merchantUrls: {
          redirectUrl: callbackUrl
        }
      },
      metaInfo: {
        udf1: invoice._id.toString(),
        udf2: invoice.resident._id.toString(),
        udf3: normalizePhoneNumber(invoice.resident.contactNumber) || ''
      }
    };

    // Send the payment page URL back to React
    const paymentResponse = await initiatePhonePePayment(payload);
    const redirectUrl = paymentResponse?.redirectUrl;

    if (!redirectUrl) {
      return res.status(502).json({ message: 'PhonePe did not return a payment URL' });
    }

    res.json({ redirectUrl });

  } catch (err) {
    console.error("PhonePe Error:", err.response?.data || err.message);
    res.status(502).json({
      message: err.response?.data?.message || err.response?.data?.code || 'Error initiating payment gateway'
    });
  }
});

// @route   POST /api/billing/payment-callback
// @desc    PhonePe redirects here after transaction
router.all('/payment-callback', async (req, res) => {
  const returnUrl = req.query.returnUrl || phonePeConfig.frontendUrl;
  let invoice;

  try {
    const phonePeResponse = decodePhonePeResponse(req.body);
    const merchantOrderId =
      req.query.merchantOrderId ||
      phonePeResponse?.payload?.merchantOrderId ||
      phonePeResponse?.merchantOrderId ||
      phonePeResponse?.data?.merchantOrderId;

    invoice = await Billing.findOne({ transactionId: merchantOrderId });
    if (!invoice) return res.redirect(withPaymentStatus(returnUrl, 'failed') || '/');

    const callbackState = getPhonePeCallbackState(phonePeResponse, req.query);
    if (isCallbackFailed(callbackState)) {
      invoice.status = 'Failed';
      await invoice.save();
      return res.redirect(withPaymentStatus(returnUrl, 'failed', invoice._id) || '/');
    }

    let statusResponse;

    try {
      statusResponse = await checkPhonePePaymentStatusWithRetry(merchantOrderId);
      await applyPhonePeStatusToInvoice(invoice, statusResponse);
    } catch (statusErr) {
      if (isPhonePeSandbox() && isPhonePeSimulatorStatusError(statusErr) && isCallbackSuccessful(callbackState)) {
        await markInvoicePaidFromSandboxCallback(invoice);
        return res.redirect(withPaymentStatus(returnUrl, 'success', invoice._id) || '/');
      }

      throw statusErr;
    }

    if (invoice.status === 'Paid') {
      return res.redirect(withPaymentStatus(returnUrl, 'success', invoice._id) || '/');
    }

    if (isPaymentFailed(statusResponse)) {
      return res.redirect(withPaymentStatus(returnUrl, 'failed', invoice._id) || '/');
    }

    return res.redirect(withPaymentStatus(returnUrl, 'pending', invoice._id) || '/');
  } catch (err) {
    console.error("PhonePe callback error:", err.response?.data || err.message);
    res.redirect(withPaymentStatus(returnUrl, invoice ? 'pending' : 'failed', invoice?._id) || '/');
  }
});

// @route   POST /api/billing/:id/refresh-payment
// @desc    Checks PhonePe order status and updates invoice
router.post('/:id/refresh-payment', protect, async (req, res) => {
  try {
    const invoice = await Billing.findById(req.params.id).populate('resident');
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    if (req.user.role === 'resident' && invoice.resident._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only check your own invoice" });
    }

    if (!invoice.transactionId) {
      return res.status(400).json({ message: "No PhonePe order found for this invoice" });
    }

    let statusResponse;

    statusResponse = await checkPhonePePaymentStatusWithRetry(invoice.transactionId);
    await applyPhonePeStatusToInvoice(invoice, statusResponse);

    res.json({
      invoice,
      paymentState: statusResponse?.state || 'UNKNOWN'
    });
  } catch (err) {
    console.error("PhonePe status refresh error:", err.response?.data || err.message);
    res.status(502).json({
      message: err.response?.data?.message || 'Unable to refresh payment status'
    });
  }
});

// Manual Admin Override
router.put('/:id/pay', protect, isAdminOrStaff, async (req, res) => {
  try {
    const invoice = await Billing.findById(req.params.id);
    invoice.status = 'Paid';
    invoice.paidAt = Date.now();
    await invoice.save();
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;