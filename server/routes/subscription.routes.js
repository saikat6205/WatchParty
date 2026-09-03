const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const nodemailer = require("nodemailer");

const User = require("../models/User");
const Payment = require("../models/Payment");

const router = express.Router();

// =========================
// RAZORPAY SETUP
// =========================

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// =========================
// SUBSCRIPTION PLANS
// =========================

const plans = {
  bronze: {
    name: "Bronze",
    amount: 99,
  },

  silver: {
    name: "Silver",
    amount: 199,
  },

  gold: {
    name: "Gold",
    amount: 299,
  },
};

// =========================
// EMAIL SETUP
// =========================

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// =========================
// TEST ROUTE
// =========================

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Subscription API is working!",
  });
});

// =========================
// GET USER BY ID
// =========================
// IMPORTANT:
// Frontend subscription page calls:
//
// GET /api/subscription/user/:userId
//
// This route was missing before.
// =========================

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan || "free",
      },
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not fetch user information",
      error: error.message,
    });
  }
});

// =========================
// CREATE RAZORPAY ORDER
// =========================

router.post("/create-order", async (req, res) => {
  try {
    const { userId, plan } = req.body;

    // Check required data
    if (!userId || !plan) {
      return res.status(400).json({
        success: false,
        message: "userId and plan are required",
      });
    }

    // Check plan
    if (!plans[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan",
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Don't allow buying the same plan again
    if (user.plan === plan) {
      return res.status(400).json({
        success: false,
        message: `You are already on the ${plan} plan`,
      });
    }

    const selectedPlan = plans[plan];

    // Razorpay amount is in paise
    const options = {
      amount: selectedPlan.amount * 100,
      currency: "INR",
      receipt: `watchparty_${Date.now()}`,
    };

    // Create Razorpay order
    const order = await razorpay.orders.create(options);

    // Save payment information
    const payment = await Payment.create({
      userId: user._id,
      plan: plan,
      amount: selectedPlan.amount,
      currency: "INR",
      razorpayOrderId: order.id,
      status: "created",
    });

    return res.status(201).json({
      success: true,
      message: "Razorpay order created successfully",

      orderId: order.id,
      amount: selectedPlan.amount,
      currency: "INR",

      keyId: process.env.RAZORPAY_KEY_ID,

      plan: {
        name: selectedPlan.name,
        type: plan,
        amount: selectedPlan.amount,
      },

      paymentId: payment._id,
    });
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not create payment order",
      error: error.message,
    });
  }
});

// =========================
// VERIFY RAZORPAY PAYMENT
// =========================

router.post("/verify-payment", async (req, res) => {
  try {
    const {
      userId,
      plan,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !userId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification data is incomplete",
      });
    }

    // Find payment record
    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: userId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Compare signatures
    if (expectedSignature !== razorpay_signature) {
      payment.status = "failed";
      await payment.save();

      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update payment
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.status = "paid";
    payment.paidAt = new Date();

    await payment.save();

    // Update user's subscription plan
    user.plan = payment.plan;

    await user.save();

    // =========================
    // SEND CONFIRMATION EMAIL
    // =========================

    let emailSent = false;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: "WatchParty Subscription Confirmation",

          html: `
            <h2>WatchParty Subscription Successful</h2>

            <p>Hello ${user.name || "User"},</p>

            <p>
              Your WatchParty subscription has been upgraded successfully.
            </p>

            <hr>

            <p>
              <strong>Plan:</strong>
              ${payment.plan.toUpperCase()}
            </p>

            <p>
              <strong>Amount:</strong>
              ₹${payment.amount}
            </p>

            <p>
              <strong>Transaction ID:</strong>
              ${razorpay_payment_id}
            </p>

            <p>
              <strong>Order ID:</strong>
              ${razorpay_order_id}
            </p>

            <p>
              <strong>Status:</strong>
              PAID
            </p>

            <hr>

            <p>Thank you for using WatchParty!</p>
          `,
        });

        emailSent = true;
      } catch (emailError) {
        console.error("Email sending failed:", emailError.message);
      }
    }

    // =========================
    // RESPONSE
    // =========================

    return res.json({
      success: true,

      message: "Payment verified and subscription upgraded successfully",

      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
      },

      payment: {
        plan: payment.plan,
        amount: payment.amount,
        transactionId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: payment.status,
      },

      emailSent,
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
});

// =========================
// GET USER PAYMENT HISTORY
// =========================

router.get("/history/:userId", async (req, res) => {
  try {
    const payments = await Payment.find({
      userId: req.params.userId,
    }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Payment history error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not fetch payment history",
      error: error.message,
    });
  }
});

// =========================
// EXPORT ROUTER
// =========================

module.exports = router;
