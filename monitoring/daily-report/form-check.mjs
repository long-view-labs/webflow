// Interactive checks that the page screenshots can't see, per page and viewport:
//   quiz             - the Videsigns multi-step quiz (/paid, /paid-labs): answer every
//                      step and reach the signup link at the end
//   insurance search - each insurance-search module (hero "Check your coverage",
//                      "Find dietitians"): pick a carrier (and a state, and type a first
//                      name where the module has those fields) and check that the
//                      module's own signup link picks each one up (hero-filter-search.js)
// Same protection as the other checks (analytics unresolvable, non-GET aborted,
// beacons dropped, submits blocked); every navigation off www.nourish.com,
// including the quiz's final signup click, is recorded and aborted, and
// /dietitian-application is never loaded. Inputs are synthetic and only ever end
// up in a link that is never followed.
import {extraBlock} from './nav-check.mjs';

const SIGNUP_HOSTS = ['signup.nourish.com', 'signup.usenourish.com'];
export const TEST_CARRIER = /^Insurance-Cigna/; // input id prefix; Cigna's nourishPayerId is 3
export const TEST_STATE = {id: 'California', param: 'CA'};
export const TEST_FIRST_NAME = 'Monitor';

// The first script URL in a stack trace, so a known vendor error can be matched to its source.
export function errorSource(stack = '') {
  return String(stack).match(/https?:\/\/[^\s)]+?\.js(?=[:?)\s]|$)/)?.[0] ?? null;
}

// Which parameters a module's link must gain after each choice.
export function linkFailures(before, after, expected) {
  const failures = [];
  for (const [key, want] of Object.entries(expected)) {
    const got = after.get(key);
    if (got == null || got === '') failures.push(`link has no ${key} after choosing it`);
    else if (want !== true && got !== want) failures.push(`link ${key}=${got}, expected ${want}`);
  }
  if (!after.get('landingPageVariation') && before.get('landingPageVariation')) failures.push('link lost landingPageVariation');
  return failures;
}

// Visible social-proof interstitials (e.g. /paid-sp's "80% of patients see health
// improvements in 30 days") sit between quiz steps; a visitor clicks their Next.
async function passInterstitials(page) {
  const next = page.locator('.social-proof_popup:visible').getByText('Next', {exact: true}).first();
  let seen = 0;
  while (seen < 3 && await next.isVisible().catch(() => false)) {
    await next.click({timeout: 8000});
    await page.waitForTimeout(700);
    seen++;
  }
  return seen;
}

async function walkQuiz(page, captured, onFinalStep = async () => []) {
  const visibleStep = () => page.evaluate(() => {
    const steps = [...document.querySelectorAll('[data-form="step"]')];
    const i = steps.findIndex((s) => s.getBoundingClientRect().height > 0 && getComputedStyle(s).display !== 'none');
    return {index: i, total: steps.length, question: steps[i]?.innerText.split('\n').find(Boolean)?.slice(0, 60) ?? null};
  });
  const path = [];
  let interstitials = 0;
  let step = await visibleStep();
  if (step.total === 0) return null;
  for (let guard = 0; guard < step.total + 1; guard++) {
    if (step.index < 0) return {status: 'fail', detail: `quiz step ${path.length + 1} did not appear`, path};
    path.push(step.question);
    // The step with a visible signup link is the last one, even when it also has
    // inputs of its own (an insurance search on /paidwl and /paid-qa).
    const link = page.locator('[data-form="step"]:visible a[href*="signup."]:visible').first();
    if (await link.count()) {
      const extra = await onFinalStep();
      const href = await link.getAttribute('href'), label = (await link.innerText().catch(() => '')).trim();
      const host = (() => { try { return new URL(href, page.url()).hostname; } catch { return null; } })();
      if (!SIGNUP_HOSTS.includes(host)) return {status: 'fail', detail: `quiz ends on a link to ${host ?? href}, not signup`, path, extra};
      await link.click({timeout: 8000}).catch(() => {});
      await page.waitForTimeout(1000);
      const went = captured.find((u) => SIGNUP_HOSTS.includes(new URL(u).hostname));
      return {status: 'pass', detail: `${step.total - 1} questions answered${interstitials ? ` (+${interstitials} social-proof card${interstitials > 1 ? "s" : ""})` : ''}; "${label}" ${went ? 'opens' : 'links to'} signup`, path, signupUrl: went ?? href, extra};
    }
    const option = page.locator('[data-form="step"]:visible label:visible').first();
    if (!(await option.count())) return {status: 'fail', detail: `quiz step "${step.question}" has no visible answers and no signup link`, path};
    try { await option.click({timeout: 8000}); }
    catch (e) { return {status: 'fail', detail: `could not answer "${step.question}": ${e.message.split('\n').find((l) => /intercepts pointer/.test(l))?.trim() ?? e.message.split('\n')[0]}`, path}; }
    await page.waitForTimeout(900);
    interstitials += await passInterstitials(page);
    const next = await visibleStep();
    if (next.index === step.index) return {status: 'fail', detail: `answering "${step.question}" did not advance the quiz`, path};
    step = next;
  }
  return {status: 'fail', detail: 'quiz did not reach a final step', path};
}

async function checkSearchModules(page) {
  const count = await page.locator('form:has(#insurance_filter)').count();
  const modules = [];
  for (let i = 0; i < count; i++) {
    const form = page.locator('form:has(#insurance_filter)').nth(i);
    if (!(await form.isVisible()) || !(await form.locator('#insurance_filter').first().isVisible())) continue;
    // The module's link sits in its section (hero-filter-search.js findWidgetCTA);
    // tag it so the locator below can't land on another module's link.
    const tagged = await form.evaluate((f, i) => {
      const root = f.closest('section, [class*="section"]') || f;
      const a = root.querySelector('#home-filter-cta, #provider-filter-cta') || root.querySelector('a[href*="signup.nourish.com"]');
      if (a) a.setAttribute('data-monitor-cta', String(i));
      return !!a;
    }, i);
    const cta = page.locator(`[data-monitor-cta="${i}"]`);
    if (!tagged) { modules.push({module: `module ${i + 1}`, status: 'fail', detail: 'insurance search has no signup link'}); continue; }
    const name = (await cta.innerText().catch(() => '')).trim() || `module ${i + 1}`;
    const result = {module: name, status: 'fail', chose: []};
    try {
      const read = async () => new URL(await cta.getAttribute('href'), page.url()).searchParams;
      const before = await read();
      const expected = {};
      await form.locator('#insurance_filter').first().click({timeout: 8000});
      const carrier = form.locator('label:has(input[name="Insurance"])').filter({has: page.locator('input[id^="Insurance-Cigna"]')}).first();
      await carrier.click({timeout: 8000});
      await page.waitForTimeout(500);
      expected.nourishPayerId = true;
      result.chose.push('Cigna');
      if (await form.locator('#state_filter').count()) {
        await form.locator('#state_filter').first().click({timeout: 8000});
        await form.locator(`label:has(input[name="States"][id="${TEST_STATE.id}"])`).first().click({timeout: 8000});
        await page.waitForTimeout(500);
        expected.state = TEST_STATE.param;
        result.chose.push(TEST_STATE.id);
      }
      const first = form.locator('#first-name');
      if (await first.count() && await first.isVisible()) {
        // Typed key by key like a visitor: global.js re-adds landingPageVariation
        // to the rebuilt link a moment after hero-filter-search.js rewrites it.
        await first.click();
        await first.pressSequentially(TEST_FIRST_NAME, {delay: 30});
        await page.waitForTimeout(800);
        expected.firstName = TEST_FIRST_NAME;
        result.chose.push('first name');
      }
      // Let the link settle: on pages hero-filter-search.js has no landingPageVariation
      // for (/insurance-dietitians/*), it drops the variation on every rebuild and
      // global.js puts it back a second or two later. A click in that gap reaches
      // signup unattributed, so a slow settle is reported, not passed silently.
      const t0 = Date.now();
      let after = await read(), failures = linkFailures(before, after, expected);
      while (failures.length && Date.now() - t0 < 3000) {
        await page.waitForTimeout(250);
        after = await read(); failures = linkFailures(before, after, expected);
      }
      result.settleMs = Date.now() - t0;
      result.link = `${new URL(await cta.getAttribute('href'), page.url()).pathname} ?${[...after.keys()].join('&')}`;
      result.status = failures.length ? 'fail' : 'pass';
      result.detail = failures.length ? failures.join('; ') : `chose ${result.chose.join(', ')}; link updated (${Object.keys(expected).join(', ')})`
        + (!failures.length && result.settleMs > 1000 ? `, but landingPageVariation was missing for ~${(result.settleMs / 1000).toFixed(1)}s after typing` : '');
    } catch (e) {
      result.detail = `could not use the module: ${e.message.split('\n')[0]}`;
    }
    modules.push(result);
  }
  return modules;
}

export async function checkForms(browser, {url, viewport}, {protectPage}) {
  const context = await browser.newContext({serviceWorkers: 'block', viewport: {width: viewport.width, height: viewport.height}});
  const captured = [], pageErrors = [];
  // Context-level, so a link that opens a new tab is caught too.
  await context.route('**/*', (route) => {
    const req = route.request(), target = req.url();
    let host = null;
    try { host = new URL(target).hostname; } catch {}
    // A new tab's first request has no frame yet; treat it as top-level.
    let topLevel = false;
    if (req.isNavigationRequest()) { try { topLevel = req.frame().parentFrame() === null; } catch { topLevel = true; } }
    if (topLevel && host !== 'www.nourish.com') { captured.push(target); return route.abort('blockedbyclient'); }
    return extraBlock(target) ? route.abort('blockedbyclient') : route.fallback();
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push({message: e.message, source: errorSource(e.stack)}));
  const result = {viewport: viewport.id, status: 'pass', quiz: null, search: [], pageErrors};
  try {
    await protectPage(page);
    await page.goto(url, {waitUntil: 'load', timeout: 30000});
    await page.waitForTimeout(1500);
    result.quiz = await walkQuiz(page, captured, () => checkSearchModules(page));
    result.search = (result.quiz?.extra ?? []).map((m) => ({...m, module: `${m.module} (quiz last step)`}));
    if (result.quiz) { await page.goto(url, {waitUntil: 'load', timeout: 30000}); await page.waitForTimeout(1500); }
    result.search.push(...await checkSearchModules(page));
  } catch (e) {
    result.error = e.message.split('\n')[0];
  } finally {
    await context.close();
  }
  const parts = [...(result.quiz ? [result.quiz] : []), ...result.search];
  result.checked = parts.length;
  result.status = result.error || parts.some((p) => p.status !== 'pass') ? 'fail' : 'pass';
  result.assertion = result.error ? `Form check could not run: ${result.error}`
    : [result.quiz && `Quiz: ${result.quiz.detail}`, ...result.search.map((m) => `${m.module}: ${m.detail}`)].filter(Boolean).join(' | ') || 'No quiz or insurance search on this page';
  return result;
}
