const express = require("express");
const router = express.Router();
const Controller = require("../controller/attendance-controller");

// // Mark attendance for month
// router.post("/attendance/mark", controller.markAttendance);

// // Get attendance for month
// router.get("/attendance/:userId/:month", controller.getAttendance);

// // Download CSV
// router.get("/attendance/download/:userId/:month", controller.downloadAttendanceCSV);

// Mark today's attendance
router.post("/mark", Controller.markTodayAttendance);

// Check out
router.post("/checkout", Controller.checkOut);

// Get today's attendance status
router.get("/today/:userId",Controller.getTodayAttendance);

// Get monthly attendance
router.get("/monthly/:userId/:month", Controller.getMonthlyAttendance);

// Download CSV
router.get("/download/:userId/:month", Controller.downloadAttendanceCSV);

// Get stats (optional)
router.get("/stats", Controller.getAttendanceStats);

module.exports = router;
