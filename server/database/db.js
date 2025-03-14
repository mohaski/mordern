const mysql = require("mysql2");
const config = require("../config/config");

const connectDB = async () => {
  const pool = mysql.createPool(config);
  pool.getConnection((err, connection) => {
    if (err) {
      console.log({ error: err.message });
      connection.release();
    }

    console.log("Connection successful");
    // console.log(connection);
  });
};

module.exports = connectDB;
