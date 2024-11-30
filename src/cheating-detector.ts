import cheerio from 'cheerio';
import puppeteer from 'puppeteer';

import axios from 'axios';
import CodeforcesClient from 'codeforces-client';
import _ from 'lodash';

import compareCode from './compare-code';
import { scheduleJobs } from './schedule-jobs';
const { connect } = require('puppeteer-real-browser');



// Define type for submissions with code and URL
type SubmissionWithCode = {
  id: string;
  handle: string;
  index: string;
  code?: string;
  url?: string;
};

export default class CheatingDetector {
  private cookies: string | undefined = undefined;
  private page: puppeteer.Page | undefined;

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
    let submissions = await this.generateSubmissionObjects();
    const codeJobs = submissions.map((submission, index) => async () => {
      return this.getSourceCode(submission.id.toString(), this.page!);
    });

    console.log(`[CF FETCH SOURCE CODE] START: ${codeJobs.length} submissions`);

    const jobsPerTimeFrame = Number(process.env.JOBS_PER_TIME_FRAME || 30);
    const timeFrame = Number(process.env.TIME_FRAME || 1000);

    const codes = await scheduleJobs(codeJobs, jobsPerTimeFrame, timeFrame, remainingJobs => {
      console.log('REMAINING CODES TO FETCH:', remainingJobs);
    });

    console.log('[CF FETCH SOURCE CODE] DONE');

    const submissionsWithCode: SubmissionWithCode[] = await Promise.all(submissions.map(async (submission, index) => ({
      id: submission.id.toString(), // Convert to string
      handle: submission.handle,
      index: submission.index,
      code: await codes[index], // Await the promise to resolve
      url: this.generateSubmissionUrl(submission.id.toString()), // Convert to string
    })));

    const cheatingCases: any[] = [];
    const groupedSubmissions = _.groupBy(submissionsWithCode, 'index');

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
      devtools: true,
    })
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36");
    await page.goto(loginUrl, { timeout: 0 });
    this.loaded = true;
    await page.type('input[name="handleOrEmail"]', this.cfUsername, { delay: 100 });
    await page.type('input[name="password"]', this.cfPassword, { delay: 100 });

    await page.click('input[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'load', timeout: 0 });

    console.log('[CF LOGIN] DONE');
    return page;
  }

  private async generateSubmissionObjects() {
    console.log('[CF FETCH SUBMISSION] START');
    const client = new CodeforcesClient(process.env.CF_KEY, process.env.CF_SECRET);
    const submissions = await client.contest.status({ contestId: this.contestId });

    if (submissions.status !== 'OK') {
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
        id: submission.id.toString(), // Convert to string here
        handle: submission.author.members[0].handle,
        index: submission.problem.index,
      }));
  }

  private async getSourceCode(submissionId: string, page: puppeteer.Page) {
    if (this.codesMemo.get(submissionId)) {
      return this.codesMemo.get(submissionId);
    }

    const submissionUrl = this.generateSubmissionUrl(submissionId);
    let retries = 3;
    let code = '';
    while (retries > 0) {
      try {
        // Navigate to the page and wait for the specific element to confirm the page is loaded
        if (retries === 3) {
          await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36");
          await page.goto(submissionUrl, { waitUntil: 'domcontentloaded' });
        }

        await this.delay(10000);  // delay to prevent getting banned by codeforces

        // Check if the .lang-cpp element exists on the page
        const element = await page.$('.prettyprint');
        if (element) {
          // Extract text content from the code element
          code = await element.evaluate(el => el.textContent || '');
          // console.log('Code extracted:', code);
          break; // Exit loop once the code is found
        } else {
          console.log('Code not found on the page');
          retries--;
          await this.delay(30000);
          await page.reload({ waitUntil: 'domcontentloaded' });   // Delay before retrying
        }

      } catch (error) {
        console.log(`Error loading page or fetching code, retrying... (${retries} attempts left)`);
        retries--;
        if (retries > 0) {
          console.log('Reloading page...');
          await page.reload({ waitUntil: 'domcontentloaded' });  // Reload page and wait for DOM content
          await this.delay(30000)
        } else {
          console.log('Failed to load the page after retries');
        }
      }
    }

    this.codesMemo.set(submissionId, code); // Memoize the code for future use
    return code;
  }

  private generateSubmissionUrl(submissionId: string) {
    return `https://codeforces.com/group/${this.groupId}/contest/${this.contestId}/submission/${submissionId}`;
  }
}
