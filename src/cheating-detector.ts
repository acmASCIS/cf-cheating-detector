import cheerio from 'cheerio';
import puppeteer from 'puppeteer';

import axios from 'axios';
import CodeforcesClient from 'codeforces-client';
import _ from 'lodash';

import compareCode from './compare-code';
import { scheduleJobs } from './schedule-jobs';
const { connect } = require('puppeteer-real-browser');
import fs from 'fs';
import path from 'path';

const SUBMISSIONS_FILE_PATH = path.resolve(__dirname, 'submissions.json');
function loadSubmissionsFromFile(): SubmissionWithCode[] {
  if (fs.existsSync(SUBMISSIONS_FILE_PATH)) {
    const data = fs.readFileSync(SUBMISSIONS_FILE_PATH, 'utf-8');
    return JSON.parse(data) as SubmissionWithCode[];
  }
  return [];
}

function saveSubmissionsToFile(submissions: SubmissionWithCode[]): void {
  fs.writeFileSync(SUBMISSIONS_FILE_PATH, JSON.stringify(submissions, null, 2), 'utf-8');
}

// Define type for submissions with code and URL
type SubmissionWithCode = {
  id: string;
  handle: string;
  index: string;
  code?: string | null;
  url?: string;
};

export default class CheatingDetector {
  private cookies: string | undefined = undefined;
  private page: puppeteer.Page | undefined;
  private browser: puppeteer.Browser | undefined
  constructor(
    private cfUsername: string,
    private cfPassword: string,
    private groupId: string,
    private contestId: string,
    private blackList: Array<string>,
    private requiredPercentage: number,
    private codesMemo: Map<string, string>,
    private loaded: boolean,
  ) { }


  

  // Add delay function within the class
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  public run = async () => {
    if (!this.loaded) {
      this.page = await this.login();
    }
    let submissionsWithCode1 = loadSubmissionsFromFile();
    const fetchedSubmissionIds = new Set(submissionsWithCode1.map((s) => s.id));
    // let submissions = await this.generateSubmissionObjects();

    // Fetch new submissions
  const newSubmissions = await this.generateSubmissionObjects();
  const submissionsToFetch = newSubmissions.filter(
    (submission) => !fetchedSubmissionIds.has(submission.id.toString())
  );

    const failedJobs: (() => Promise<string | null>)[] = [];
    const codeJobs = submissionsToFetch.map((submission) => async () => {
      const code = await this.getSourceCode(submission.id.toString(), this.page!, this.browser!, failedJobs);
      if (!code) {
        console.log(`Submission ${submission.id} failed.`);
      } else {
        const newSubmission: SubmissionWithCode = {
          id: submission.id.toString(),
          handle: submission.handle,
          index: submission.index,
          code,
          url: this.generateSubmissionUrl(submission.id.toString()),
        };
  
        submissionsWithCode1.push(newSubmission);
        saveSubmissionsToFile(submissionsWithCode1); // Save to file after each update
      }
      return code;
    });

    console.log(`[CF FETCH SOURCE CODE] START: ${codeJobs.length} submissions`);

    const jobsPerTimeFrame = Number(process.env.JOBS_PER_TIME_FRAME || 30);
    const timeFrame = Number(process.env.TIME_FRAME || 1000);

    const codes = await scheduleJobs(
      codeJobs,
      jobsPerTimeFrame,
      timeFrame,
      remainingJobs => {
        console.log('REMAINING CODES TO FETCH:', remainingJobs);
      },
      failedJobs => {
        console.log(`${failedJobs.length} jobs failed. Retrying...`);
      }
    );

    console.log('[CF FETCH SOURCE CODE] DONE');

    // Retry failed jobs (if any)
    if (failedJobs.length) {
      console.log('Retrying failed jobs...');
      await scheduleJobs(failedJobs, jobsPerTimeFrame, timeFrame);
      console.log('Failed jobs retry completed.');
    }


    const cheatingCases: any[] = [];
    const groupedSubmissions = _.groupBy(submissionsWithCode1, 'index');

    Object.values(groupedSubmissions).forEach(problemSubmissions => {
      for (let i = 0; i < problemSubmissions.length; i++) {
        for (let j = i + 1; j < problemSubmissions.length; j++) {
          if (
            problemSubmissions[i].handle !== problemSubmissions[j].handle &&
            problemSubmissions[i].index === problemSubmissions[j].index
          ) {
            const matchingPercentage = compareCode(
              problemSubmissions[i].code!,
              problemSubmissions[j].code!,
            );
            console.log(matchingPercentage);
            if (matchingPercentage >= this.requiredPercentage) {
              cheatingCases.push({
                matchingPercentage,
                first: _.omit(problemSubmissions[i], 'code'),
                second: _.omit(problemSubmissions[j], 'code'),
              });
            }
          }
        }
      }
    });

    return cheatingCases;
  };

  private async login() {
    console.log('[CF LOGIN] START');
    const loginUrl = 'https://codeforces.com/enter';
    const { browser } = await connect({
      headless: false, // Run in a visible window
      // devtools: true,
    })
    const page = await browser.newPage();
    // await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36");
    await page.goto(loginUrl, { timeout: 0 });
    this.loaded = true;
    while (true) {
      try {
        await page.type('input[name="handleOrEmail"]', this.cfUsername, { delay: 100 });
        await page.type('input[name="password"]', this.cfPassword, { delay: 100 });
        await page.click('input[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'load', timeout: 0 });
        break;
      } catch (error) {
        console.log(`encountered ${error} please check page...`);
        await this.delay(15000)
      }
    }

    this.browser = browser
    console.log('[CF LOGIN] DONE');
    return page;
  }

  private async generateSubmissionObjects() {
    console.log('[CF FETCH SUBMISSION] START');
    const client = new CodeforcesClient(process.env.CF_KEY, process.env.CF_SECRET);
    const submissions = await client.contest.status({ contestId: this.contestId });

    if (submissions.status !== 'OK') {
      console.log(submissions);
      throw new Error('API failed to fetch submissions');
    }

    console.log('[CF FETCH SUBMISSION] DONE');
    return submissions.result
      .filter(
        submission =>
          submission.verdict === 'OK' &&
          submission.author.participantType === 'CONTESTANT' &&
          !this.blackList.includes(submission.problem.index),
      )
      .map(submission => ({
        id: submission.id.toString(), 
        handle: submission.author.members[0].handle,
        index: submission.problem.index,
      }));
  }

  private async getSourceCode(
    submissionId: string,
    page: puppeteer.Page,
    browser: puppeteer.Browser,
    failedJobs: (() => Promise<string | null>)[] = []
  ): Promise<string | null> {
    if (this.codesMemo.get(submissionId)) {
      return this.codesMemo.get(submissionId)!;
    }

    const submissionUrl = this.generateSubmissionUrl(submissionId);
    let retries = 4;
    let code: string | null = null;

    while (retries > 0) {
      try {
        if (retries === 4) {
          await page.goto(submissionUrl, { waitUntil: 'domcontentloaded' });
          await this.delay(4000); // Delay to avoid bans
        }

        const element = await page.$('.prettyprint');
        if (element) {
          code = await element.evaluate(el => el.textContent || '');
          break;
        } else {
          console.log(`Code not found. Retrying... (${retries} attempts left)`);
          retries--;
          await this.delay(20000);
          await page.reload({ waitUntil: 'domcontentloaded' });
        }
      } catch (error) {
        console.log(`Error fetching code: ${error}. Retrying...`);
        retries--;
        await page.reload({ waitUntil: 'domcontentloaded' });
      }
    }

    if (!code) {

      failedJobs.push(() => this.getSourceCode(submissionId, page, browser, failedJobs));
    } else {
      this.codesMemo.set(submissionId, code);
    }

    return code;
  }
  private generateSubmissionUrl(submissionId: string) {
    return `https://codeforces.com/group/${this.groupId}/contest/${this.contestId}/submission/${submissionId}`;
  }
}
