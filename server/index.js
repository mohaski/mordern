const express = require("express");
const session = require('express-session');

require("dotenv").config();
const cors = require("cors");
const connectDB = require("./database/db");
const authRoutes = require("./routes/authroutes");
const orderCreationRoutes = require("./routes/orderCreationRoute");
const trackRoutes = require("./routes/trackRoutes");
const driverOperationsRoutes = require('./routes/driverOperations');
const port = process.env.PORT;

const app = express();
app.use(
  session({
    secret: process.env.JWT_SECRET, // Change this to a strong, random string
    resave: false, // Prevents unnecessary session updates
    saveUninitialized: true, // Save uninitialized sessions
    cookie: {
      secure: false, // ❌ Set to 'true' if using HTTPS
      httpOnly: true, // Protects against XSS attacks
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);
app.use(cors({
  origin: 'http://localhost:5173', // Exact frontend origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT'],
  //allowedHeaders: ['Content-Type', 'Authorization']
}));
// Handle preflight requests
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/", authRoutes);

app.use("/", orderCreationRoutes);
app.use("/orders/", trackRoutes);
app.use("/", driverOperationsRoutes);


connectDB();
app.listen(port, () => {
  // console.log(`server running on port ${process.env.PORT}`);
  console.log(`server running on port ${port}`);
});
