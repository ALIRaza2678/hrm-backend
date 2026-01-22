const express = require("express")
const controller = require("../controller/user-controller")
const route = express.Router();

route.post('/store',controller.store)
route.post('/login',controller.login)
route.get("/users",controller.getAllUsers);
route.get("/user/:id",controller.getUserByID);
route.delete("/user/:id",controller.deleteUser);
route.delete("/users",controller.deleteAllUsers);
module.exports = route;