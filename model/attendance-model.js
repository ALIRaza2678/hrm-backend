const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    date: {
        type: String, // YYYY-MM-DD format
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ["present", "absent", "leave", "holiday", "half-day"],
        required: true,
        default: "present"
    },
    checkInTime: {
        type: Date,
        default: null
    },
    checkOutTime: {
        type: Date,
        default: null
    },
    workingHours: {
        type: Number, // in hours
        default: 0
    },
    notes: {
        type: String,
        maxlength: 500,
        default: ""
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Could be the employee themselves or an admin
        default: null
    },
    ipAddress: {
        type: String,
        default: null
    },
    location: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null }
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editHistory: [{
        editedAt: { type: Date },
        previousStatus: { type: String },
        newStatus: { type: String },
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: { type: String }
    }]
}, { 
    timestamps: true 
});

// Compound index for user + date (ensures one record per user per day)
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

// Index for querying by month
attendanceSchema.index({ user: 1, date: 1 });

// Index for status queries
attendanceSchema.index({ status: 1 });

// Virtual field to get month from date
attendanceSchema.virtual('month').get(function() {
    return this.date.substring(0, 7); // Returns YYYY-MM
});

// Method to calculate working hours
attendanceSchema.methods.calculateWorkingHours = function() {
    if (this.checkInTime && this.checkOutTime) {
        const diff = this.checkOutTime - this.checkInTime;
        this.workingHours = (diff / (1000 * 60 * 60)).toFixed(2); // Convert to hours
    }
    return this.workingHours;
};

// Static method to get monthly summary
attendanceSchema.statics.getMonthlySummary = async function(userId, month) {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    
    const records = await this.find({
        user: userId,
        date: { $gte: startDate, $lte: endDate }
    });

    return {
        totalDays: records.length,
        present: records.filter(r => r.status === "present").length,
        absent: records.filter(r => r.status === "absent").length,
        leave: records.filter(r => r.status === "leave").length,
        halfDay: records.filter(r => r.status === "half-day").length,
        holiday: records.filter(r => r.status === "holiday").length,
        totalWorkingHours: records.reduce((sum, r) => sum + (r.workingHours || 0), 0)
    };
};

module.exports = mongoose.model("Attendance", attendanceSchema);