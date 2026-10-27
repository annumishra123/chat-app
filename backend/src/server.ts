import { app } from './app';
import { env } from './config/env';
import './config/firebase';

app.listen(env.PORT, () => {
  console.log(`Chat API listening on http://localhost:${env.PORT}`);
});
