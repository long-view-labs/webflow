// Navigation check per page and viewport. The page checker's own menu states are
// Unify-specific, so Nourish's nav is checked here in a separate protected page:
//   main    - desktop: the nav bar shows its links; mobile: the hamburger opens the drawer
//   burger  - partner template: links on desktop, hamburger opens them on mobile
//   minimal - paid/landing template: the nav bar renders with a visible link or button
// Nothing is submitted and no link is followed; only menu toggles are clicked.

// On top of the checker's protection (analytics hosts unresolvable, non-GET
// aborted, beacons dropped): never load the application page (it creates
// drafts under JS) and never reach RudderStack's dataplane proxy.
export function extraBlock(url) {
  let u;
  try { u = new URL(url); } catch { return true; }
  return u.pathname.startsWith('/dietitian-application') || /^dataplane-proxy\./.test(u.hostname) || /(^|\.)api2?\.amplitude\.com$/.test(u.hostname);
}

// On screen, not just rendered: the main nav's menu is an off-canvas drawer
// that sits beside the viewport until the hamburger slides it in.
const visibleLinks = (root) => root.evaluate((el) => [...el.querySelectorAll('a,button')].filter((e) => {
  const r = e.getBoundingClientRect(), s = getComputedStyle(e);
  return r.width > 0 && r.height > 0 && r.left < innerWidth && r.right > 0 && r.top < innerHeight && r.bottom > 0
    && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0;
}).length);

export async function checkNav(browser, {url, viewport, nav}, {protectPage}) {
  const context = await browser.newContext({serviceWorkers: 'block', viewport: {width: viewport.width, height: viewport.height}});
  const page = await context.newPage();
  const result = {status: 'fail', kind: nav?.kind ?? 'none', viewport: viewport.id};
  try {
    await protectPage(page);
    // Registered after protectPage, so it is matched first.
    await page.route('**/*', (route) => (extraBlock(route.request().url()) ? route.abort('blockedbyclient') : route.fallback()));
    await page.goto(url, {waitUntil: 'load', timeout: 30000});
    await page.waitForTimeout(1200);
    const bar = page.locator('.w-nav').first();
    if (!(await bar.isVisible())) throw new Error('Nav bar is not visible');
    if (result.kind === 'main') {
      const toggle = page.locator('.w-nav .toggle-menu-2').first();
      if (await toggle.isVisible()) {
        await toggle.click({timeout: 8000});
        await page.waitForTimeout(800);
        const links = await visibleLinks(page.locator('.w-nav-menu').first());
        if (links < 3) throw new Error(`Hamburger opened a menu with ${links} links (expected at least 3)`);
        result.assertion = `Hamburger opens the menu with ${links} links`;
      } else {
        const links = await visibleLinks(bar);
        if (links < 4) throw new Error(`Nav bar shows ${links} links/buttons (expected at least 4)`);
        result.assertion = `Nav bar shows ${links} links/buttons`;
      }
    } else if (result.kind === 'burger') {
      const button = page.locator('.w-nav-button').first();
      if (await button.isVisible()) {
        await button.click({timeout: 8000});
        await page.waitForTimeout(600);
      }
      const links = await visibleLinks(page.locator('.w-nav-menu').first());
      if (links < 1) throw new Error('Nav menu shows no links' + ((await button.isVisible()) ? ' after opening the hamburger' : ''));
      result.assertion = `Nav menu shows ${links} links`;
    } else {
      const links = await visibleLinks(bar);
      if (links < 1) throw new Error('Nav bar has no visible link or button');
      result.assertion = `Nav bar shows ${links} links/buttons`;
    }
    result.status = 'pass';
  } catch (e) {
    result.assertion = e.message.split('\n')[0];
  } finally {
    await context.close();
  }
  return result;
}
