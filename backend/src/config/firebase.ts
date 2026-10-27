import fs from 'node:fs';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { env } from './env';

function init(): Firestore {
  if (getApps().length === 0) {
    if (env.FIRESTORE_EMULATOR_HOST) {
      initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
    } else if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const key = JSON.parse(fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
      initializeApp({ credential: cert(key) });
    } else {
      initializeApp({ credential: applicationDefault(), projectId: env.FIREBASE_PROJECT_ID });
    }
  }
  return getFirestore();
}

export const firestore = init();
