const express = require("express");
const {
  createStaff,
  login,
  logOut,
  changePassword,
  getStaffList,
  deleteStaff
} = require("../controllers/authControllers");
const authenticate = require("../middleware/authenticate");
const router = express.Router();

router.post("/officeManager/registerOfficeStaff", authenticate, createStaff);
router.get("/officeManager/staffList/:county", getStaffList);
router.delete("/officeManager/deleteStaff/:id", deleteStaff);




router.post("/login", login);
router.post("/logout", logOut);

router.put("/officeStaff/change-password", authenticate, changePassword);

module.exports = router;
