import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import CheatingDetector from './cheating-detector';

const morgan = require('morgan');

fs.exists('access.log', function(exists) {
  if (exists) {
    fs.unlinkSync('access.log');
  }
});
const logFile = fs.createWriteStream(path.join(__dirname, 'access.log'), {
  flags: 'a',
});

const parseBlackList = (line: string): Array<string> => {
  return line.split(',').map((str: string) => str.trim());
};

const DelayedResponse = require('http-delayed-response');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('dev', { stream: logFile }));
app.use(express.static(path.join(__dirname, '../client/build')));

app.post('/api/cheating-detection', async (req, res) => {
  const {
    groupId,
    contestId,
    blackList,
    matchingPercentageThreshold,
  } = req.body;
  const cheatingDetector = new CheatingDetector(
    process.env.CF_HANDLE as string,
    process.env.CF_PASSWORD as string,
    groupId,
    contestId,
    parseBlackList(blackList),
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
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});
