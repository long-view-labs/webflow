// Shared look for the report (index.html) and the detail pages (pages/<id>.html): a plain
// dashboard of tiles and bordered cards, from the Oct 30 2026 restyle package (styles.css,
// filter.js, STYLE_SPEC.md). System fonts, no external requests, no animation. Status labels stay
// as text in the .b badges; colour is never the only signal. Pure: strings in, HTML out.
export const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

export const STYLES = `:root{--bg:#fafafa;--card:#fff;--ink:#18181b;--muted:#71717a;--line:#e4e4e7;--soft:#f4f4f5;--link:#164e9b;
--good:#127a3d;--goodbg:#e3f5ea;--warn:#8a5a00;--warnbg:#fff3d6;--warndot:#d69e00;--bad:#b42318;--badbg:#fde7e5}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--link);text-decoration:none}
a:hover{text-decoration:underline}
:focus-visible{outline:2px solid var(--link);outline-offset:2px;border-radius:4px}
.num,td.n{font-variant-numeric:tabular-nums}
.muted{color:var(--muted)}
p{margin:0 0 8px}
.top{background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}
.top .in{max-width:1200px;margin:0 auto;padding:0 24px;height:52px;display:flex;align-items:center;gap:16px}
.top .brand{font-weight:600;color:var(--ink)}
.top .brand span{color:var(--muted);font-weight:400}
.top nav{display:flex;gap:4px;margin-left:16px;overflow-x:auto}
.top nav a{color:var(--muted);padding:6px 10px;border-radius:6px;white-space:nowrap}
.top nav a:hover{background:var(--soft);color:var(--ink);text-decoration:none}
.top .right{margin-left:auto;white-space:nowrap}
main{max-width:1200px;margin:0 auto;padding:24px 24px 64px}
h1{font-size:20px;font-weight:600;margin:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.sub{color:var(--muted);font-size:13px;margin:4px 0 0}
.head{margin-bottom:20px}
.b{display:inline-block;font-size:12px;font-weight:500;line-height:18px;padding:0 8px;border-radius:999px;background:var(--soft);color:var(--muted);white-space:nowrap}
.b.ok{background:var(--goodbg);color:var(--good)}
.b.warn{background:var(--warnbg);color:var(--warn)}
.b.bad{background:var(--badbg);color:var(--bad)}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#a1a1aa;flex:none}
.dot.ok{background:var(--good)}.dot.warn{background:var(--warndot)}.dot.bad{background:var(--bad)}
.verdict{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 16px;margin-bottom:12px;font-weight:500}
.verdict .muted{font-weight:400;margin-left:auto;font-size:13px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px 16px;color:var(--ink)}
a.tile:hover{text-decoration:none;border-color:#d4d4d8}
.tile .l{color:var(--muted);font-size:13px;display:flex;align-items:center;gap:6px}
.tile .v{font-size:24px;font-weight:600;line-height:1.2;margin:6px 0 4px;font-variant-numeric:tabular-nums}
.tile .v small{font-size:13px;font-weight:400;color:var(--muted);margin-left:4px}
.tile .s{font-size:12px;color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;margin-bottom:16px;scroll-margin-top:68px}
.card>header{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.card>header h2{font-size:14px;font-weight:600;margin:0}
.card>header .r{margin-left:auto;color:var(--muted);font-size:13px}
.card .bd{padding:12px 16px}
.card .bd:empty{display:none}
.card>.tw{border:0;border-radius:0;margin:0}
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-weight:500;font-size:12px;color:var(--muted);padding:8px 16px;border-bottom:1px solid var(--line);background:#fcfcfc;white-space:nowrap}
td{padding:9px 16px;border-bottom:1px solid var(--line);vertical-align:top;overflow-wrap:break-word}
tr:last-child td{border-bottom:0}
.bd .tw{border:1px solid var(--line);border-radius:6px;margin:8px 0}
.stats{display:flex;flex-wrap:wrap;gap:4px 24px;margin:0}
.stats b{font-weight:600;font-variant-numeric:tabular-nums}
details.disc{border-top:1px solid var(--line)}
details.disc>summary{cursor:pointer;padding:10px 16px;color:var(--ink);list-style:none;display:flex;align-items:center;gap:8px}
details.disc>summary::-webkit-details-marker{display:none}
details.disc>summary::before{content:"";width:6px;height:6px;border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:rotate(-45deg);transition:transform .15s;flex:none;margin-right:2px}
details.disc[open]>summary::before{transform:rotate(45deg)}
details.disc>summary:hover{background:#fcfcfc}
.disc-body{padding:0 16px 12px 32px;color:var(--muted);font-size:13px}
.disc-body ul{margin:0;padding-left:16px}
.disc-body li{margin:4px 0}
.disc-body ul.issues{list-style:none;padding:0}
.disc-body ul.issues li strong{display:block;color:var(--ink);font-weight:500}
.disc-body ul.issues li span{display:block}
.empty{display:flex;align-items:center;gap:8px;color:var(--muted)}
.toolbar{display:flex;gap:12px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.toolbar input{font:inherit;padding:6px 10px;border:1px solid var(--line);border-radius:6px;min-width:240px;background:var(--card)}
.toolbar .muted{font-size:13px}
td.thumb{width:96px;padding-right:0}
td.thumb img,td.thumb .noimg{width:80px;height:50px;object-fit:cover;object-position:top;border:1px solid var(--line);border-radius:4px;display:block;background:var(--soft)}
td.thumb .noimg{display:grid;place-items:center;font-size:11px;color:var(--muted)}
.pname{font-weight:500;color:var(--ink)}
.purl{display:block;color:var(--muted);font-size:12px}
.badges{display:flex;flex-wrap:wrap;gap:4px}
td.links{white-space:nowrap;text-align:right}
td.links a+a{margin-left:12px}
.callout{display:flex;gap:10px;align-items:center;background:var(--card);border:1px solid var(--line);border-left:3px solid var(--bad);border-radius:8px;padding:10px 14px;margin-bottom:12px}
.shots{display:grid;gap:16px;padding:16px}
.shots.pair{grid-template-columns:minmax(0,3fr) minmax(0,1fr);align-items:start}
.shots:not(.pair){grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
.shot{margin:0}
.shot img{width:100%;height:auto;display:block;border:1px solid var(--line);border-radius:6px}
.shot figcaption{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;font-size:13px}
.shot figcaption .muted{width:100%;font-size:12px}
.rules{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.rules code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--soft);border-radius:4px;padding:2px 6px;color:var(--ink)}
.kv{display:grid;grid-template-columns:160px minmax(0,1fr);gap:8px 16px;margin:0}
.kv dt{color:var(--muted)}.kv dd{margin:0}
.gauges-wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;padding:16px}
.gvp{font-size:13px;color:var(--muted);margin-bottom:8px}
.gauges{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.gauge{margin:0;text-align:center}
.gauge svg{width:100%;max-width:56px;height:auto;display:block;margin:0 auto}
.gauge figcaption{font-size:11px;color:var(--muted);margin-top:4px}
.days td,.days th{text-align:center;padding:8px 6px}
.days th:first-child,.days td:first-child{text-align:left;padding-left:16px}
.foot{color:var(--muted);font-size:12px;margin-top:24px}
@media (max-width:720px){
 .top .in{padding:0 16px}
 .top nav{display:none}
 main{padding:16px 16px 48px}
 .verdict{flex-wrap:wrap}.verdict .muted{margin-left:0;width:100%}
 .tiles{grid-template-columns:repeat(2,minmax(0,1fr))}
 .shots.pair{grid-template-columns:minmax(0,1fr)}
 .shots.pair .shot:last-child img{max-width:260px}
 .toolbar input{min-width:0;width:100%}
 th,td{padding-left:12px;padding-right:12px}
 .tw table{min-width:600px}
 .tw table.days{min-width:520px}
 .kv{grid-template-columns:minmax(0,1fr)}.kv dd{margin-bottom:6px}
}
@media print{.top{position:static}.toolbar{display:none}details.disc>.disc-body{display:block}}`;

// The Pages table filter (index only): narrows #pagestable rows and updates #pagecount.
export const FILTER_JS = `(function(){
 var q=document.getElementById('pagefilter');if(!q)return;
 var rows=[].slice.call(document.querySelectorAll('#pagestable tbody tr'));var out=document.getElementById('pagecount');
 q.addEventListener('input',function(){var v=q.value.trim().toLowerCase();var n=0;
  rows.forEach(function(r){var hit=!v||r.textContent.toLowerCase().indexOf(v)>-1;r.hidden=!hit;if(hit)n++});
  out.textContent=n+' of '+rows.length+' pages';});
})();`;

export function doc({title, body, css = '', script = ''}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(title)}</title><style>${STYLES}${css}</style></head><body>${body}${script ? `<script>${script}</script>` : ''}</body></html>`;
}

// A card: header (title, optional badge, optional right-hand meta), then its parts as given.
// Text goes in bd(); a table goes in tw() directly in the card so it sits flush.
export const card = (id, title, parts, {badge = '', right = ''} = {}) =>
  `<section class="card" id="${id}"><header><h2>${title}</h2>${badge ? ' ' + badge : ''}${right ? `<span class="r">${right}</span>` : ''}</header>${parts}</section>`;
export const bd = (html) => (html ? `<div class="bd">${html}</div>` : '');
export const tw = (table) => (table ? `<div class="tw">${table}</div>` : '');
export const disc = (summary, body, {open = false} = {}) =>
  `<details class="disc"${open ? ' open' : ''}><summary>${summary}</summary><div class="disc-body">${body}</div></details>`;
export const dot = (state) => (state ? `<span class="dot ${state}"></span>` : '');
export function tile({label, value, unit = '', sub = '', state = null, href = null}) {
  const tag = href ? 'a' : 'div';
  return `<${tag} class="tile"${href ? ` href="${href}"` : ''}><div class="l">${dot(state)}${label}</div><div class="v">${value}${unit ? `<small>${unit}</small>` : ''}</div><div class="s">${sub}</div></${tag}>`;
}
// "3 new issues", "1 new issue": the counts the verdict and the tiles share.
export const count = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
