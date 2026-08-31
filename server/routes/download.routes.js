const express = require("express");

const User = require("../models/User");
const Video = require("../models/Video");
const Download = require("../models/Download");

const router = express.Router();

// ======================================================
// PLAN DOWNLOAD LIMITS
// ======================================================

const downloadLimits = {
  free: 1,
  bronze: 5,
  silver: 10,
  gold: Infinity,
};

// ======================================================
// TEST ROUTE
// ======================================================

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Download API is working!",
  });
});

// ======================================================
// CREATE TEST VIDEO
// ======================================================

router.post("/test-video", async (req, res) => {
  try {
    const video = await Video.create({
      title: "Test WatchParty Video",
      description: "Test video for Task 2",
      videoUrl: "/sample.mp4",
      thumbnailUrl: "",
      isPremium: false,
    });

    res.status(201).json({
      success: true,
      message: "Test video created successfully",
      video,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not create test video",
    });
  }
});

// ======================================================
// DOWNLOAD VIDEO
// ======================================================

router.post("/", async (req, res) => {
  try {
    const { userId, videoId } = req.body;

    // Check IDs
    if (!userId || !videoId) {
      return res.status(400).json({
        success: false,
        message: "userId and videoId are required",
      });
    }

    // Find User
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find Video
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // ==================================================
    // PREMIUM VIDEO CHECK
    // ==================================================

    if (video.isPremium && user.plan === "free") {
      return res.status(403).json({
        success: false,
        message: "Premium video requires a paid plan",
      });
    }

    // ==================================================
    // TODAY'S DOWNLOAD RANGE
    // ==================================================

    const startOfDay = new Date();

    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();

    endOfDay.setHours(23, 59, 59, 999);

    // ==================================================
    // COUNT TODAY'S DOWNLOADS
    // ==================================================

    const todayDownloadCount = await Download.countDocuments({
      userId: user._id,

      downloadedAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    // ==================================================
    // GET PLAN LIMIT
    // ==================================================

    const limit = downloadLimits[user.plan];

    // ==================================================
    // CHECK DAILY LIMIT
    // ==================================================

    if (todayDownloadCount >= limit) {
      return res.status(403).json({
        success: false,
        message: `Daily download limit reached for ${user.plan} plan`,
        plan: user.plan,
        downloadedToday: todayDownloadCount,
        dailyLimit: limit === Infinity ? "Unlimited" : limit,
      });
    }

    // ==================================================
    // CREATE DOWNLOAD RECORD
    // ==================================================

    const download = await Download.create({
      userId: user._id,
      videoId: video._id,
      userPlan: user.plan,
    });

    // ==================================================
    // RESPONSE
    // ==================================================

    res.status(201).json({
      success: true,

      message: "Download allowed",

      downloadId: download._id,

      video: {
        title: video.title,
        videoUrl: video.videoUrl,
      },

      plan: user.plan,

      downloadedToday: todayDownloadCount + 1,

      dailyLimit: limit === Infinity ? "Unlimited" : limit,
    });
  } catch (error) {
    console.error("Download error:", error);

    res.status(500).json({
      success: false,
      message: "Download failed",
      error: error.message,
    });
  }
});

// ======================================================
// GET USER DOWNLOAD HISTORY
// ======================================================

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const downloads = await Download.find({
      userId,
    })
      .populate("videoId")
      .sort({ downloadedAt: -1 });

    res.json({
      success: true,
      count: downloads.length,
      downloads,
    });
  } catch (error) {
    console.error("Download history error:", error);

    res.status(500).json({
      success: false,
      message: "Could not fetch download history",
    });
  }
});

// ======================================================
// GET TODAY'S DOWNLOAD COUNT
// ======================================================

router.get("/user/:userId/today", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const startOfDay = new Date();

    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();

    endOfDay.setHours(23, 59, 59, 999);

    const count = await Download.countDocuments({
      userId,

      downloadedAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    const limit = downloadLimits[user.plan];

    res.json({
      success: true,

      plan: user.plan,

      downloadedToday: count,

      dailyLimit: limit === Infinity ? "Unlimited" : limit,

      remaining: limit === Infinity ? "Unlimited" : Math.max(limit - count, 0),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not get download count",
    });
  }
});

module.exports = router;
