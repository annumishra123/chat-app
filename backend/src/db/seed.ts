// import { pool } from './pool';

// const users = [
//   ['Anurag', 'anurag@.com'],
//   ['Diya ', 'diya@.com'],
  
// ] as const;

// async function main(): Promise<void> {
//   for (const [name, email] of users) {
//     await pool.query('INSERT INTO users(name, email) VALUES($1, $2) ON CONFLICT (email) DO NOTHING', [name, email]);
//   }
//   console.log(`✔ Seeded ${users.length} demo users`);
//   await pool.end();
// }

// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });
