import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://www.careers.jnj.com';
const PAGE_SIZE = 30;

async function collectJobLinks(
  page: Page,
  searchKeyword: string,
  teams: string[] = [],
  country = 'United States of America'
): Promise<string[]> {

  const jobLinks = new Set<string>();
  let pageNumber = 1;

  while (true) {
    const teamParams = teams.map(t => `team=${encodeURIComponent(t)}`).join('&');

    const url =
      `${BASE_URL}/en/jobs/?` +
      `page=${pageNumber}` +
      `&search=${encodeURIComponent(searchKeyword)}` +
      `&${teamParams}` +
      `&country=${encodeURIComponent(country)}` +
      `&pagesize=${PAGE_SIZE}#results`;

    console.log(`🔎 Loading page ${pageNumber}: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });

    const cards = page.locator("a[href*='/en/jobs/r-']");
    const count = await cards.count();

    // 🔚 auto-detect last page
    if (count === 0) {
      console.log('✅ No more jobs detected');
      break;
    }

    for (let i = 0; i < count; i++) {
      const href = await cards.nth(i).getAttribute('href');
      if (!href) continue;

      const fullUrl = href.startsWith('http')
        ? href
        : `${BASE_URL}${href}`;

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
  optionText: string
) {
  try {
    const group = page.getByRole('group', {
      name: new RegExp(groupName, 'i'),
    });

    if (await group.count() === 0) return;

    const select = group.getByLabel(/select one/i);
    if (await select.count() === 0) return;
    if (!(await select.isVisible())) return;

    await select.click({ timeout: 1000 });

    const option = page.getByRole('option', {
      name: new RegExp(optionText, 'i'),
    });

    if (await option.count() === 0) return;

    await option.click({ timeout: 1000 });
  } catch {
    // swallow everything
  }
}

async function tryFillTextboxByQuestion(
  page: Page,
  question: string,
  value: string
) {
  await tryAction(async () => {
    const textbox = page.getByRole('textbox', {
      name: new RegExp(question, 'i'),
    });

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

async function tryClickButton(
  page: Page,
  name: string
) {
  try {
    const button = page
      .getByRole('button', { name: new RegExp(name, 'i') })
      .first();

    if (await button.count() === 0) return;

    if (!(await button.isVisible())) return;
    if (!(await button.isEnabled())) return;

    await button.click({ timeout: 1000 });
  } catch {
    // swallow EVERYTHING
  }
}

export async function autofillVisaQuestions(page: Page) {
  // Due to the United States...
  await trySelectOption(
    page,
    'Due to the United States',
    'No'
  );
  await page.waitForTimeout(2000);

  // Salary / numeric textbox
  await tryFillTextboxByQuestion(
  page,
  'base salary expectation',
  '150000'
  );
  await page.waitForTimeout(2000);
  // Will you now or in the future...
  await trySelectOption(
    page,
    'Will you now or in the future',
    'No'
  );
  await page.waitForTimeout(2000);

  // Do you have any agreement...
  await trySelectOption(
    page,
    'Do you have any agreement',
    'No'
  );
  await page.waitForTimeout(2000);

  // Language proficiency
  await trySelectOption(
    page,
    'Indicate your proficiency',
    'Fluent / Native Speaker'
  );
  await page.waitForTimeout(2000);

  // If applicable, are you...
  await trySelectOption(
    page,
    'If applicable, are you',
    'Yes'
  );
  await page.waitForTimeout(2000);

  // Work authorization
  await trySelectOption(
    page,
    'Are you legally authorized',
    'Yes'
  );
  await page.waitForTimeout(2000);

  // Years of experience
  await trySelectOption(
    page,
    'How many years of experience',
    '10 or more years'
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
  test.setTimeout(120000);

  await page.goto('https://jj.wd5.myworkdayjobs.com/en-US/JJ/login');
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill('vdmcornell@gmail.com');
  await page.getByRole('textbox', { name: 'Email Address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('Tablet4-hey-hay');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();

  // 🧠 Job search parameters
  const jobs = await collectJobLinks(
    page,
    'associate director',
    [
      'Data Analytics & Computational Sciences',
      'Digital Marketing',
      'Marketing',
      'Sales Enablement'
    ]
  );

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

    // personal experience
    await page1.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await tryClickButton(page1, 'Save and Continue');
    await page1.waitForTimeout(2000);

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
    await tryClickButton(page1, 'Save and Continue');
    await page1.waitForTimeout(2000);
    await tryClickButton(page1, 'Submit');
    
  }
  
});