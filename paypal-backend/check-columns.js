const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../backend/supplynest.db'));
const columns = db.prepare("PRAGMA table_info(payments)").all();
console.log('Payments Table Columns:', columns.map(c => c.name));
db.close();
