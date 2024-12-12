const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const scheduleJobs = async <T>(
  jobs: (() => Promise<T>)[],
  maxPerTimeFrame: number,
  timeFrame: number,
  afterBatchCallback?: (remainingJobs: number) => void,
  failedJobsCallback?: (failedJobs: (() => Promise<T>)[]) => void
) => {
  const results: T[] = [];
  let remainingJobs = [...jobs];
  let failedJobs: (() => Promise<T>)[] = [];

  while (remainingJobs.length) {
    const currentJobs = remainingJobs.slice(0, maxPerTimeFrame);
    remainingJobs = remainingJobs.slice(maxPerTimeFrame);

    const startTime = process.hrtime();

    const batchResults = await Promise.all(currentJobs.map(async (job) => {
      try {
        const result = await job();
        // Ensure result is of type T
        return { status: 'fulfilled', value: result as T }; 
      } catch (error) {
        return { status: 'rejected', reason: error };
      }
    }));
    
    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value !== undefined) {
        results.push(result.value); // Make sure value is not undefined
      } else {
        failedJobs.push(currentJobs[idx]);
      }
    });
    
    

    const [seconds, ns] = process.hrtime(startTime);
    const ms = seconds * 1000 + ns / 1_000_000;

    if (afterBatchCallback) {
      afterBatchCallback(remainingJobs.length);
    }

    if (ms < timeFrame) {
      await sleep(timeFrame - ms);
    }
  }

  if (failedJobs.length > 0 && failedJobsCallback) {
    failedJobsCallback(failedJobs);
  }

  return results;
};
