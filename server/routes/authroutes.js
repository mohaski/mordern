const express = require("express");
const {
  register,
  login,
  logOut,
  changePassword
} = require("../controllers/authControllers");
const authenticate = require("../middleware/authenticate");
const router = express.Router();

router.post("/officeManager/registerOfficeStaff", /*authenticate*/ register);
router.post("/login", login);
router.post("/logout", logOut);

router.put("/officeStaff/change-password", authenticate, changePassword);

module.exports = router;
