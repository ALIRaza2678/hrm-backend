require("dotenv").config();
const app = require("./app")
const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });
module.exports = app;
