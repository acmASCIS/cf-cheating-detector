import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';

import CheatingDetector from './cheating-detector';

const DelayedResponse = require('http-delayed-response');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, '../client/build')));

app.post('/api/cheating-detection', async (req, res) => {
  const { groupId, contestId, matchingPercentageThreshold } = req.body;
  const cheatingDetector = new CheatingDetector(
    process.env.CF_HANDLE as string,
    process.env.CF_PASSWORD as string,
    groupId,
    contestId,
    matchingPercentageThreshold,
  );

  const delayed = new DelayedResponse(req, res);
  delayed.wait();
  delayed.end(
    (async () => {
      const RETRIES = 10;
      for (let i = 0; i < RETRIES; i += 1) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const result = await cheatingDetector.run();
          return result;
        } catch (error) {
          console.log(`ATTEMPT [${i + 1}] FAILED.`);
          console.log(error);
        }
      }

      return undefined;
    })(),
  );

  // res.status(500).send();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});
