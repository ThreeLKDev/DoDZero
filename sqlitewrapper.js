const sqlite3 = require('sqlite3').verbose();

module.exports = class SQliteWrapper {
 constructor() {
   console.log('SQlite Wrapper init');
 }
 testFunc() {
   console.log('SQlite Wrapper Testfunction');
 }
 dbTest() {
   let db = new sqlite3.Database('./db/test.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if(err) return console.error(err.message);
      console.log('Connected to test.db');
  });
  let sql = `CREATE TABLE testy (
        _id INTEGER PRIMARY KEY AUTOINCREMENT,
        name nvarchar(64) NOT NULL,
        description nvarchar NULL,
        list nvarchar  NULL
    )`;
    db.serialize( () => db.run(sql) );
    db.close( (err)=> { return err ? console.error(err.message) : console.log('Test.db closed.') } );
 }
 dbInsert(name, description, list) {
   let db = new sqlite3.Database('./db/test.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if(err) return console.error(err.message);
      console.log('Connected to test.db');
  });
   let sql = `INSERT INTO testy (name, description, list) VALUES (?, ?, ?)`;
   db.serialize( () => {
     db.run(sql, [name, description, list], (err)=> { return err ? console.error(err.message) : null } );
   });
   db.close( (err)=> { return err ? console.error(err.message) : console.log('Test.db closed.') } );
 }
 async dbFetch() {
   let db = await new sqlite3.Database('./db/test.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if(err) return console.error(err.message);
      console.log('Connected to test.db');
  });
  let sql = `SELECT * FROM testy`;
  let result = null;
  db.serialize( () => {
  db.all(sql,(err, rows) => {
    if(err) return console.error(err.message);
    result = rows;
    console.log(rows);
  });
  });
  db.close( (err)=> { return err ? console.error(err.message) : console.log('Test.db closed.') } );
  console.log(result);
 }
}
// table GUILD-PLAYLISTS (
// Owner // user snowflake, non-unique
