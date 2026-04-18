const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../backend/supplynest.db'));
const orderCols = db.prepare("PRAGMA table_info(orders)").all();
console.log('Orders Table Columns:', orderCols.map(c => c.name));
db.close();
