const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../condition-lp-split.js'), 'utf8');
// Independent copy of the request sheet's lists; the script must agree with it.
const KEYWORDS = require('./fixtures/condition-lp-keywords.json');
const FAMILIES = {
  'heart-health': { control: '/landing-page/online-heart-health-nutritionist', experiment: 'lp-heart-health-utm-v1', bucket: 'lp_heart_health_utm_v1' },
  diabetes: { control: '/landing-page/diabetes', experiment: 'lp-diabetes-utm-v1', bucket: 'lp_diabetes_utm_v1' },
  pcos: { control: '/landing-page/pcos', experiment: 'lp-pcos-utm-v1', bucket: 'lp_pcos_utm_v1' },
};
const variantPath = (family, group) => `/landing-pages/${family}/${group}`;
const q = term => '?utm_term=' + encodeURIComponent(term).replace(/%20/g, '+');

// No browser, network, RudderStack SDK, or production events are used here.
function visit({ pathname, search = '', hash = '', local = {}, cookie = {},
  random = 0.25, localBlocked = false, allStorageBlocked = false,
  readyState = 'complete', analyticsReady = true } = {}) {
  const state = {
    local: { ...local }, cookie: { ...cookie }, writes: [],
    redirects: [], events: [], timers: [], listeners: {}, randomCalls: 0, logs: [],
  };
  const storage = {
    getItem(key) {
      if (localBlocked || allStorageBlocked) throw new Error('storage blocked');
      return state.local[key] ?? null;
    },
    setItem(key, value) {
      if (localBlocked || allStorageBlocked) throw new Error('storage blocked');
      state.writes.push(['local', key, value]);
      state.local[key] = value;
    },
    removeItem(key) {
      if (localBlocked || allStorageBlocked) throw new Error('storage blocked');
      state.writes.push(['local', key, null]);
      delete state.local[key];
    },
  };
  const document = {
    readyState,
    addEventListener(name, callback) { state.listeners[name] = callback; },
    get cookie() {
      if (allStorageBlocked) throw new Error('cookies blocked');
      return Object.entries(state.cookie).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('; ');
    },
    set cookie(value) {
      if (allStorageBlocked) throw new Error('cookies blocked');
      state.writes.push(['cookie', value]);
      const [pair, ...attributes] = value.split(';');
      const [key, encoded] = pair.split('=');
      const expires = attributes.find(part => part.toLowerCase().startsWith('expires='));
      if (expires && new Date(expires.slice(8)) < new Date()) delete state.cookie[key];
      else state.cookie[key] = decodeURIComponent(encoded);
    },
  };
  const analytics = { track(name, props) { state.events.push([name, JSON.parse(JSON.stringify(props))]); } };
  const window = {
    location: { pathname, search, hash, replace(url) { state.redirects.push(url); } },
    localStorage: storage,
    console: { log(...args) { state.logs.push(args); } },
    ...(analyticsReady ? { rudderanalytics: analytics } : {}),
  };
  const math = Object.create(Math);
  math.random = () => { state.randomCalls++; return random; };
  const context = vm.createContext({ window, document, console: window.console, URLSearchParams,
    Math: math, setTimeout(callback) { state.timers.push(callback); } });
  state.runAgain = () => vm.runInContext(source, context);
  state.domReady = () => state.listeners.DOMContentLoaded?.();
  state.analyticsReady = () => { window.rudderanalytics = analytics; };
  state.flushTimer = () => state.timers.shift()?.();
  state.runAgain();
  return state;
}
const untouched = result => {
  assert.deepEqual(result.redirects, []);
  assert.deepEqual(result.events, []);
  assert.deepEqual(result.timers, []);
  assert.deepEqual(result.listeners, {});
  assert.deepEqual(result.writes, []);
  assert.equal(result.randomCalls, 0);
};

test('keyword lists match the sheet copy: 33 / 17 / 36 terms in ten groups', () => {
  const count = family => Object.values(KEYWORDS[family]).reduce((n, list) => n + list.length, 0);
  assert.deepEqual(Object.keys(KEYWORDS), Object.keys(FAMILIES));
  assert.deepEqual([count('heart-health'), count('diabetes'), count('pcos')], [33, 17, 36]);
  assert.equal(Object.values(KEYWORDS).reduce((n, groups) => n + Object.keys(groups).length, 0), 10);
});

for (const [family, groups] of Object.entries(KEYWORDS)) {
  const spec = FAMILIES[family];

  test(`${family}: every listed keyword routes the variant arm to its group page`, () => {
    for (const [group, terms] of Object.entries(groups)) {
      for (const term of terms) {
        const result = visit({ pathname: spec.control, search: q(term) + '&gclid=G1', random: 0.25 });
        assert.deepEqual(result.redirects,
          [`${variantPath(family, group)}${q(term)}&gclid=G1&lp_variant=${group}`], term);
        assert.deepEqual(result.events, [], term);
        assert.equal(result.local[spec.bucket], 'variant');
      }
    }
  });

  test(`${family}: every listed keyword keeps the control arm in place with one event`, () => {
    for (const [group, terms] of Object.entries(groups)) {
      for (const term of terms) {
        const result = visit({ pathname: spec.control, search: q(term), random: 0.75 });
        assert.deepEqual(result.redirects, [], term);
        assert.deepEqual(result.events, [['Experiment Viewed', {
          experiment_name: spec.experiment, variation: 'control',
          landing_page: spec.control, keyword_group: group, utm_term: term,
        }]], term);
        assert.equal(result.local[spec.bucket], 'control');
        assert.equal(result.cookie[spec.bucket], 'control');
      }
    }
  });

  for (const group of Object.keys(groups)) {
    const term = groups[group][0];
    const page = variantPath(family, group);

    test(`${page}: arrival with a variant bucket fires the variant event`, () => {
      const result = visit({ pathname: page + '/', search: q(term) + `&lp_variant=${group}`,
        local: { [spec.bucket]: 'variant' } });
      assert.deepEqual(result.redirects, []);
      assert.deepEqual(result.events, [['Experiment Viewed', {
        experiment_name: spec.experiment, variation: 'variant',
        landing_page: page, keyword_group: group, utm_term: term,
      }]]);
      assert.equal(result.randomCalls, 0);
    });

    for (const bucket of [undefined, 'control']) {
      test(`${page}: listed term but bucket=${bucket} is not counted or moved`, () => {
        const local = bucket ? { [spec.bucket]: bucket } : {};
        untouched(visit({ pathname: page, search: q(term), local, cookie: local }));
      });
    }

    for (const search of ['', '?utm_term=', '?utm_term=unlisted+search', '?gclid=G1']) {
      for (const bucket of [undefined, 'control', 'variant']) {
        test(`${page}: unlisted visit ${search || '(no query)'}, bucket=${bucket} returns to standard`, () => {
          const local = bucket ? { [spec.bucket]: bucket } : {};
          const result = visit({ pathname: page + '/', search, hash: '#next', local, cookie: local });
          assert.deepEqual(result.redirects, [spec.control + search + '#next']);
          assert.deepEqual(result.events, []);
          assert.deepEqual(result.writes, []);
          assert.equal(result.randomCalls, 0);
          // Arrival stays outside the experiment: no loop, no control exposure.
          untouched(visit({ pathname: spec.control, search, hash: '#next', local, cookie: local }));
        });
      }
    }
  }

  for (const search of ['', '?utm_term=', '?utm_term=+++', '?utm_term=%5B%22%5D', '?utm_term=unlisted+search', '?gclid=G1']) {
    for (const bucket of [undefined, 'control', 'variant']) {
      test(`${family}: unlisted control visit ${search || '(missing)'}, bucket=${bucket} stays outside`, () => {
        const local = bucket ? { [spec.bucket]: bucket } : {};
        const result = visit({ pathname: spec.control, search, local, cookie: local, analyticsReady: false });
        untouched(result);
        assert.deepEqual(result.local, local);
      });
    }
  }

  test(`${family}: another family's keyword is not eligible here`, () => {
    for (const [other, otherGroups] of Object.entries(KEYWORDS)) {
      if (other === family) continue;
      for (const terms of Object.values(otherGroups)) {
        for (const term of terms) untouched(visit({ pathname: spec.control, search: q(term) }));
      }
    }
  });
}

const HH = FAMILIES['heart-health'];
const TERM = 'how to lower cholesterol';

test('redirect keeps every inbound parameter and the hash, and replaces a stale lp_variant', () => {
  const search = '?utm_source=bing&utm_medium=cpc&utm_campaign=c%201&utm_term=how+to+lower+cholesterol'
    + '&msclkid=M1&fbclid=F1&wbraid=W1&gclid=A%2BB&lp_variant=old&x=1&x=2';
  const result = visit({ pathname: HH.control + '/', search, hash: '#faq' });
  assert.deepEqual(result.redirects, ['/landing-pages/heart-health/cholesterol'
    + '?utm_source=bing&utm_medium=cpc&utm_campaign=c%201&utm_term=how+to+lower+cholesterol'
    + '&msclkid=M1&fbclid=F1&wbraid=W1&gclid=A%2BB&x=1&x=2&lp_variant=cholesterol#faq']);
});

test('match-type characters, case, punctuation and smart quotes still match exactly', () => {
  for (const raw of ['[How to Lower Cholesterol]', '"how  to lower cholesterol"', '+how +to +lower +cholesterol', 'how to lower cholesterol?']) {
    const result = visit({ pathname: HH.control, search: '?utm_term=' + encodeURIComponent(raw) });
    assert.equal(result.redirects.length, 1, raw);
    assert.match(result.redirects[0], /^\/landing-pages\/heart-health\/cholesterol\?/, raw);
  }
});

test('dry debug does not bounce an unlisted variant visit', () => {
  untouched(visit({ pathname: '/landing-pages/heart-health/diet', search: '?lp_split_debug=dry' }));
});

test('near misses are not fuzzy-matched', () => {
  for (const raw of ['lower cholesterol', 'how to lower cholesterol fast', 'cholesterol', 'pcos diet', 'heart healthy']) {
    untouched(visit({ pathname: HH.control, search: q(raw) }));
  }
});

test('assignment is 50/50 at the 0.5 boundary and sticky afterwards', () => {
  assert.equal(visit({ pathname: HH.control, search: q(TERM), random: 0.4999 }).local[HH.bucket], 'variant');
  assert.equal(visit({ pathname: HH.control, search: q(TERM), random: 0.5 }).local[HH.bucket], 'control');
  for (const bucket of ['control', 'variant']) {
    const result = visit({ pathname: HH.control, search: q(TERM), local: { [HH.bucket]: bucket }, random: bucket === 'control' ? 0.1 : 0.9 });
    assert.equal(result.randomCalls, 0);
    assert.equal(result.redirects.length, bucket === 'variant' ? 1 : 0);
    assert.equal(result.events.length, bucket === 'control' ? 1 : 0);
  }
});

test('buckets are separate per family and never touch the weight concerns bucket', () => {
  const local = { wc_b_variant: 'control', [FAMILIES.pcos.bucket]: 'control' };
  const result = visit({ pathname: HH.control, search: q(TERM), local, random: 0.25 });
  assert.equal(result.local[HH.bucket], 'variant');
  assert.equal(result.local.wc_b_variant, 'control');
  assert.equal(result.local[FAMILIES.pcos.bucket], 'control');
  assert.deepEqual(result.writes.filter(w => w[0] === 'local').map(w => w[1]), [HH.bucket]);
});

test('cookie fallback keeps the bucket when localStorage is blocked', () => {
  const first = visit({ pathname: HH.control, search: q(TERM), localBlocked: true, random: 0.25 });
  assert.equal(first.cookie[HH.bucket], 'variant');
  assert.equal(first.redirects.length, 1);
  const arrival = visit({ pathname: '/landing-pages/heart-health/cholesterol', search: q(TERM),
    localBlocked: true, cookie: first.cookie });
  assert.equal(arrival.events.length, 1);
  assert.equal(arrival.events[0][1].variation, 'variant');
});

test('with all storage blocked the page still works and nothing throws', () => {
  const variant = visit({ pathname: HH.control, search: q(TERM), allStorageBlocked: true, random: 0.25 });
  assert.equal(variant.redirects.length, 1);
  const control = visit({ pathname: HH.control, search: q(TERM), allStorageBlocked: true, random: 0.75 });
  assert.equal(control.events.length, 1);
  // Arrival cannot prove a variant bucket, so it is not counted.
  untouched(visit({ pathname: '/landing-pages/heart-health/cholesterol', search: q(TERM), allStorageBlocked: true }));
  const bounced = visit({ pathname: '/landing-pages/heart-health/cholesterol', allStorageBlocked: true });
  assert.deepEqual(bounced.redirects, [HH.control]);
});

test('QA: lp_split forces and stores a bucket for eligible terms only; reset clears it', () => {
  const forced = visit({ pathname: HH.control, search: q(TERM) + '&lp_split=control', local: { [HH.bucket]: 'variant' } });
  assert.equal(forced.local[HH.bucket], 'control');
  assert.equal(forced.events.length, 1);
  const variant = visit({ pathname: HH.control, search: q(TERM) + '&lp_split=variant', random: 0.9 });
  assert.equal(variant.redirects.length, 1);
  assert.match(variant.redirects[0], /lp_split=variant&lp_variant=cholesterol$/);
  const ineligible = visit({ pathname: HH.control, search: '?utm_term=unlisted&lp_split=variant' });
  untouched(ineligible);
  const reset = visit({ pathname: HH.control, search: '?lp_split=reset', local: { [HH.bucket]: 'variant' }, cookie: { [HH.bucket]: 'variant' } });
  assert.equal(reset.local[HH.bucket], undefined);
  assert.equal(reset.cookie[HH.bucket], undefined);
  assert.deepEqual(reset.redirects, []);
  assert.deepEqual(reset.events, []);
});

test('QA: dry debug stores the bucket and logs but does not redirect or track', () => {
  const result = visit({ pathname: HH.control, search: q(TERM) + '&lp_split_debug=dry', random: 0.25 });
  assert.equal(result.local[HH.bucket], 'variant');
  assert.deepEqual(result.redirects, []);
  assert.deepEqual(result.events, []);
  assert.ok(result.logs.some(args => args[0] === '[lp-split] dry run, not redirecting'));
  assert.deepEqual(visit({ pathname: HH.control, search: q(TERM) }).logs, []);
});

test('the event waits for DOM ready and for RudderStack, then fires once', () => {
  const loading = visit({ pathname: HH.control, search: q(TERM), random: 0.75, readyState: 'loading', analyticsReady: false });
  assert.deepEqual(loading.events, []);
  loading.domReady();
  assert.equal(loading.timers.length, 1);
  loading.flushTimer();
  assert.equal(loading.timers.length, 1);
  loading.analyticsReady();
  loading.flushTimer();
  assert.equal(loading.events.length, 1);
  assert.equal(loading.timers.length, 0);
});

test('it gives up quietly if RudderStack never appears', () => {
  const result = visit({ pathname: HH.control, search: q(TERM), random: 0.75, analyticsReady: false });
  for (let i = 0; i < 60; i++) result.flushTimer();
  assert.deepEqual(result.events, []);
  assert.equal(result.timers.length, 0);
});

test('a second include on the same page does nothing', () => {
  const result = visit({ pathname: HH.control, search: q(TERM), random: 0.75 });
  result.runAgain();
  assert.equal(result.events.length, 1);
});

test('inert everywhere else, including weight concerns and unknown group pages', () => {
  for (const pathname of ['/', '/paid', '/landing-page/weight-concerns', '/landing-page/dietitian-b',
    '/landing-pages/weight-concerns/glp1', '/landing-pages/heart-health', '/landing-pages/heart-health/unknown',
    '/landing-pages/pcos/diet/extra', '/landing-page/diabetes-v2', '/landing-pages/diabetes/constructor']) {
    untouched(visit({ pathname, search: q(TERM) + '&lp_split=variant' }));
    untouched(visit({ pathname, search: q('diabetic diet') + '&lp_split=reset', local: { lp_diabetes_utm_v1: 'variant' } }));
  }
});

test('loader stubs pin the same version of the script', () => {
  const pin = /webflow@(v[\d.]+)\/condition-lp-split\.js/;
  const head = fs.readFileSync(path.join(__dirname, '../landing-page-head.html'), 'utf8');
  const footer = fs.readFileSync(path.join(__dirname, '../condition-lp-variant-footer.html'), 'utf8');
  assert.match(head, pin);
  assert.equal(head.match(pin)[1], footer.match(pin)[1]);
  assert.match(head, /<script src="[^"]+condition-lp-split\.js"><\/script>/);
  assert.match(footer, /<script defer src="[^"]+condition-lp-split\.js"><\/script>/);
  for (const [family, groups] of Object.entries(KEYWORDS)) {
    for (const group of Object.keys(groups)) assert.ok(footer.includes(variantPath(family, group)));
  }
});
