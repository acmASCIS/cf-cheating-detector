const sleep = (ms: number) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

export const scheduleJobs = async <T>(
  jobs: (() => T)[],
  maxPerTimeFrame: number,
  timeFrame: number,
  afterBatchCallback?: (remainingJobs: number) => void,
) => {
  const results = [];
  let remainingJobs = [...jobs];

  while (remainingJobs.length) {
    const currentJobs = remainingJobs.slice(0, maxPerTimeFrame);
    remainingJobs = remainingJobs.slice(maxPerTimeFrame);

    const startTime = process.hrtime();

    // eslint-disable-next-line no-await-in-loop
    results.push(...(await Promise.all(currentJobs.map(job => job()))));

    const [seconds, ns] = process.hrtime(startTime);
    const ms = seconds * 1000 + ns / 1_000_000;

    if (afterBatchCallback) {
      afterBatchCallback(remainingJobs.length);
    }

    if (ms < timeFrame) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(timeFrame - ms);
    }
  }

  return results;
};
