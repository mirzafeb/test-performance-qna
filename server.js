const puppeteer = require('puppeteer');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const requireEnv = (k) => {
  if (!process.env[k]) throw new Error(`Missing env var ${k}`);
  return process.env[k];
};

function generateTestDevName() {
  return `TEST_DEV_AN_${Math.floor(Math.random() * 10000)}`;
}

function generateRandomPhone() {
  return Math.floor(Math.random() * (9999999 - 1000000 + 1)) + 1000000;
}

function generateRandomWords(count = 5) {
  const words = ['sky', 'logic', 'apple', 'jump', 'green', 'mouse', 'code', 'river', 'moon', 'light'];
  return Array.from({ length: count }, () => words[Math.floor(Math.random() * words.length)]).join(' ');
}

async function startInterviewByOpenCode() {
  const url = process.env.INTERVIEW_PUBLIC_URL;
  if (!url) throw new Error('Missing env var INTERVIEW_PUBLIC_URL');

  const form = new FormData();
  const testName = generateTestDevName();
  const randomPhone = generateRandomPhone();

  form.append('company_id', requireEnv('COMPANY_ID'));
  form.append('job_id', requireEnv('JOB_ID'));
  form.append('interview_code', requireEnv('INTERVIEW_CODE'));
  form.append('cv', '');
  form.append('experience', process.env.EXPERIENCE_TEXT || '');
  form.append('whatsapp_notification', process.env.WHATSAPP_NOTIFICATION ?? 'false');
  form.append('fullname', testName);
  form.append('preferred_name', testName);
  form.append('email', `${testName}@mailinator.com`);
  form.append('email2', `${testName}@mailinator.com`);
  form.append('phone', randomPhone);
  form.append('gdpr', process.env.GDPR_CONSENT ?? 'true');
  form.append('document_candidate[0][type]', process.env.DOCUMENT_0_TYPE || 'CV/Resume');
  form.append('document_candidate[0][option_value]', process.env.DOCUMENT_0_OPTION_VALUE || '0');
  form.append('file_cv', process.env.CV_FILE_PATH || '');

  try {
    const response = await axios.post(url, form, { headers: form.getHeaders() });
    const { interview_code } = response.data;
    console.log('Success:', interview_code);
    await visitPage(interview_code);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

async function genericSectionNavigator(page, action) {
  const loop = async () => {
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('button')).some(b => {
        const t = b.textContent.trim().toLowerCase();
        return t === 'next' || t === 'end section';
      });
    }, { timeout: 5000 });

    const status = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'next');
      const endBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'end section');
      if (nextBtn) { nextBtn.click(); return 'next'; }
      if (endBtn) { endBtn.click(); return 'end'; }
      return 'none';
    });
    return status !== 'end';
  };

  while (true) {
    await action();
    const cont = await loop();
    if (!cont) break;
    await delay(6000);
  }
}

async function fillFormAndNavigateFtq(page) {
  await genericSectionNavigator(page, async () => {
    await page.waitForSelector('#ftqForm');
    await page.type('#ftqForm', generateRandomWords());
  });
}

async function fillFormAndNavigateMcq(page) {
  await genericSectionNavigator(page, async () => {
    await page.waitForSelector('button[data-checked="0"]');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'A');
      if (btn) btn.click();
    });
  });
}

async function clickButtonByText(page, text, selector = 'button') {
  await page.waitForFunction((t, sel) => {
    return Array.from(document.querySelectorAll(sel)).some(b => b.textContent.trim().toLowerCase() === t.toLowerCase());
  }, {}, text, selector);
  await page.evaluate((t, sel) => {
    const btn = Array.from(document.querySelectorAll(sel)).find(b => b.textContent.trim().toLowerCase() === t.toLowerCase());
    if (btn) btn.click();
  }, text, selector);
}

async function visitPage(interview_code) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--window-size=1920,1080',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-file-access-from-files',
      '--no-sandbox'
    ]
  });
  const page = await browser.newPage();

  try {
    const base = process.env.QNA_BASE_URL;
    if (!base) throw new Error('Missing env var QNA_BASE_URL');
    await page.goto(`${base}/code/${interview_code}`, { waitUntil: 'networkidle2' });
    await delay(6000);

    await clickButtonByText(page, 'Start Session');
    await page.waitForSelector('button[name="gdpr"]');
    await page.click('button[name="gdpr"]');
    await clickButtonByText(page, 'Accept', 'button.button');

    await clickButtonByText(page, 'Start Section', 'button.button');
    await fillFormAndNavigateFtq(page);

    await clickButtonByText(page, 'Start Section', 'button.button');
    await fillFormAndNavigateMcq(page);

    await clickButtonByText(page, 'Start Section', 'button.button');

    await page.waitForSelector('button[data-checked="0"]');
    await page.click('button[data-checked="0"]');

    await clickButtonByText(page, 'Continue', 'button.button');
    await page.waitForSelector('text.CircularProgressbar-text');
    await page.click('text.CircularProgressbar-text');
    await delay(15000);
    await page.click('text.CircularProgressbar-text');

    await page.waitForSelector('button.button.btn-checklist');
    await page.click('button.button.btn-checklist');

    await page.waitForSelector('h2.heading2');
    await clickButtonByText(page, 'Continue', 'button.button.button--medium.button__primary');
  } catch (e) {
    console.error('Visit error:', e.message);
  } finally {
    await browser.close();
  }
}

async function startLoop(totalAttempts = 5) {
  for (let i = 0; i < totalAttempts; i++) {
    console.log(`Attempt #${i + 1}`);
    await startInterviewByOpenCode();
    await delay(5000);
  }
  console.log('Loop ended after', totalAttempts, 'attempts');
}

// Run N parallel loops if needed
(async () => {
  const parallelLoops = 5; // adjust if you really want concurrency
  await Promise.all(Array.from({ length: parallelLoops }, () => startLoop()));
})();
