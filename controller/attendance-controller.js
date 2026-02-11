const Attendance = require("../model/attendance-model");
const User = require("../model/user-model");
const { Parser } = require("json2csv");

/**
 * Mark attendance for current day only
 */
exports.markTodayAttendance = async (req, res) => {
    try {
        const { userId, status = "present", checkInTime, notes, location } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        // Validate status
        const validStatuses = ["present", "absent", "leave", "holiday", "half-day"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
            });
        }

        // Get current date
        const today = new Date().toISOString().split('T')[0];

        // Check if user exists
        const userExists = await User.findById(userId);
        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Get IP address
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Check if attendance already exists for today
        let attendance = await Attendance.findOne({ user: userId, date: today });

        if (attendance) {
            // Store edit history
            const editHistory = {
                editedAt: new Date(),
                previousStatus: attendance.status,
                newStatus: status,
                editedBy: userId,
                reason: "Self-correction"
            };

            attendance.status = status;
            attendance.notes = notes || attendance.notes;
            attendance.isEdited = true;
            attendance.editHistory.push(editHistory);

            if (location) {
                attendance.location = location;
            }

            await attendance.save();

            return res.status(200).json({
                success: true,
                message: "Attendance updated successfully",
                attendance
            });
        }

        // Create new attendance record
        attendance = new Attendance({
            user: userId,
            date: today,
            status,
            checkInTime: checkInTime || new Date(),
            notes: notes || "",
            markedBy: userId,
            ipAddress,
            location: location || { latitude: null, longitude: null }
        });

        await attendance.save();

        return res.status(201).json({
            success: true,
            message: "Attendance marked successfully",
            attendance
        });

    } catch (error) {
        console.error("Mark Attendance Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

/**
 * Check out (mark end time)
 */
exports.checkOut = async (req, res) => {
    try {
        const { userId } = req.body;
        const today = new Date().toISOString().split('T')[0];

        const attendance = await Attendance.findOne({ user: userId, date: today });

        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: "No check-in record found for today"
            });
        }

        if (attendance.checkOutTime) {
            return res.status(400).json({
                success: false,
                message: "Already checked out"
            });
        }

        attendance.checkOutTime = new Date();
        attendance.calculateWorkingHours();
        await attendance.save();

        return res.status(200).json({
            success: true,
            message: "Checked out successfully",
            attendance
        });

    } catch (error) {
        console.error("Check Out Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

/**
 * Get today's attendance status
 */
exports.getTodayAttendance = async (req, res) => {
    try {
        const { userId } = req.params;
        const today = new Date().toISOString().split('T')[0];

        const attendance = await Attendance.findOne({ user: userId, date: today });

        return res.status(200).json({
            success: true,
            today: {
                date: today,
                isMarked: !!attendance,
                attendance: attendance || null
            }
        });

    } catch (error) {
        console.error("Get Today Attendance Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

/**
 * Get monthly attendance
 */
exports.getMonthlyAttendance = async (req, res) => {
    try {
        const { userId, month } = req.params;

        if (!userId || !month) {
            return res.status(400).json({
                success: false,
                message: "User ID and month are required"
            });
        }

        // Get all days in the month
        const [year, monthNum] = month.split('-');
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        
        const startDate = `${month}-01`;
        const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

        // Fetch attendance records
        const attendanceRecords = await Attendance.find({
            user: userId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });

        // Calculate summary
        const summary = {
            totalDays: attendanceRecords.length,
            totalPresent: attendanceRecords.filter(r => r.status === "present").length,
            totalAbsent: attendanceRecords.filter(r => r.status === "absent").length,
            totalLeave: attendanceRecords.filter(r => r.status === "leave").length,
            totalHalfDay: attendanceRecords.filter(r => r.status === "half-day").length,
            totalHoliday: attendanceRecords.filter(r => r.status === "holiday").length,
            totalWorkingHours: attendanceRecords.reduce((sum, r) => sum + (r.workingHours || 0), 0).toFixed(2)
        };

        // Convert to object format for frontend compatibility
        const attendanceObject = {};
        attendanceRecords.forEach(record => {
            attendanceObject[record.date] = {
                status: record.status,
                checkInTime: record.checkInTime,
                checkOutTime: record.checkOutTime,
                workingHours: record.workingHours,
                notes: record.notes
            };
        });

        return res.status(200).json({
            success: true,
            attendance: attendanceObject,
            records: attendanceRecords,
            summary
        });

    } catch (error) {
        console.error("Fetch Monthly Attendance Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

/**
 * Download attendance CSV for a month
 */
exports.downloadAttendanceCSV = async (req, res) => {
    try {
        const { userId, month } = req.params;

        // Validate inputs
        if (!userId || !month) {
            return res.status(400).json({
                success: false,
                message: "User ID and month are required"
            });
        }

        // Get user details first
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Calculate date range
        const [year, monthNum] = month.split('-');
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        
        const startDate = `${month}-01`;
        const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

        // Fetch attendance records
        const attendanceRecords = await Attendance.find({
            user: userId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });

        if (!attendanceRecords || attendanceRecords.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No attendance records found for this month"
            });
        }

        // Prepare CSV data
        const data = attendanceRecords.map(record => ({
            date: record.date,
            day: new Date(record.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }),
            status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
            checkIn: record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
            checkOut: record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
            workingHours: record.workingHours ? record.workingHours.toFixed(2) : '0.00',
            notes: record.notes || '',
            employeeName: user.name || 'N/A',
            employeeId: user.employeeId || 'N/A'
        }));

        // Calculate summary
        const totalPresent = attendanceRecords.filter(r => r.status === "present").length;
        const totalAbsent = attendanceRecords.filter(r => r.status === "absent").length;
        const totalLeave = attendanceRecords.filter(r => r.status === "leave").length;
        const totalHalfDay = attendanceRecords.filter(r => r.status === "half-day").length;
        const totalWorkingHours = attendanceRecords.reduce((sum, r) => sum + (r.workingHours || 0), 0).toFixed(2);

        // Add summary rows
        data.push({});
        data.push({
            date: 'SUMMARY',
            day: '',
            status: `Total Days: ${attendanceRecords.length}`,
            checkIn: `Present: ${totalPresent}`,
            checkOut: `Absent: ${totalAbsent}`,
            workingHours: `Leave: ${totalLeave}`,
            notes: `Half-Day: ${totalHalfDay}`,
            employeeName: `Total Hours: ${totalWorkingHours}`,
            employeeId: ''
        });

        const parser = new Parser({
            fields: [
                { label: 'Date', value: 'date' },
                { label: 'Day', value: 'day' },
                { label: 'Status', value: 'status' },
                { label: 'Check In', value: 'checkIn' },
                { label: 'Check Out', value: 'checkOut' },
                { label: 'Working Hours', value: 'workingHours' },
                { label: 'Notes', value: 'notes' },
                { label: 'Employee Name', value: 'employeeName' },
                { label: 'Employee ID', value: 'employeeId' }
            ]
        });

        const csv = parser.parse(data);

        res.header("Content-Type", "text/csv");
        res.attachment(`attendance_${user.name.replace(/\s+/g, '_')}_${month}.csv`);
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

/**
 * Get attendance statistics for a date range
 */
exports.getAttendanceStats = async (req, res) => {
    try {
        const { userId, startDate, endDate } = req.query;

        const attendanceRecords = await Attendance.find({
            user: userId,
            date: { $gte: startDate, $lte: endDate }
        });

        const stats = {
            totalDays: attendanceRecords.length,
            present: attendanceRecords.filter(r => r.status === "present").length,
            absent: attendanceRecords.filter(r => r.status === "absent").length,
            leave: attendanceRecords.filter(r => r.status === "leave").length,
            halfDay: attendanceRecords.filter(r => r.status === "half-day").length,
            holiday: attendanceRecords.filter(r => r.status === "holiday").length,
            totalWorkingHours: attendanceRecords.reduce((sum, r) => sum + (r.workingHours || 0), 0).toFixed(2),
            averageWorkingHours: 0
        };

        const workingDays = attendanceRecords.filter(r => r.status === "present").length;
        stats.averageWorkingHours = workingDays > 0 
            ? (stats.totalWorkingHours / workingDays).toFixed(2) 
            : '0.00';

        return res.status(200).json({
            success: true,
            stats
        });

    } catch (error) {
        console.error("Get Stats Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};