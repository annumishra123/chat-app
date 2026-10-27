// import { app } from './app';
// import { env } from './config/env';
// import './config/firebase';

// app.listen(env.PORT, () => {
//   console.log(`Chat API listening on http://localhost:${env.PORT}`);
// });


import { app } from './app';
import { env } from './config/env';
import './config/firebase';
import { ensureSchema } from './db/ensureSchema';

ensureSchema()
  .then(() => {
    app.listen(env.PORT, () => {
      console.log(`Chat API listening on http://localhost:${env.PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database setup failed:', err);
    process.exit(1);
  });