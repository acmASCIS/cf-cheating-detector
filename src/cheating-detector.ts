import cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import axios from 'axios';
import CodeforcesClient from 'codeforces-client';
import _ from 'lodash';

export default class CheatingDetector {
  constructor(
    private cfUsername: string,
    private cfPassword: string,
    private groupId: string,
    private contestId: string,
    private requiredPercentage: number,
  ) {}

  public run = async () => {
    const authCookies = await this.login();

    const parsedCookies = authCookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');

    const submissions: any = await this.generateSubmissionObjects();
    const codePromises = submissions.map((submission: any) =>
      this.getSourceCode(submission.id, parsedCookies),
    );
    const codes = await Promise.all(codePromises);
    submissions.forEach((submission: any, index: number) => {
      // eslint-disable-next-line no-param-reassign
      submission.code = codes[index];
    });

    const cheatingCases: any[] = [];
    const groupedSubmissions = _.groupBy(submissions, 'index');
    // eslint-disable-next-line no-restricted-syntax
    Object.values(groupedSubmissions).forEach(problemSubmissions => {
      for (let i = 0; i < problemSubmissions.length; i += 1) {
        for (let j = i + 1; j < problemSubmissions.length; j += 1) {
          // TODO: check function
          const matchingPercentage = 0.9;
          if (matchingPercentage >= this.requiredPercentage) {
            cheatingCases.push({
              first: problemSubmissions[i],
              second: problemSubmissions[j],
            });
          }
        }
      }
    });

    return cheatingCases;
  };

  private async login() {
    const loginUrl = 'https://codeforces.com/enter';
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(loginUrl);

    await page.type('input[name="handleOrEmail"]', this.cfUsername);
    await page.type('input[name="password"]', this.cfPassword);
    await page.click('input[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'load' });
    const cookies = await page.cookies();
    browser.close();

    return cookies;
  }

  private async generateSubmissionObjects() {
    const client = new CodeforcesClient(
      process.env.CF_KEY,
      process.env.CF_SECRET,
    );
    const submissions = await client.contest.status({
      contestId: this.contestId,
    });

    if (submissions.status === 'OK') {
      return submissions.result
        .filter(submission =>
          submission.verdict ? submission.verdict === 'OK' : false,
        )
        .map(submission => ({
          id: submission.id,
          handle: submission.author.members[0].handle,
          index: submission.problem.index,
        }));
    }
    return [];
  }

  public getSourceCode = async (submissionId: string, cookies: string) => {
    const submissionUrl = `https://codeforces.com/group/${this.groupId}/contest/${this.contestId}/submission/${submissionId}`;

    const result = await axios.get(submissionUrl, {
      headers: {
        Cookie: cookies,
      },
    });

    const $ = cheerio.load(result.data);
    return $('.prettyprint').text();
  };
}
