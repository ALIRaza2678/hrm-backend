const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI_ATLAS;
      // process.env.NODE_ENV === "production"
      //   ? process.env.MONGO_URI_ATLAS
      //   : 
      //   process.env.MONGO_URI_LOCAL;

    await mongoose.connect(mongoURI);

    console.log(`✅ MongoDB Connected (${process.env.NODE_ENV})`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
