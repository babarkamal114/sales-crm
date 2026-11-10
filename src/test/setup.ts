import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

if (process.env.NODE_ENV !== 'test') {
  Object.assign(process.env, { NODE_ENV: 'test' });
}

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  process.env.SESSION_SECRET = 'vitest-session-secret-32chars-min!!';
}

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
