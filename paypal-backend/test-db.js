const Database = require('better-sqlite3');
const path = require('path');
try {
    const db = new Database(path.join(__dirname, '../backend/supplynest.db'));
    const row = db.prepare('SELECT count(*) as count FROM orders').get();
    console.log('Database Access OK. Order Count:', row.count);
    db.close();
} catch (e) {
    console.error('Database Access Failed:', e.message);
}
