const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../weight-concerns-split.js'), 'utf8');
const CONTROL = '/landing-page/weight-concerns';
const ENTRY = '/landing-pages/weight-concerns-b';
const PREFIX = '/landing-pages/weight-concerns/';
const BUCKET = 'wc_b_variant';
const STASH = 'lp_wc_redirect';
const groups = {
  glp1: 'glp 1 covered by insurance',
  bariatric: 'bariatric dietitian near me',
  macros: 'best food tracking app',
  insurance: 'weight loss covered by insurance',
  dietitian: 'weight loss dietitian',
  diet: 'meal plan based on macros',
};

// No browser, network, RudderStack SDK, or production events are used here.
function visit({ pathname = CONTROL, search = '', hash = '', local = {}, cookie = {},
  random = 0.25, localBlocked = false, allStorageBlocked = false,
  readyState = 'complete', analyticsReady = true } = {}) {
  const state = {
    local: { ...local }, cookie: { ...cookie }, session: {}, writes: [],
    redirects: [], events: [], timers: [], listeners: {}, randomCalls: 0,
  };
  function storage(values, name) {
    return {
      getItem(key) {
        if (localBlocked || allStorageBlocked) throw new Error('storage blocked');
        return values[key] ?? null;
      },
      setItem(key, value) {
        if (localBlocked || allStorageBlocked) throw new Error('storage blocked');
        state.writes.push([name, key, value]);
        values[key] = value;
      },
      removeItem(key) {
        if (localBlocked || allStorageBlocked) throw new Error('storage blocked');
        state.writes.push([name, key, null]);
        delete values[key];
      },
    };
  }
  const document = {
    readyState,
    addEventListener(name, callback) { state.listeners[name] = callback; },
    get cookie() {
      if (allStorageBlocked) return '';
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
    localStorage: storage(state.local, 'local'),
    sessionStorage: storage(state.session, 'session'),
    console: { log() {} },
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

const ineligibleQueries = ['', '?utm_term=', '?utm_term=+++', '?utm_term=%5B%22%5D', '?utm_term=unmapped+search'];
for (const search of ineligibleQueries) {
  for (const bucket of [undefined, 'control', 'variant']) {
    test(`unmatched control stays outside experiment: ${search || '(missing)'}, bucket=${bucket}`, () => {
      const local = bucket ? { [BUCKET]: bucket } : {};
      const result = visit({ search, local, cookie: local, analyticsReady: false });
      assert.deepEqual(result.redirects, []);
      assert.deepEqual(result.events, []);
      assert.deepEqual(result.timers, []);
      assert.deepEqual(result.listeners, {});
      assert.deepEqual(result.writes, []);
      assert.deepEqual(result.local, local);
      assert.deepEqual(result.cookie, local);
      assert.equal(result.randomCalls, 0);
    });
  }
}

for (const pathname of [ENTRY, ...Object.keys(groups).map(group => PREFIX + group)]) {
  for (const bucket of [undefined, 'control', 'variant']) {
    test(`unmatched legacy page returns to standard: ${pathname}, bucket=${bucket}`, () => {
      const local = bucket ? { [BUCKET]: bucket } : {};
      const search = '?utm_term=unmapped%20search&utm_source=google&gclid=A%2BB&lp_variant=old&x=1&x=2';
      const result = visit({ pathname: pathname + '/', search, hash: '#next', local, cookie: local });
      assert.deepEqual(result.redirects, [CONTROL + search + '#next']);
      assert.deepEqual(result.events, []);
      assert.deepEqual(result.writes, []);
      assert.equal(result.randomCalls, 0);
      // Arrival remains outside the experiment; no redirect loop or control exposure.
      const arrival = visit({ search, hash: '#next', local: result.local, cookie: result.cookie });
      assert.deepEqual(arrival.redirects, []);
      assert.deepEqual(arrival.events, []);
      assert.equal(arrival.randomCalls, 0);
    });
  }
}

for (const [group, term] of Object.entries(groups)) {
  const search = '?utm_term=' + encodeURIComponent(term);
  test(`${group}: every old assignment rolls out without random allocation`, () => {
    for (const bucket of [undefined, 'control', 'variant', 'invalid']) {
      const result = visit({ search, random: 0.99, local: { [BUCKET]: bucket } });
      assert.equal(result.local[BUCKET], 'variant');
      assert.equal(result.cookie[BUCKET], 'variant');
      assert.equal(result.randomCalls, 0);
      assert.equal(result.redirects.length, 1);
      assert.deepEqual(result.events, []);
      result.runAgain();
      assert.equal(result.redirects.length, 1);
    }
  });
  test(`${group}: matched variant is one hop and only tracks on arrival`, () => {
    const result = visit({ search });
    assert.equal(result.local[BUCKET], 'variant');
    assert.equal(result.cookie[BUCKET], 'variant');
    assert.deepEqual(result.redirects, [PREFIX + group + search + '&lp_variant=' + group]);
    assert.deepEqual(result.events, []);
    assert.deepEqual(JSON.parse(result.session[STASH]), {
      event: 'lp_utm_redirect', lp_variant: group, lp_match_method: 'exact', lp_utm_term: term,
    });
    const arrival = visit({ pathname: PREFIX + group, search, local: result.local });
    assert.deepEqual(arrival.redirects, []);
    assert.deepEqual(arrival.events, [['Experiment Viewed', {
      experiment_name: 'lp-weight-concerns-b', variation: 'variant', landing_page: PREFIX + group,
      keyword_group: group, utm_term: term,
    }]]);
    arrival.runAgain();
    assert.equal(arrival.events.length, 1);
  });
}

for (const [term, group] of [
  ['wegovy nutrition guide', 'glp1'], ['gastric sleeve recovery', 'bariatric'],
  ['macro planner', 'macros'], ['copay information', 'insurance'],
  ['nutritionist consultation', 'dietitian'],
  ['meal prep support', 'diet'], ['wegovy bariatric insurance', 'glp1'],
  ['bariatric macro help', 'bariatric'], ['macro insurance support', 'macros'],
  ['insurance personal trainer', 'insurance'],
  ['nutritionist diet support', 'dietitian'],
]) {
  test(`fuzzy priority preserved: ${term} => ${group}`, () => {
    const result = visit({ search: '?utm_term=' + encodeURIComponent(term) });
    assert.ok(result.redirects[0].startsWith(PREFIX + group + '?'));
    assert.equal(JSON.parse(result.session[STASH]).lp_match_method, 'fuzzy');
  });
}

test('normalization and exact-match priority survive; raw query, duplicates, hash preserved', () => {
  const search = '?utm_source=Google&utm_term=%5B%22BARIATRIC+DIETITIAN+NEAR+ME%22%5D&gclid=A%2FB%2BC&x=1&x=2&lp_variant=old&lp_debug=1';
  const result = visit({ search, hash: '#book' });
  assert.deepEqual(result.redirects, [PREFIX + 'bariatric?utm_source=Google&utm_term=%5B%22BARIATRIC+DIETITIAN+NEAR+ME%22%5D&gclid=A%2FB%2BC&x=1&x=2&lp_variant=bariatric#book']);
  assert.equal(JSON.parse(result.session[STASH]).lp_utm_term, groups.bariatric);
  assert.equal(JSON.parse(result.session[STASH]).lp_match_method, 'exact');
});

test('rollout ignores randomness and upgrades stored control cookie', () => {
  for (const random of [0, 0.499999, 0.5, 0.999999]) {
    const result = visit({ search: '?utm_term=meal+plan', random, localBlocked: true, cookie: { [BUCKET]: 'control' } });
    assert.equal(result.cookie[BUCKET], 'variant');
    assert.equal(result.redirects.length, 1);
    assert.equal(result.randomCalls, 0);
  }
});

test('unmatched visit preserves assignment, later eligible visit upgrades it', () => {
  const first = visit({ local: { [BUCKET]: 'control' }, search: '?utm_term=unmapped' });
  assert.equal(first.local[BUCKET], 'control');
  const later = visit({ local: first.local, search: '?utm_term=meal+plan' });
  assert.equal(later.local[BUCKET], 'variant');
  assert.equal(later.redirects.length, 1);
  assert.equal(later.randomCalls, 0);
});

test('blocked storage does not crash eligible routing or admit unmatched visitors', () => {
  const eligible = visit({ allStorageBlocked: true, search: '?utm_term=meal+plan' });
  assert.equal(eligible.redirects[0], PREFIX + 'diet?utm_term=meal+plan&lp_variant=diet');
  const unmatched = visit({ allStorageBlocked: true, pathname: ENTRY });
  assert.deepEqual(unmatched.redirects, [CONTROL]);
  assert.deepEqual(unmatched.events, []);
  assert.equal(unmatched.randomCalls, 0);
});

test('direct eligible group visits without a variant bucket do not emit exposure', () => {
  for (const bucket of [undefined, 'control', 'invalid']) {
    const result = visit({ pathname: PREFIX + 'diet', search: '?utm_term=meal+plan', local: bucket ? { [BUCKET]: bucket } : {} });
    assert.deepEqual(result.events, []);
    assert.equal(result.randomCalls, 0);
  }
});

test('legacy -b never emits a generic exposure even with a matched term and variant bucket', () => {
  const result = visit({ pathname: ENTRY, search: '?utm_term=meal+plan', local: { [BUCKET]: 'variant' } });
  assert.deepEqual(result.events, []);
  assert.deepEqual(result.redirects, [PREFIX + 'diet?utm_term=meal+plan&lp_variant=diet']);
});

test('QA force cannot enroll unmatched terms or override eligible rollout', () => {
  for (const bucket of ['control', 'variant']) {
    const unmatched = visit({ search: '?utm_term=unmapped&wc_split=' + bucket });
    assert.deepEqual(unmatched.writes, []);
    assert.deepEqual(unmatched.events, []);
    assert.deepEqual(unmatched.redirects, []);
    const matched = visit({ search: '?utm_term=meal+plan&wc_split=' + bucket });
    assert.equal(matched.local[BUCKET], 'variant');
    assert.equal(matched.randomCalls, 0);
  }
});

test('QA reset clears old assignments without enrolling an unmatched visit', () => {
  const result = visit({ search: '?wc_split=reset', local: { [BUCKET]: 'variant' }, cookie: { [BUCKET]: 'variant' } });
  assert.equal(result.local[BUCKET], undefined);
  assert.equal(result.cookie[BUCKET], undefined);
  assert.equal(result.randomCalls, 0);
  assert.deepEqual(result.events, []);
});

test('dry-run suppresses both eligible and unmatched redirects', () => {
  const matched = visit({ search: '?utm_term=meal+plan&wc_debug=dry' });
  assert.equal(matched.local[BUCKET], 'variant');
  assert.deepEqual(matched.redirects, []);
  assert.deepEqual(matched.events, []);
  const unmatched = visit({ pathname: ENTRY, search: '?wc_debug=dry' });
  assert.deepEqual(unmatched.redirects, []);
  assert.deepEqual(unmatched.events, []);
  assert.deepEqual(unmatched.writes, []);
});

test('eligible exposure still waits for DOM and RudderStack; excluded traffic never schedules it', () => {
  const eligible = visit({ pathname: PREFIX + 'diet', search: '?utm_term=meal+plan', local: { [BUCKET]: 'variant' }, readyState: 'loading', analyticsReady: false });
  assert.deepEqual(eligible.events, []);
  assert.deepEqual(eligible.timers, []);
  eligible.domReady();
  assert.equal(eligible.timers.length, 1);
  eligible.analyticsReady();
  eligible.flushTimer();
  assert.equal(eligible.events.length, 1);
  const unmatched = visit({ search: '?utm_term=unmapped', readyState: 'loading', analyticsReady: false });
  unmatched.domReady();
  assert.deepEqual(unmatched.timers, []);
  assert.deepEqual(unmatched.events, []);
});

test('other landing pages stay inert', () => {
  for (const pathname of ['/landing-page/dietitian-b', '/landing-page/diabetes', '/paid', '/']) {
    const result = visit({ pathname, search: '?utm_term=meal+plan&wc_split=variant' });
    assert.deepEqual(result.events, []);
    assert.deepEqual(result.redirects, []);
    assert.deepEqual(result.writes, []);
    assert.equal(result.randomCalls, 0);
  }
});

for (const term of ['intermittent fasting meal plan', 'intermittent fasting', 'low fat diet', 'lose 10 pounds in a month', 'personal trainer covered by insurance', 'personal trainer and nutritionist', 'gym guidance', 'workout dietitian']) {
  for (const pathname of [CONTROL, ENTRY, PREFIX + 'diet', PREFIX + 'fitness']) {
    for (const bucket of [undefined, 'control', 'variant']) {
      test(`excluded rollout: ${term}, ${pathname}, ${bucket}`, () => {
        const search = '?utm_term=' + encodeURIComponent('["' + term.toUpperCase() + '"]') + '&wc_split=variant&gclid=a%2Bb&x=1&x=2';
        const result = visit({ pathname, search, hash: '#book', local: { [BUCKET]: bucket }, analyticsReady: false });
        assert.deepEqual(result.redirects, pathname === CONTROL ? [] : [CONTROL + search + '#book']);
        assert.deepEqual(result.events, []);
        assert.deepEqual(result.writes, []);
        assert.deepEqual(result.timers, []);
        assert.equal(result.randomCalls, 0);
      });
    }
  }
}
test('retired Fitness URL with another eligible keyword routes to correct variant', () => {
  const result = visit({ pathname: PREFIX + 'fitness', search: '?utm_term=meal+plan' });
  assert.deepEqual(result.redirects, [PREFIX + 'diet?utm_term=meal+plan&lp_variant=diet']);
  assert.deepEqual(result.events, []);
});
test('excluded exact keywords do not disable unrelated macros or diet traffic', () => {
  for (const [term, group] of [['free intermittent fasting app', 'macros'], ['low carb diet', 'diet'], ['nutritionist or dietitian for weight loss near me', 'dietitian']]) {
    const result = visit({ search: '?utm_term=' + encodeURIComponent(term) });
    assert.ok(result.redirects[0].startsWith(PREFIX + group + '?'));
  }
});
