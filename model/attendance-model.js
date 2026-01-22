const mongoose = require("mongoose")
const attendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    month: {
        type: String, 
        required: true
    },
    days: {
        type: Map,
        of: Boolean, 
        default: {}
    }
}, { timestamps: true });


attendanceSchema.index({ user: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
