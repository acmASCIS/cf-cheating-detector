import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import morgan from 'morgan';
import basicAuth from 'express-basic-auth';

import CheatingDetector from './cheating-detector';

fs.exists('access.log', exists => {
  if (exists) {
    fs.unlinkSync('access.log');
  }
});

const logFile = fs.createWriteStream(path.join(__dirname, 'access.log'), {
  flags: 'a',
});

dotenv.config();

const app = express();

if (process.env.BASIC_AUTH_USERNAME) {
  app.use(
    basicAuth({
      users: { [process.env.BASIC_AUTH_USERNAME as string]: process.env.BASIC_AUTH_PASSWORD as string },
      challenge: true,
    }),
  );
}

app.use(express.json());
app.use(cors());
app.use(morgan('dev', { stream: logFile }));

const codesMemo = new Map<string, string>();

app.post('/api/cheating-detection', async (req, res) => {
  const submissions = [
    {
      index: 'A',
      handle: 'HassanMuhammadd',
      code: `int main () {
  ios_base::sync_with_stdio(0); cin.tie(0);
  int T;
  cin >> T;
  while (T--) {
    int n, a, b;
    string s;
    cin >> n >> a >> b >> s;
    bool ok = 0;
    int tx = 0, ty = 0;
    for (int d = 0; d < 69 && !ok; d++) {
      for (char& c: s) {
        if (c == 'N') ty++;
        else if (c == 'S') ty--;
        else if (c == 'E') tx++;
        else tx--;
        if (tx == a && ty == b) ok = 1;
      }
    }
    cout << (ok ? "YES" : "NO") << '\n';
  }
}`,
    },
    {
      index: 'A',
      handle: 'MohabAshraf',
      code: `int main () {
  ios_base::sync_with_stdio(0); cin.tie(0);
  int T;
  cin >> T;
  while (T--) {
    int n, a, b;
    string s;
    cin >> n >> a >> b >> s;
    bool ok = 0;
    int tx = 0, ty = 0;
    for (int d = 0; d < 69 && !ok; d++) {
      for (char& c: s) {
        if (c == 'N') ty++;
        else if (c == 'S') ty--;
        else if (c == 'E') tx++;
        else tx--;
        if (tx == a && ty == b) ok = 1;
      }
    }
    cout << (ok ? "YES" : "NO") << '\n';
  }
}`,
    },
    {
      index: 'A',
      handle: 'ayHad',
      code: `
int main () {
  ios_base::sync_with_stdio(0); cin.tie(0);
  int T;
  cin >> T;
  while (T--) {
    int n, a, b;
    string s;
    cin >> n >> a >> b >> s;
    bool ok = 0;
    int tx = 0, ty = 0;
    for (int d = 0; d < 69 && !ok; d++) {
      for (char& c: s) {
        if (c == 'N') ty++;
        else if (c == 'S') ty--;
        else if (c == 'E') tx++;
        else tx--;
        if (tx == a && ty == b) ok = 1;
      }
    }
    cout << (ok ? "YES" : "NO") << '\n';
  }`,
    },
  ];
  // req.setTimeout(1000 * 60 * 5); // 5 Minutes

  const { groupId, contestId, matchingPercentageThreshold } = req.body;
  // const parsedBlackList = blackList.split(',').map((str: string) => str.trim());

  const cheatingDetector = new CheatingDetector(
    process.env.CF_HANDLE as string,
    process.env.CF_PASSWORD as string,
    groupId,
    contestId,
    [],
    matchingPercentageThreshold,
    codesMemo,
  );
  const ans = cheatingDetector.compareCodes(submissions);
  return res.status(200).json({
    success: true,
    data: ans,
  });
  // const RETRIES = Number(process.env.RETRIES || 3);

  // for (let i = 0; i < RETRIES; i += 1) {
  //  try {
  //    // eslint-disable-next-line no-await-in-loop
  //    const result = await cheatingDetector.run();
  //    res.json(result);
  //    break;
  //  } catch (error) {
  //    console.log(`ATTEMPT [${i + 1}] FAILED.`);
  //    console.log(error);
  //  }
  // }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});
