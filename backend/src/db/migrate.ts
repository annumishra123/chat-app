// import fs from 'node:fs';
// import path from 'node:path';
// import { pool } from './pool';

// async function main(): Promise<void> {
//   const sql = fs.readFileSync(path.join(__dirname, '../../sql/schema.sql'), 'utf8');
//   await pool.query(sql);
//   console.log(' Schema applied');
//   await pool.end();
// }

// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });
