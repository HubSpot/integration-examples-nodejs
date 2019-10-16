const _ = require('lodash');
const Promise = require('bluebird');
const sqlite3 = require('sqlite3').verbose();
let db = null;

const TABLE_INIT_SQL =
  `create table if not exists events
(
  id INTEGER not null primary key autoincrement,
  event_type  VARCHAR,
  object_id   int      default null,
  event_id    int      default null,
  occurred_at datetime default null,
  shown       tinyint(1) default 0,
  created_at  datetime default (datetime('now', 'localtime'))
);`;


const connectToDb = () => {
  return new Promise((resolve, reject) => {
    console.log('Init sqlite3 DB');
    const db = new sqlite3.Database('./db/webhooks.sqlite', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
};

const initTable = (db) => {
  return new Promise((resolve, reject) => {
    db.run(TABLE_INIT_SQL, [], function (err) {
      if (err) {
        console.log('Error running sql ' + sql);
        console.log(err);
        reject(err);
      } else {
        resolve({id: this.lastID})
      }
    })
  })
};

exports.init = async () => {
  db = await connectToDb();
  await initTable(db);
};

exports.all = (sql, params = []) => {
  if(_.isNull(db)) return Promise.reject('DB not initialized!');

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.log('Error running sql: ' + sql);
        console.log(err);
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
};

exports.run = (sql, params = []) => {
  if(_.isNull(db)) return Promise.reject('DB not initialized!');

  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.log('Error running sql ' + sql);
        console.log(err);
        reject(err);
      } else {
        resolve({id: this.lastID})
      }
    })
  })
};

exports.get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
      if (err) {
        console.log('Error running sql: ' + sql);
        console.log(err);
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
};

