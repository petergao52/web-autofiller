import { test, expect, Page } from '@playwright/test';

import {
  collectJobLinks,
  autofillVisaQuestions,
  autofillVoluntaryDisclosures,
  loginIfNeeded,
  exitIfAlreadyApplied,
  handleEmbeddedWindow,
  trySelectHowHeardAboutUs,
  tryClickButton
} from '../library/util';


test('Auto-apply to filtered JNJ jobs', async ({ browser }) => {
  const context = await browser.newContext(
    {viewport: { width: 800, height: 800 }}
  );
  const page = await context.newPage();
  test.setTimeout(2000000); // 20 minutes

  await page.goto('https://jj.wd5.myworkdayjobs.com/en-US/JJ/login');
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill('bennypang@magsongcorp.com');
  await page.getByRole('textbox', { name: 'Email Address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('Tablet4-hey-hay');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();

  // 🧠 Job search parameters
  const jobs = await collectJobLinks(page, 'associate director', {
  teams: [
    ''
  ],
  subteams: [
    ''
  ],
  country: 'United States of America',
  state: '',
  type: [''],
  pattern: ['']
});

  console.log(`🚀 Total jobs found: ${jobs.length}`);

  // 🔁 Loop jobs → apply flow
  for (let i = 0; i < 3; i++) {
    console.log(`\nOpening job ${i + 1}/${jobs.length}`);
    await page.goto(jobs[i], { waitUntil: 'networkidle' });
    await handleEmbeddedWindow(page);
    const page1Promise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Apply now' }).click();
    const page1 = await page1Promise;
    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    // You've already applied for this job.
    if (await exitIfAlreadyApplied(page1)) {
      continue;
    }
    // use last application
    await page1.getByRole('button', { name: 'Use My Last Application' }).click();
    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    await loginIfNeeded(page1);

    // You've already applied for this job.
    if (await exitIfAlreadyApplied(page1)) {
      continue;
    }

    // my information: HOW DID YOU HEAR ABOUT US page 1
    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await trySelectHowHeardAboutUs(page1);
    await page1.waitForTimeout(2000);

    // personal experience: page 2
    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await tryClickButton(page1, 'Save and Continue');
    await page1.waitForTimeout(2000);

    // visa questions: page 3
    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await autofillVisaQuestions(page1);
    await page1.waitForTimeout(2000);

    if (await exitIfAlreadyApplied(page1)) {
      continue;
    }

    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await autofillVisaQuestions(page1);
    await page1.waitForTimeout(2000);

    // await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    // await autofillVoluntaryDisclosures(page1);
    // await page1.waitForTimeout(2000);

    if (await exitIfAlreadyApplied(page1)) {
      continue;
    }

    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await autofillVoluntaryDisclosures(page1);
    await page1.waitForTimeout(2000);

    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await tryClickButton(page1, 'Save and Continue');
    await page1.waitForTimeout(2000);
    await tryClickButton(page1, 'Submit');
    
  }
  
});