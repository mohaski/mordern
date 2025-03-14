const mysql = require("mysql2");
const config = require("../config/config");
const pool = mysql.createPool(config);

const createTable = (schema) => {
  return new Promise((resolve, reject) => {
    pool.query(schema, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const checkRecordExists = (tablename, column, value) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM ${tablename} WHERE ${column} = ?`;
    pool.query(query, [value], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results.length > 0 ? results[0] : null);
      }
    });
  });
};

const insertRecord = (tablename, record) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO ${tablename} SET ?`;
    pool.query(query, [record], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const insertRecord_returnit = (tablename, record) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO ${tablename} SET ?`;
    pool.query(query, [record], (err, result) => {
      if (err) {
        reject(err);
      } else {
        // Fetch the inserted record using the insertId
        const fetchQuery = `SELECT * FROM ${tablename} WHERE id = ?`;
        pool.query(fetchQuery, [result.insertId], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows[0]); // Return the inserted record
          }
        });
      }
    });
  });
};

/*const returnRecord = (tablename, column, value) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM ${tablename} WHERE ${column}= ?`;
    pool.query(query, [value], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
      }
    });
  });
};*/

const updateRecord = (
  tablename,
  column,
  identifierColumn,
  identifierValue,
  value
) => {
  return new Promise((resolve, reject) => {
    const query = `UPDATE ${tablename} SET ${column} = "${value}" WHERE ${identifierColumn} = "${identifierValue}" `;
    pool.query(query, [value, identifierValue], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

const reportQuery = (startDate, endDate, status, county)=> {
  return new Promise((resolve, reject)=> {
  const query = `
  SELECT * FROM orders
  WHERE created_At BETWEEN ? AND ?
  AND status = ? AND pickupCounty = ?
  `
  pool.query(query, [startDate, endDate, status, county], (err, results)=> {
    if(err){
      console.error(err)
      reject(err)
    }
    else{
      resolve(results)
    }
  })

  })
}

module.exports = {
  createTable,
  checkRecordExists,
  insertRecord,
  updateRecord,
  reportQuery,
  insertRecord_returnit
};
