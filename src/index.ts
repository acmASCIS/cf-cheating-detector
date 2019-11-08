import dotenv from 'dotenv';

import CheatingDetector from './cheating-detector';

dotenv.config();

const cheatingDetector = new CheatingDetector(
  process.env.CF_HANDLE as string,
  process.env.CF_PASSWORD as string,
  'fF0nGsdspd',
  '258480',
  0.9,
);
cheatingDetector.run().then(console.log);
