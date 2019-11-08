import dotenv from 'dotenv';
import express from 'express';

import CheatingDetector from './cheating-detector';

dotenv.config();

const app = express();
app.use(express.json());

app.post('/api/cheating-detection', async (req, res) => {
  const { groupId, contestId, matchingPercentageThreshold } = req.body;
  const cheatingDetector = new CheatingDetector(
    process.env.CF_HANDLE as string,
    process.env.CF_PASSWORD as string,
    groupId,
    contestId,
    matchingPercentageThreshold,
  );

  const RETRIES = 200;
  for (let i = 0; i < RETRIES; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await cheatingDetector.run();
      console.log(result);
      res.send(result);
      break;
    } catch (error) {
      console.log(`ATTEMPT [${i + 1}] FAILED.`);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});
