const express = require("express");
const router = express.Router();
const controller = require("../controller/attendance-controller");

// Mark attendance for month
router.post("/attendance/mark", controller.markAttendance);

// Get attendance for month
router.get("/attendance/:userId/:month", controller.getAttendance);

// Download CSV
router.get("/attendance/download/:userId/:month", controller.downloadAttendanceCSV);
module.exports = router;
