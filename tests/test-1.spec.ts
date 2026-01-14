import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://www.careers.jnj.com';
const PAGE_SIZE = 30;

interface JobSearchOptions {
  teams?: string[];
  subteams?: string[];
  country?: string;
  state?: string;
  type?: string[];       // e.g., ['Full time']
  pattern?: string[];    // e.g., ['Fully Remote', 'Hybrid Work']
}

async function collectJobLinks(
  page: Page,
  searchKeyword: string,
  options: JobSearchOptions = {}
): Promise<string[]> {
  const jobLinks = new Set<string>();
  let pageNumber = 1;

  const {
    teams = [],
    subteams = [],
    country = 'United States of America',
    state,
    type = [],
    pattern = []
  } = options;

  while (true) {
    const teamParams = teams.map(t => `team=${encodeURIComponent(t)}`).join('&');
    const subteamParams = subteams.map(st => `subteam=${encodeURIComponent(st)}`).join('&');
    const typeParams = type.map(t => `type=${encodeURIComponent(t)}`).join('&');
    const patternParams = pattern.map(p => `pattern=${encodeURIComponent(p)}`).join('&');

    const url =
      `${BASE_URL}/en/jobs/?` +
      `page=${pageNumber}` +
      `&search=${encodeURIComponent(searchKeyword)}` +
      (teamParams ? `&${teamParams}` : '') +
      (subteamParams ? `&${subteamParams}` : '') +
      (typeParams ? `&${typeParams}` : '') +
      (patternParams ? `&${patternParams}` : '') +
      (country ? `&country=${encodeURIComponent(country)}` : '') +
      (state ? `&state=${encodeURIComponent(state)}` : '') +
      `&pagesize=${PAGE_SIZE}#results`;

    console.log(`🔎 Loading page ${pageNumber}: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });

    const cards = page.locator("a[href*='/en/jobs/r-']");
    const count = await cards.count();

    if (count === 0) {
      console.log('✅ No more jobs detected');
      break;
    }

    for (let i = 0; i < count; i++) {
      const href = await cards.nth(i).getAttribute('href');
      if (!href) continue;
      const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      jobLinks.add(fullUrl);
    }

    console.log(`📌 Jobs collected so far: ${jobLinks.size}`);
    pageNumber++;
  }

  return [...jobLinks];
}

async function handleEmbeddedWindow(page: Page): Promise<void> {
  try {
    // Wait for the Close button to appear with a reasonable timeout
    const closeButton = page.getByRole('button', { name: 'Close' });
    await closeButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // If it's visible, click it
    await closeButton.click();
    
    // Wait for it to disappear (optional, but good practice)
    await closeButton.waitFor({ state: 'hidden', timeout: 5000 });
  } catch (error) {
    // If Close button doesn't appear within timeout, continue
    console.log('Close button not found, continuing...');
  }
}

async function tryAction(action: () => Promise<void>) {
  try {
    await action();
  } catch {
    // silently skip if element not found / not visible
  }
}

async function trySelectOption(
  page: Page,
  groupName: string,
  optionText: string,
  locatorOverride?: string // optional selector
) {
  try {
    const group = locatorOverride
      ? page.locator(locatorOverride)
      : page.getByRole('group', { name: new RegExp(groupName, 'i') });

    await group.waitFor({ state: 'visible', timeout: 3000 });

    // Click to open dropdown
    const select = group.getByLabel(/select one/i);
    if (await select.count() === 0) return;
    await select.click({ timeout: 2000 });

    // Click option
    const option = page.getByRole('option', { name: new RegExp(optionText, 'i') });
    if (await option.count() === 0) return;
    await option.click({ timeout: 2000 });
  } catch (e) {
    console.log(`Option "${optionText}" in "${groupName}" failed: ${e}`);
  }
}

async function tryFillTextboxByQuestion(
  page: Page,
  question: string,
  value: string,
  locatorOverride?: string // optional selector
) {
  await tryAction(async () => {
    const textbox = locatorOverride
      ? page.locator(locatorOverride)
      : page.getByRole('textbox', { name: new RegExp(question, 'i') });

    await textbox.waitFor({ state: 'visible', timeout: 3000 });
    await textbox.fill(value);
  });
}
async function tryClickByText(page: Page, text: string) {
  await tryAction(async () => {
    await page.getByText(text, { exact: true }).click();
  });
}

async function trySelectFromButton(
  page: Page,
  buttonName: string,
  optionText: string
) {
  try {
    const button = page.getByRole('button', {
      name: new RegExp(buttonName, 'i'),
    });

    if (await button.count() === 0) return;
    if (!(await button.first().isVisible())) return;

    await button.first().click({ timeout: 1000 });

    const option = page.getByRole('option', {
      name: new RegExp(optionText, 'i'),
    });

    if (await option.count() === 0) return;

    await option.first().click({ timeout: 1000 });
  } catch {
    // swallow everything
  }
}

async function tryCheckCheckbox(
  page: Page,
  labelText: string
) {
  await tryAction(async () => {
    await page.getByRole('checkbox', { name: new RegExp(labelText, 'i') }).check();
  });
}

async function tryClickButton(page: Page, name: string) {
  try {
    const button = page.getByRole('button', { name: new RegExp(name, 'i') }).first();

    // Wait for it to be visible and enabled
    await button.waitFor({ state: 'visible', timeout: 3000 });
    if (!(await button.isEnabled())) return;

    await button.click({ timeout: 2000 });
  } catch (e) {
    console.log(`Button "${name}" click failed: ${e}`);
    // swallow or handle error
  }
}

export async function autofillVisaQuestions(page: Page) {
  // Due to the United States...
  await trySelectOption(page, 'Due to the United States', 'No');
  await page.waitForTimeout(2000);

  // Salary / numeric textbox (using hardcoded locator)
  await tryFillTextboxByQuestion(
    page,
    'What is your base salary expectation',
    '150000',
    '#primaryQuestionnaire--77a81d95565210001feaa33c16fa0002'
  );
  await page.waitForTimeout(2000);

  // Will you now or in the future...
  await trySelectOption(page, 'Will you now or in the future', 'No');
  await page.waitForTimeout(2000);

  // Do you have any agreement...
  await trySelectOption(page, 'Do you have any agreement', 'No');
  await page.waitForTimeout(2000);

  // Language proficiency
  await trySelectOption(page, 'Indicate your proficiency', 'Fluent / Native Speaker');
  await page.waitForTimeout(2000);

  // If applicable, are you...
  await trySelectOption(page, 'If applicable, are you', 'Yes');
  await page.waitForTimeout(2000);

  // Work authorization
  await trySelectOption(page, 'Are you legally authorized', 'Yes');
  await page.waitForTimeout(2000);

  // Years of experience (using hardcoded locator)
  await trySelectOption(
    page,
    'How many years of experience',
    'or more years',
    '#primaryQuestionnaire--77a81d95565210001feaa46f64d10006'
  );
  await page.waitForTimeout(2000);

  // Save and Continue
  await tryClickButton(page, 'Save and Continue');
  console.log('✅ Visa questions autofilled');
}

export async function autofillVoluntaryDisclosures(page: Page) {
  // Gender
  await trySelectFromButton(
    page,
    'What is your gender',
    'Male'
  );

  // Hispanic or Latino
  await trySelectFromButton(
    page,
    'Hispanic or Latino',
    'No'
  );

  // Race
  await trySelectFromButton(
    page,
    'Please select your race',
    'Asian'
  );

  // Veteran status
  await trySelectFromButton(
    page,
    'Do you identify as a Veteran',
    'I am not a veteran'
  );

  // Certification checkbox
  await tryCheckCheckbox(
    page,
    'I certify that I have read'
  );

  // Save and Continue
  await tryClickButton(page, 'Save and Continue');
  console.log('✅ Voluntary disclosures autofilled');
}

async function exitIfAlreadyApplied(page: Page): Promise<boolean> {
  const appliedMsg = page.getByText("You've already applied for", {
    exact: false,
  });

  try {
    await appliedMsg.first().waitFor({
      state: 'visible',
      timeout: 3000, // short, safe
    });

    console.log('⛔ Already applied — exiting page');
    await page.close();
    return true;
  } catch {
    return false;
  }
}

async function loginIfNeeded(page: Page) {
  const signInBtn = page
    .locator('#mainContent')
    .getByRole('button', { name: 'Sign In' });

  try {
    await signInBtn.waitFor({ state: 'visible', timeout: 3000 });

    console.log('🔐 Sign-in detected — logging in again');

    await signInBtn.click();

    await page.getByRole('textbox', { name: 'Email Address' }).fill(
      'vdmcornell@gmail.com'
    );

    await page.getByRole('textbox', { name: 'Password' }).fill(
      'Tablet4-hey-hay'
    );

    await page.getByLabel('Sign In').click();

    // optional: wait for login to complete
    await page.waitForLoadState('networkidle');
  } catch {
    // Sign In button not present → already logged in
  }
}

async function trySelectHowHeardAboutUs(page: Page) {
  try {
    const field = page.getByRole('textbox', {
      name: 'How Did You Hear About Us?',
    });

    await field.waitFor({ state: 'visible', timeout: 3000 });
    await field.click();

    await page.getByText('Company Web Site').click();
    await page.getByText('careers.jnj.com').click();

    await tryClickButton(page, 'Save and Continue');
  } catch {
    // field not present → skip silently
  }
}


test('Auto-apply to filtered JNJ jobs', async ({ browser }) => {
  const context = await browser.newContext(
    {viewport: { width: 800, height: 800 }}
  );
  const page = await context.newPage();
  test.setTimeout(2000000); // 20 minutes

  await page.goto('https://jj.wd5.myworkdayjobs.com/en-US/JJ/login');
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill('vdmcornell@gmail.com');
  await page.getByRole('textbox', { name: 'Email Address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('Tablet4-hey-hay');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();

  // 🧠 Job search parameters
  const jobs = await collectJobLinks(page, 'associate director', {
  teams: [
    'Technology Enterprise Strategy & Security',
    'Strategy & Corporate Development',
    'Regulatory Affairs Group'
  ],
  subteams: [
    'Regulatory Product Submissions and Registration',
    'Security & Controls',
    'Data Architecture',
    'Regulatory Affairs',
    'Strategic Planning'
  ],
  country: 'United States of America',
  state: 'New Jersey',
  type: ['Full time'],
  pattern: ['Fully Remote', 'Hybrid Work']
});

  console.log(`🚀 Total jobs found: ${jobs.length}`);

  // 🔁 Loop jobs → apply flow
  for (let i = 0; i < jobs.length; i++) {
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

    // HOW DID YOU HEAR ABOUT US
    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await trySelectHowHeardAboutUs(page1);
    await page1.waitForTimeout(2000);

    // personal experience
    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await tryClickButton(page1, 'Save and Continue');
    await page1.waitForTimeout(2000);

    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await autofillVisaQuestions(page1);
    await page1.waitForTimeout(2000);

    if (await exitIfAlreadyApplied(page1)) {
      continue;
    }

    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await autofillVisaQuestions(page1);
    await page1.waitForTimeout(2000);

    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await autofillVoluntaryDisclosures(page1);
    await page1.waitForTimeout(2000);

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