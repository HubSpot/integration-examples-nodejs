const _ = require('lodash');
const mysql = require('mysql');
const Promise = require('bluebird');

let connection = null;

const MYSQL_HOST = process.env.MYSQL_HOST;
const MYSQL_USER = process.env.MYSQL_USER;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;

const TABLE_INIT_SQL =
  `create table if not exists events (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_type  VARCHAR(255),
  object_id   bigint     default null,
  event_id    bigint     default null,
  occurred_at bigint     default null,
  shown       tinyint(1) default 0,
  created_at  datetime   default CURRENT_TIMESTAMP
);`;

const initTable = () => {
  return new Promise((resolve, reject) => {
    connection.query(TABLE_INIT_SQL, (error, results) => {
      if (error) {
        console.log('Error running init sql');
        console.log(error);
        reject(error);
      } else {
        resolve(results);
      }
    })
  })
};

exports.init = async () => {
  try {
    connection = new mysql.createConnection({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE
    });
    await initTable();
  } catch (e) {
    console.error('DB is not available');
    console.error(e);
  }
};

exports.close = async () => {
  if (connection) connection.end();
};

exports.run = (sql) => {
  if (_.isNull(connection)) return Promise.reject('DB not initialized!');

  return new Promise((resolve, reject) => {
    connection.query(sql, (error, results) => {
      if (error) {
        console.log('Error running sql ' + sql);
        console.log(error);
        reject(error);
      } else {
        resolve(results);
      }
    })
  })
};
