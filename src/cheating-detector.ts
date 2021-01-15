import cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import axios from 'axios';
import CodeforcesClient from 'codeforces-client';
import _ from 'lodash';

import compareCode from './compare-code';
import { scheduleJobs } from './schedule-jobs';

export default class CheatingDetector {
  private cookies: string | undefined = undefined;

  constructor(
    private cfUsername: string,
    private cfPassword: string,
    private groupId: string,
    private contestId: string,
    private blackList: Array<string>,
    private requiredPercentage: number,
    private codesMemo: Map<string, string>,
  ) {}

  public run = async () => {
    let authCookies: any[];
    let parsedCookies: string;

    if (!this.cookies) {
      authCookies = await this.login();
      parsedCookies = authCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      this.cookies = parsedCookies;
    } else {
      parsedCookies = this.cookies;
    }

    const submissions: any = await this.generateSubmissionObjects();

    const codeJobs = submissions.map((submission: any) => () =>
      this.getSourceCode(String(submission.id), parsedCookies),
    );

    console.log(`[CF FETCH SOURCE CODE] START: ${codeJobs.length} submissions`);

    const jobsPerTimeFrame = Number(process.env.JOBS_PER_TIME_FRAME || 30);
    const timeFrame = Number(process.env.TIME_FRAME || 1000);

    const codes = await scheduleJobs(codeJobs, jobsPerTimeFrame, timeFrame, remainingJobs => {
      console.log('REMAINING CODES TO FETCH:', remainingJobs);
    });

    console.log('[CF FETCH SOURCE CODE] DONE');

    submissions.forEach((submission: any, index: number) => {
      // eslint-disable-next-line no-param-reassign
      submission.code = codes[index];
      // eslint-disable-next-line no-param-reassign
      submission.url = this.generateSubmissionUrl(submission.id);
    });

    const cheatingCases: any[] = [];
    const groupedSubmissions = _.groupBy(submissions, 'index');

    // eslint-disable-next-line no-restricted-syntax
    Object.values(groupedSubmissions).forEach(problemSubmissions => {
      for (let i = 0; i < problemSubmissions.length; i += 1) {
        for (let j = i + 1; j < problemSubmissions.length; j += 1) {
          if (
            problemSubmissions[i].handle !== problemSubmissions[j].handle &&
            problemSubmissions[i].index === problemSubmissions[j].index
          ) {
            const matchingPercentage = compareCode(problemSubmissions[i].code, problemSubmissions[j].code);

            if (matchingPercentage >= this.requiredPercentage) {
              cheatingCases.push({
                matchingPercentage,
                first: problemSubmissions[i],
                second: problemSubmissions[j],
              });
            }
          }
        }
      }
    });

    return cheatingCases.map(cheatingCase => ({
      ...cheatingCase,
      first: _.omit(cheatingCase.first, 'code'),
      second: _.omit(cheatingCase.second, 'code'),
    }));
  };

  private async login() {
    console.log('[CF LOGIN] START');

    const loginUrl = 'https://codeforces.com/enter';
    const browser = await puppeteer.launch({
      args: ['--no-sandbox'],
      timeout: 0,
    });
    const page = await browser.newPage();
    await page.goto(loginUrl, { timeout: 0 });

    await page.type('input[name="handleOrEmail"]', this.cfUsername);
    await page.type('input[name="password"]', this.cfPassword);
    await page.click('input[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'load', timeout: 0 });
    const cookies = await page.cookies();
    browser.close();

    console.log('[CF LOGIN] DONE');

    return cookies;
  }

  private async generateSubmissionObjects() {
    console.log('[CF FETCH SUBMISSION] START');

    const client = new CodeforcesClient(process.env.CF_KEY, process.env.CF_SECRET);

    const submissions = await client.contest.status({
      contestId: this.contestId,
    });

    console.log('[CF FETCH SUBMISSION] DONE');

    if (submissions.status !== 'OK') {
      throw new Error('API failed to fetch submissions');
    }

    return submissions.result
      .filter(
        submission =>
          (submission.verdict ? submission.verdict === 'OK' : false) &&
          submission.author.participantType === 'CONTESTANT' &&
          this.blackList.includes(submission.problem.index) === false,
      )
      .map(submission => ({
        id: submission.id,
        handle: submission.author.members[0].handle,
        index: submission.problem.index,
      }));
  }

  private getSourceCode = async (submissionId: string, cookies: string) => {
    if (this.codesMemo.get(submissionId)) {
      return this.codesMemo.get(submissionId);
    }

    const submissionUrl = this.generateSubmissionUrl(submissionId);

    const result = await axios.get(submissionUrl, {
      headers: {
        Cookie: cookies,
      },
    });

    const $ = cheerio.load(result.data);
    this.codesMemo.set(submissionId, $('.prettyprint').text());
    return this.codesMemo.get(submissionId);
  };

  private generateSubmissionUrl(submissionId: string) {
    return `https://codeforces.com/group/${this.groupId}/contest/${this.contestId}/submission/${submissionId}`;
  }
}
