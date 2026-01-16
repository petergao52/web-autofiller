import { Page } from '@playwright/test';

export const BASE_URL = 'https://www.careers.jnj.com';
export const PAGE_SIZE = 30;

export interface JobSearchOptions {
  teams?: string[];
  subteams?: string[];
  country?: string;
  state?: string;
  type?: string[];
  pattern?: string[];
}

/* -------------------------
   Job Search
-------------------------- */

export async function collectJobLinks(
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
    pattern = [],
  } = options;

  while (true) {
    const teamParams = teams.map(t => `team=${encodeURIComponent(t)}`).join('&');
    const subteamParams = subteams.map(st => `subteam=${encodeURIComponent(st)}`).join('&');
    const typeParams = type.map(t => `type=${encodeURIComponent(t)}`).join('&');
    const patternParams = pattern.map(p => `pattern=${encodeURIComponent(p)}`).join('&');

    const url =
      `${BASE_URL}/en/jobs/?page=${pageNumber}` +
      `&search=${encodeURIComponent(searchKeyword)}` +
      (teamParams ? `&${teamParams}` : '') +
      (subteamParams ? `&${subteamParams}` : '') +
      (typeParams ? `&${typeParams}` : '') +
      (patternParams ? `&${patternParams}` : '') +
      (country ? `&country=${encodeURIComponent(country)}` : '') +
      (state ? `&state=${encodeURIComponent(state)}` : '') +
      `&pagesize=${PAGE_SIZE}#results`;

    console.log(`🔎 Loading page ${pageNumber}`);
    await page.goto(url, { waitUntil: 'networkidle' });

    const cards = page.locator("a[href*='/en/jobs/r-']");
    const count = await cards.count();

    if (count === 0) break;

    for (let i = 0; i < count; i++) {
      const href = await cards.nth(i).getAttribute('href');
      if (href) {
        jobLinks.add(href.startsWith('http') ? href : `${BASE_URL}${href}`);
      }
    }

    pageNumber++;
  }

  return [...jobLinks];
}

/* -------------------------
   Generic Helpers
-------------------------- */

export async function tryAction(action: () => Promise<void>) {
  try {
    await action();
  } catch {}
}

export async function tryClickButton(page: Page, name: string) {
  await tryAction(async () => {
    const button = page.getByRole('button', { name: new RegExp(name, 'i') }).first();
    await button.waitFor({ state: 'visible', timeout: 3000 });
    if (await button.isEnabled()) {
      await button.click({ timeout: 2000 });
    }
  });
}

export async function tryFillTextbox(page: Page, value: string) {
  await tryAction(async () => {
    await page.getByRole('textbox').first().fill(value);
  });
}

export async function tryFillTextboxByQuestion(
  page: Page,
  question: string,
  value: string,
  locatorOverride?: string
) {
  await tryAction(async () => {
    const textbox = locatorOverride
      ? page.locator(locatorOverride)
      : page.getByRole('textbox', { name: new RegExp(question, 'i') });

    await textbox.waitFor({ state: 'visible', timeout: 3000 });
    await textbox.fill(value);
  });
}

export async function tryCheckCheckbox(page: Page, labelText: string) {
  await tryAction(async () => {
    await page.getByRole('checkbox', { name: new RegExp(labelText, 'i') }).check();
  });
}

export async function trySelectOption(
  page: Page,
  groupName: string,
  optionText: string, //No/Yes
  locatorOverride?: string
) {
  await tryAction(async () => {
    const group = locatorOverride
      ? page.locator(locatorOverride)
      : page.getByRole('group', { name: new RegExp(groupName, 'i') });

    await group.waitFor({ state: 'visible', timeout: 3000 });
    await group.getByLabel(/select one/i).click();
    await page.getByRole('option', { name: new RegExp(optionText, 'i') }).click();
  });
}

export async function trySelectFromButton(
  page: Page,
  buttonName: string,
  optionText: string,
  locatorOverride?: string
) {
  await tryAction(async () => {
    const button = locatorOverride
      ? page.locator(locatorOverride)
      : page.getByRole('button', { name: new RegExp(buttonName, 'i') });

    await button.first().click();
    await page.getByText(optionText, { exact: true }).click();
  });
}

/* -------------------------
   Workflow Helpers
-------------------------- */

export async function exitIfAlreadyApplied(page: Page): Promise<boolean> {
  try {
    await page
      .getByText("You've already applied for", { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 3000 });

    await page.close();
    return true;
  } catch {
    return false;
  }
}

export async function loginIfNeeded(page: Page) {
  const signInBtn = page.locator('#mainContent').getByRole('button', { name: 'Sign In' });

  try {
    await signInBtn.waitFor({ state: 'visible', timeout: 3000 });
    await signInBtn.click();

    await page.getByRole('textbox', { name: 'Email Address' }).fill('bennypang@magsongcorp.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('Tablet4-hey-hay');

    await page.getByLabel('Sign In').click();
    await page.waitForLoadState('networkidle');
  } catch {}
}

/* -------------------------
   Autofill Flows
-------------------------- */

export async function autofillVisaQuestions(page: Page) {
  await trySelectOption(page, 'Due to the United States', 'No');
  await tryFillTextboxByQuestion(page, 'What is your base salary expectation', '150000');
  await tryFillTextbox(page, '150000');
  await trySelectOption(page, 'Will you now or in the future', 'No');

  await trySelectOption(page, 'Do you have any agreement', 'No');
  await trySelectOption(page, 'Indicate your proficiency', 'Fluent / Native Speaker');
  await trySelectOption(page, 'If applicable, are you', 'Yes');
  await trySelectOption(page, 'Are you legally authorized', 'Yes');
  await trySelectOption(page, 'How many years of experience', 'or more years');
  await tryClickButton(page, 'Save and Continue');
}

export async function autofillVoluntaryDisclosures(page: Page) {
  await trySelectFromButton(page, 'What is your gender', 'Male');
  await trySelectFromButton(page, 'Hispanic or Latino', 'No');
  await trySelectFromButton(page, 'Please select your race', 'Asian');
  await trySelectFromButton(page, 'Do you identify as a Veteran', 'I am not a veteran');
  await tryCheckCheckbox(page, 'I certify that I have read');
  await tryClickButton(page, 'Save and Continue');
}

export async function handleEmbeddedWindow(page: Page): Promise<void> {
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

export async function trySelectHowHeardAboutUs(page: Page) {
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