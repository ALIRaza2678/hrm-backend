const dotenv = require("dotenv");
const express = require("express");
const app = express();
const cors = require("cors");
dotenv.config();
const connectDb = require("./config/db");
const Userroute = require("./routes/user-routes");
const attendanceRoutes = require("./routes/attendance-routes");

app.use(express.json());
app.use(cors());

connectDb();

app.use("/api", Userroute);
app.use("/api/attendance", attendanceRoutes);

app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

module.exports = app;
