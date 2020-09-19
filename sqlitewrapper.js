const sqlite3 = require('sqlite3').verbose();

module.exports = class SQliteWrapper {
 constructor() {
   console.log('SQlite Wrapper init');
 }
 registerMember(db, memberID, characterID, guildID){
   let autoClose = false;
   if( db == null ) {
     db = new sqlite3.Database(`./guilds/${guildID}/members.db`, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      (err) => {
        if(err) return console.error(err.message);
        console.log('Connected to member database.');
      });
      autoClose = true;
    }
    let sql = `CREATE TABLE IF NOT EXISTS members (
      memberID nvarchar NOT NULL UNIQUE,
      characterID nvarchar NOT NULL
    )`;
    db.serialize( () => db.run(sql) );
    sql = `INSERT INTO members (memberID, characterID) VALUES(?, ?)`;
    db.serialize( () => {
      db.run(sql,[memberID,characterID],(err)=>{return err ? console.error(err.message) : null } );
    });
    if(autoClose)
      db.close( (err) => { return err ? console.error(err.message) : console.log('Members.db closed.') } );
 }
 getGuildDB(guildID){
   let db = new sqlite3.Database(`./guilds/${guildID}/members.db`, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
     (err) => {
       if(err) return console.error(err.message);
       console.log('Connected to member database.');
   });
   return db;
 }
 async getCharacterFromMember(db, memberID, guildID){
   let autoClose = false;
   if( db == null ) {
     db = new sqlite3.Database(`./guilds/${guildID}/members.db`, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
       (err) => {
         if(err) return console.error(err.message);
         console.log('Connected to member database.');
       });
       autoClose = true;
    }
    let result = null;
    db.serialize( ()=> {
      db.get(`SELECT characterID FROM members WHERE memberID = ?`, memberID, (err,row)=>{
        if(err) {
          console.error(err.message);
          return null;
        }
        result = row;
      });
    });
    if(autoClose)
      db.close((err) => { return err ? console.error(err.message) : console.log('Members.db closed.') });
    return result;
 }
 async getMemberFromCharacter(db, characterID, guildID){
   let autoClose = false;
   if( db == null ) {
     db = new sqlite3.Database(`./guilds/${guildID}/members.db`, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
       (err) => {
         if(err) return console.error(err.message);
         console.log('Connected to member database.');
       });
       autoClose = true;
    }
    let result = null;
    db.serialize( ()=> {
      db.get(`SELECT memberID FROM members WHERE characterID = ?`, characterID, (err,row)=>{
        if(err) {
          console.error(err.message);
          return null;
        }
        result = row;
      });
    });
    if(autoClose)
      db.close((err) => { return err ? console.error(err.message) : console.log('Members.db closed.') });
    return result;
 }
 async testFunc(guildID) {
   let db = new sqlite3.Database(`./guilds/${guildID}/members.db`, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
     (err) => {
       if(err) return console.error(err.message);
       console.log('Connected to member database.');
     });
     let result = null;
     db.serialize( ()=> {
       db.all(`SELECT * FROM members`, (err,rows)=> {
         if( err ) return console.error(err.message);
         result = rows;
         console.log("First:");
         console.log(result);
       });
     });
     db.close( (err) => { return err ? console.error(err.message) : console.log('Members.db closed.') });
     console.log("Second:");
     console.log(result);
     return result;
 }
 dbTest() {
   let db = new sqlite3.Database('./db/test.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if(err) return console.error(err.message);
      console.log('Connected to test.db');
  });
  let sql = `CREATE TABLE IF NOT EXISTS testy (
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
