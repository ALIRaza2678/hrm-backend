const Attendance = require("../model/attendance-model");
const User = require("../model/user-model");
const json2csv = require("json2csv").parse; 
const { Parser } = require("json2csv");

exports.markAttendance = async (req, res) => {
    try {
        const { userId, month, days } = req.body;

        if (!userId || !month || !days) {
            return res.status(400).json({
                success: false,
                message: "Missing data"
            });
        }

        const attendance = await Attendance.findOneAndUpdate(
            { user: userId, month },
            { $set: { days } },
            { new: true, upsert: true }
        );

        return res.status(200).json({
            success: true,
            attendance
        });

    } catch (error) {
        console.error("Attendance Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.getAttendance = async (req, res) => {
    try {
        const { userId, month } = req.params;

        const attendance = await Attendance.findOne({ user: userId, month });
        if (!attendance) return res.status(404).json({ success: false, message: "No attendance found" });

        return res.status(200).json({ success: true, attendance });
    } catch (error) {
        console.error("Fetch Attendance Error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};




exports.downloadAttendanceCSV = async (req, res) => {
    try {
        const { userId, month } = req.params;

        const attendance = await Attendance.findOne({ user: userId, month });
        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: "No attendance found"
            });
        }

        // ✅ IMPORTANT FIX
        const days =
            attendance.days instanceof Map
                ? Object.fromEntries(attendance.days)
                : attendance.days;

        const data = Object.entries(days).map(([date, present]) => ({
            date,
            status: present ? "Present" : "Absent"
        }));

        const parser = new Parser({ fields: ["date", "status"] });
        const csv = parser.parse(data);

        res.header("Content-Type", "text/csv");
        res.attachment(`attendance_${month}.csv`);
        return res.send(csv);

    } catch (error) {
        console.error("Download CSV Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};
