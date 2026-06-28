const assert = require('node:assert/strict');
const fs = require('node:fs');

function decodeEntities(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function setupBrowserStub(hash) {
  global.window = {
    location: { hash: hash || '#/' },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
    },
    addEventListener: () => {},
    setTimeout,
    clearTimeout,
    matchMedia: () => ({ matches: false }),
    CSS: {
      escape: (value) => String(value),
    },
  };
  global.document = {
    readyState: 'loading',
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => {
      let text = '';
      return {
        set innerHTML(value) {
          text = decodeEntities(value).replace(/<[^>]*>/g, '');
        },
        get innerHTML() {
          return text;
        },
        get textContent() {
          return text;
        },
        set textContent(value) {
          text = String(value == null ? '' : value);
        },
      };
    },
    body: {
      appendChild: () => {},
      classList: { add: () => {} },
    },
    documentElement: {
      style: { setProperty: () => {} },
    },
  };
}

function loadSidebarForTest(hash) {
  setupBrowserStub(hash);
  delete require.cache[require.resolve('../app/dpr-sidebar.js')];
  return require('../app/dpr-sidebar.js');
}

function cssRule(css, selector) {
  const marker = selector + ' {';
  const index = css.indexOf(marker);
  assert.notEqual(index, -1, selector + ' CSS rule should exist');
  const start = css.indexOf('{', index);
  const end = css.indexOf('}', start);
  assert.ok(start >= 0 && end > start, selector + ' CSS rule should be complete');
  return css.slice(start + 1, end);
}

const sampleSidebar = `
* <a class="dpr-sidebar-root-link" href="#/">首页</a>
* <a class="dpr-sidebar-root-link" href="#/tutorial/README">使用教程</a>

* Conference Papers
  * NEURIPS 2024 <!--dpr-conference:neurips-2024-->
    * rl <!--dpr-conference-topic:neurips-2024:query-rl-->
      * <a class="dpr-sidebar-item-link dpr-sidebar-item-structured" href="#/conference/neurips-2024/paper-c" data-sidebar-item="{&quot;title&quot;:&quot;Paper C&quot;,&quot;score&quot;:&quot;9.0&quot;,&quot;tags&quot;:[{&quot;kind&quot;:&quot;query&quot;,&quot;label&quot;:&quot;rl&quot;}]}">Fallback C</a>
  * ICLR 2025 <!--dpr-conference:iclr-2025-->
    * symbolic <!--dpr-conference-topic:iclr-2025:query-symbolic-->
      * <a class="dpr-sidebar-item-link dpr-sidebar-item-structured" href="#/conference/iclr-2025/paper-e" data-sidebar-item="{&quot;title&quot;:&quot;Paper E&quot;,&quot;score&quot;:&quot;8.0&quot;,&quot;tags&quot;:[{&quot;kind&quot;:&quot;query&quot;,&quot;label&quot;:&quot;symbolic&quot;}]}">Fallback E</a>

* Daily Papers
  * 2026-06-24 <!--dpr-date:20260624-->
    * 精读区
      * <a class="dpr-sidebar-item-link dpr-sidebar-item-structured" href="#/202606/24/paper-a" data-sidebar-item="{&quot;title&quot;:&quot;Paper A&quot;,&quot;score&quot;:&quot;10.0&quot;,&quot;evidence&quot;:&quot;中文解释 A&quot;,&quot;tags&quot;:[{&quot;kind&quot;:&quot;query&quot;,&quot;label&quot;:&quot;rl&quot;}]}">Fallback A</a>
    * 速读区
      * <a class="dpr-sidebar-item-link dpr-sidebar-item-structured" href="#/202606/24/paper-b" data-sidebar-item="{&quot;title&quot;:&quot;Paper B&quot;,&quot;score&quot;:&quot;8.0&quot;}">Fallback B</a>
  * 2026-06-23 <!--dpr-date:20260623-->
    * 精读区
      * <a class="dpr-sidebar-item-link dpr-sidebar-item-structured" href="#/202606/23/paper-d" data-sidebar-item="{&quot;title&quot;:&quot;Paper D&quot;,&quot;score&quot;:&quot;9.0&quot;,&quot;tags&quot;:[{&quot;kind&quot;:&quot;query&quot;,&quot;label&quot;:&quot;rl&quot;}]}">Fallback D</a>
`;

const unorderedSidebar = `
* <a class="dpr-sidebar-root-link" href="#/">首页</a>

* Conference Papers
  * NEURIPS 2024 <!--dpr-conference:neurips-2024-->
    * rl
      * <a class="dpr-sidebar-item-link" href="#/conference/neurips-2024/conf-old" data-sidebar-item="{&quot;title&quot;:&quot;Conf Old&quot;,&quot;published&quot;:&quot;2024-04-01&quot;}">Conf Old</a>
      * <a class="dpr-sidebar-item-link" href="#/conference/neurips-2024/conf-new" data-sidebar-item="{&quot;title&quot;:&quot;Conf New&quot;,&quot;published&quot;:&quot;2024-09-01&quot;}">Conf New</a>
  * ICLR 2025 <!--dpr-conference:iclr-2025-->
    * rl
      * <a class="dpr-sidebar-item-link" href="#/conference/iclr-2025/conf-2025" data-sidebar-item="{&quot;title&quot;:&quot;Conf 2025&quot;}">Conf 2025</a>

* Daily Papers
  * 2026-06-23 <!--dpr-date:20260623-->
    * 精读区
      * <a class="dpr-sidebar-item-link" href="#/202606/23/old" data-sidebar-item="{&quot;title&quot;:&quot;Old Daily&quot;,&quot;published&quot;:&quot;2026-06-23T02:00:00Z&quot;}">Old Daily</a>
  * 2026-06-25 <!--dpr-date:20260625-->
    * 精读区
      * <a class="dpr-sidebar-item-link" href="#/202606/25/new" data-sidebar-item="{&quot;title&quot;:&quot;New Daily&quot;,&quot;published&quot;:&quot;2026-06-25T02:00:00Z&quot;}">New Daily</a>
`;

function testSidebarNavigationContract() {
  const sidebar = loadSidebarForTest('#/202606/24/paper-b?from=test');
  const tools = sidebar.__test;
  assert.ok(tools, 'dpr-sidebar.js should export test helpers');
  assert.equal(typeof tools.parseSidebar, 'function');

  const model = tools.parseSidebar(sampleSidebar);
  assert.deepEqual(tools.collectPaperHrefsFromModel(model), [
    '#/202606/24/paper-a',
    '#/202606/24/paper-b',
    '#/202606/23/paper-d',
    '#/conference/iclr-2025/paper-e',
    '#/conference/neurips-2024/paper-c',
  ]);
  assert.deepEqual(tools.collectReportHrefsFromModel(model), [
    '#/202606/24/README',
    '#/202606/23/README',
  ]);
  assert.equal(
    tools.findCurrentPaperHrefFromModel(model, '#/202606/24/paper-b?from=test'),
    '#/202606/24/paper-b',
  );
  assert.equal(
    tools.findCurrentReportHrefFromModel(model, '#/202606/24/README'),
    '#/202606/24/README',
  );
}

function testAxisViewsForDailyAndConference() {
  const sidebar = loadSidebarForTest('#/202606/24/paper-a');
  const tools = sidebar.__test;
  const model = tools.parseSidebar(sampleSidebar);
  assert.equal(typeof tools.buildDailyDateView, 'function');
  assert.equal(typeof tools.buildDailyTagView, 'function');
  assert.equal(typeof tools.buildConferenceConfView, 'function');
  assert.equal(typeof tools.buildConferenceTagView, 'function');

  const dateView = tools.buildDailyDateView(model, '20260623');
  assert.deepEqual(dateView.tabs.map((tab) => tab.label), ['2026-06-24', '2026-06-23']);
  assert.equal(dateView.activeKey, '20260623');
  assert.deepEqual(dateView.groups.map((group) => group.label), ['2026-06-23']);
  assert.deepEqual(dateView.groups[0].papers.map((paper) => paper.title), ['Paper D']);

  const dailyTagView = tools.buildDailyTagView(model, 'rl');
  assert.deepEqual(dailyTagView.tabs.map((tab) => tab.label), ['rl', '未标注']);
  assert.equal(dailyTagView.activeKey, 'rl');
  assert.deepEqual(dailyTagView.groups.map((group) => group.label), ['2026-06-24', '2026-06-23']);
  assert.deepEqual(dailyTagView.groups.map((group) => group.papers.map((paper) => paper.title)), [
    ['Paper A'],
    ['Paper D'],
  ]);

  const confView = tools.buildConferenceConfView(model, 'iclr-2025');
  assert.deepEqual(confView.tabs.map((tab) => tab.label), ['ICLR 2025', 'NEURIPS 2024']);
  assert.equal(confView.activeKey, 'iclr-2025');
  assert.deepEqual(confView.groups.map((group) => group.label), ['symbolic']);
  assert.deepEqual(confView.groups[0].papers.map((paper) => paper.title), ['Paper E']);

  const confTagView = tools.buildConferenceTagView(model, 'rl');
  assert.deepEqual(confTagView.tabs.map((tab) => tab.label), ['symbolic', 'rl']);
  assert.equal(confTagView.activeKey, 'rl');
  assert.deepEqual(confTagView.groups.map((group) => group.label), ['NEURIPS 2024 / rl']);
  assert.deepEqual(confTagView.groups[0].papers.map((paper) => paper.title), ['Paper C']);
}

function testAxisTabsRenderUnreadCounts() {
  const sidebar = loadSidebarForTest('#/202606/24/paper-a');
  const tools = sidebar.__test;
  const model = tools.parseSidebar(sampleSidebar);

  const html = tools.renderBodyHtml(model, {
    expandedGroups: { conference: true, daily: true },
    conferenceViewMode: 'conf',
    dailyViewMode: 'date',
    activeConference: 'neurips-2024',
    activeDailyDate: '20260624',
    readMap: {
      '202606/24/paper-a': 'read',
      'conference/neurips-2024/paper-c': 'good',
    },
  });

  assert.ok(html.includes('data-axis-key="20260624"'));
  assert.ok(html.includes('data-axis-key="20260624" data-unread="1"'));
  assert.ok(!html.includes('dpr-sidebar-axis-tab-dot'));
  assert.ok(html.includes('<span class="dpr-sidebar-axis-tab-unread">1</span>/<span class="dpr-sidebar-axis-tab-total">2</span>'));
  assert.ok(html.includes('data-axis-key="neurips-2024"'));
  assert.ok(html.includes('data-axis-key="neurips-2024" data-unread="0"'));
  assert.ok(html.includes('<span class="dpr-sidebar-axis-tab-unread">0</span>/<span class="dpr-sidebar-axis-tab-total">1</span>'));
  assert.ok(html.includes('data-axis-section-toggle="daily:date:20260624" aria-expanded="true" data-unread="1"'));
  assert.ok(!html.includes('dpr-sidebar-axis-section-dot'));

  assert.equal(typeof tools.buildAxisViewForMode, 'function');
  const updatedDateView = tools.buildAxisViewForMode(model, 'daily', 'date', {
    dailyViewMode: 'date',
    activeDailyDate: '20260624',
  }, {
    '202606/24/paper-a': 'read',
    '202606/24/paper-b': 'blue',
  });
  const updatedDateTab = updatedDateView.tabs.find((tab) => tab.key === '20260624');
  assert.equal(updatedDateTab.unreadCount, 0);
  assert.equal(updatedDateView.groups[0].unreadCount, 0);

  const updatedConferenceView = tools.buildAxisViewForMode(model, 'conference', 'conf', {
    conferenceViewMode: 'conf',
    activeConference: 'neurips-2024',
  }, {
    'conference/neurips-2024/paper-c': 'good',
  });
  const updatedConferenceTab = updatedConferenceView.tabs.find((tab) => tab.key === 'neurips-2024');
  assert.equal(updatedConferenceTab.unreadCount, 0);
  assert.equal(updatedConferenceView.groups[0].unreadCount, 0);
}

function testPaperEvidenceAndActionButtonsRender() {
  const sidebar = loadSidebarForTest('#/202606/24/paper-a');
  const tools = sidebar.__test;
  const model = tools.parseSidebar(sampleSidebar);

  const html = tools.renderBodyHtml(model, {
    expandedGroups: { conference: true, daily: true },
    conferenceViewMode: 'conf',
    dailyViewMode: 'date',
    activeConference: 'neurips-2024',
    activeDailyDate: '20260624',
  });

  assert.ok(html.includes('中文解释 A'));
  assert.ok(html.includes('class="dpr-sidebar-paper-actions"'));
  assert.ok(!html.includes('dpr-sidebar-paper-unread-dot'));
  assert.ok(html.includes('data-paper-status="good"'));
  assert.ok(html.includes('data-paper-status="blue"'));
  assert.ok(html.includes('data-paper-status="orange"'));
  assert.ok(html.includes('data-paper-status="bad"'));
}

function testPaperMetaOrderKeepsEvidenceBetweenTitleAndStars() {
  const sidebar = loadSidebarForTest('#/202606/24/paper-a');
  const tools = sidebar.__test;
  const model = tools.parseSidebar(sampleSidebar);
  const html = tools.renderBodyHtml(model, {
    expandedGroups: { conference: true, daily: true },
    conferenceViewMode: 'conf',
    dailyViewMode: 'date',
    activeConference: 'neurips-2024',
    activeDailyDate: '20260624',
  });
  const titleIndex = html.indexOf('<span class="dpr-sidebar-paper-title">Paper A</span>');
  const evidenceIndex = html.indexOf('<div class="dpr-sidebar-paper-evidence">中文解释 A</div>');
  const starsIndex = html.indexOf('<span class="dpr-sidebar-paper-stars" data-score="10.0">★★★★★</span>');
  const tagsIndex = html.indexOf('<span class="dpr-sidebar-paper-tags">', starsIndex);

  assert.ok(titleIndex >= 0, 'title should render');
  assert.ok(evidenceIndex > titleIndex, 'Chinese evidence should render after title');
  assert.ok(starsIndex > evidenceIndex, 'stars should render after Chinese evidence');
  assert.ok(tagsIndex > starsIndex, 'tags should stay on the same metadata line after stars');
}

function testSidebarSortsByNewestTimeFirst() {
  const sidebar = loadSidebarForTest('#/202606/25/new');
  const tools = sidebar.__test;
  const model = tools.parseSidebar(unorderedSidebar);

  const dailyView = tools.buildDailyDateView(model, '');
  assert.deepEqual(dailyView.tabs.map((tab) => tab.key), ['20260625', '20260623']);

  const confView = tools.buildConferenceConfView(model, '');
  assert.deepEqual(confView.tabs.map((tab) => tab.key), ['iclr-2025', 'neurips-2024']);

  const neuripsView = tools.buildConferenceConfView(model, 'neurips-2024');
  assert.deepEqual(neuripsView.groups[0].papers.map((paper) => paper.title), ['Conf New', 'Conf Old']);
}

function testSidebarUtilityHelpers() {
  const sidebar = loadSidebarForTest('#/202606/24/paper-a');
  const tools = sidebar.__test;

  assert.equal(typeof tools.statusForMarkIndex, 'function');
  assert.equal(tools.statusForMarkIndex('1'), 'good');
  assert.equal(tools.statusForMarkIndex('2'), 'blue');
  assert.equal(tools.statusForMarkIndex('3'), 'orange');
  assert.equal(tools.statusForMarkIndex('4'), 'bad');
  assert.equal(tools.statusForMarkIndex('5'), '');

  assert.equal(typeof tools.shouldAutoMarkRead, 'function');
  assert.equal(tools.shouldAutoMarkRead(''), true);
  assert.equal(tools.shouldAutoMarkRead(null), true);
  assert.equal(tools.shouldAutoMarkRead('read'), false);
  assert.equal(tools.shouldAutoMarkRead('good'), false);

  assert.equal(typeof tools.clampSidebarWidth, 'function');
  assert.equal(tools.clampSidebarWidth(180), 240);
  assert.equal(tools.clampSidebarWidth(360), 360);
  assert.equal(tools.clampSidebarWidth(720), 520);

  assert.equal(typeof tools.rerenderOptionsForReadStateEvent, 'function');
  assert.deepEqual(tools.rerenderOptionsForReadStateEvent(), {
    syncActive: true,
    centerActive: false,
    autoMark: false,
    preserveScroll: true,
  });
  assert.equal(typeof tools.rerenderOptionsForStatusClick, 'function');
  assert.deepEqual(tools.rerenderOptionsForStatusClick(), {
    syncActive: false,
    centerActive: false,
    autoMark: false,
    preserveScroll: true,
    dispatchUpdated: false,
  });
  assert.equal(typeof tools.syncActiveOptionsForInitialLoad, 'function');
  assert.deepEqual(tools.syncActiveOptionsForInitialLoad(), {
    center: true,
    autoMark: false,
  });
  assert.equal(typeof tools.rerenderOptionsForAxisInteraction, 'function');
  assert.deepEqual(tools.rerenderOptionsForAxisInteraction('daily'), {
    syncActive: false,
    scrollPanel: 'daily',
  });
}

function testEvidenceCssIsPersistent() {
  const css = fs.readFileSync('app/app.css', 'utf8');
  assert.ok(!/\\.dpr-sidebar-paper-evidence\\s*{[^}]*display:\\s*none/i.test(css));
  assert.ok(!/\.dpr-sidebar-paper:hover \.dpr-sidebar-paper-evidence\s*{[^}]*display:\s*none/i.test(css));
  assert.ok(/\.dpr-sidebar-paper-actions\s*{[^}]*opacity:\s*0/i.test(css));
  assert.ok(css.includes('.dpr-sidebar-paper:hover .dpr-sidebar-paper-actions'));
  assert.ok(/\.dpr-sidebar-paper-evidence\s*{[^}]*background:\s*transparent/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\.dpr-sidebar-paper-conference\s*{[^}]*border-left-color:\s*#93c5fd/i.test(css));
}

function testSidebarPaperVisualStateCssContract() {
  const css = fs.readFileSync('app/app.css', 'utf8');
  assert.ok(/\.dpr-sidebar-paper\s*{[^}]*background:\s*#ffffff/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\s*{[^}]*min-height:\s*68px/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\.is-active\s*{[^}]*background:\s*#e5e7eb/i.test(css));
  assert.ok(/body\.dpr-dark \.dpr-sidebar-paper\.is-active\s*{[^}]*background:\s*#334155/i.test(css));
  assert.ok(!css.includes('dpr-sidebar-unread-dot'));
  assert.ok(!css.includes('dpr-sidebar-axis-tab-dot'));
  assert.ok(!css.includes('dpr-sidebar-axis-section-dot'));
  assert.ok(/#dpr-sidebar-v2\s+\.dpr-sidebar-paper\s*{[^}]*position:\s*relative\s*!important/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\[data-read="0"\]::after\s*{[^}]*content:\s*""/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\[data-read="0"\]::after\s*{[^}]*background:\s*#ef4444/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\[data-read="0"\]::after\s*{[^}]*right:\s*6px/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\[data-read="0"\]::after\s*{[^}]*top:\s*7px/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\[data-read="0"\]::after\s*{[^}]*width:\s*8px/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\[data-read="0"\]::after\s*{[^}]*height:\s*8px/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\[data-read="0"\]::after\s*{[^}]*box-shadow:\s*0 0 0 2px #ffffff,\s*0 0 5px rgba\(239,\s*68,\s*68,\s*\.45\)/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\[data-read="0"\]::after\s*{[^}]*z-index:\s*6/i.test(css));

  const mainRule = cssRule(css, '.dpr-sidebar-paper-main');
  assert.ok(/display:\s*block/i.test(mainRule));
  assert.ok(/position:\s*relative/i.test(mainRule));
  assert.ok(/min-width:\s*0/i.test(mainRule));

  const linkRule = cssRule(css, '.dpr-sidebar-paper-link');
  assert.ok(/width:\s*100%/i.test(linkRule));
  assert.ok(/box-sizing:\s*border-box/i.test(linkRule));
  assert.ok(/padding:\s*7px 8px 7px 14px/i.test(linkRule));

  const titleRule = cssRule(css, '.dpr-sidebar-paper-title');
  assert.ok(/display:\s*block/i.test(titleRule));
  assert.ok(/white-space:\s*nowrap/i.test(titleRule));
  assert.ok(/overflow:\s*hidden/i.test(titleRule));
  assert.ok(/text-overflow:\s*ellipsis/i.test(titleRule));
  assert.ok(/padding-right:\s*20px/i.test(titleRule));
  assert.ok(/box-sizing:\s*border-box/i.test(titleRule));
  assert.ok(!/-webkit-line-clamp/i.test(titleRule));

  const actionsRule = cssRule(css, '.dpr-sidebar-paper-actions');
  assert.ok(/position:\s*absolute/i.test(actionsRule));
  assert.ok(/right:\s*6px/i.test(actionsRule));
  assert.ok(/top:\s*28px/i.test(actionsRule));
  assert.ok(/transform:\s*none/i.test(actionsRule));
  assert.ok(/width:\s*39px/i.test(actionsRule));

  assert.ok(/\.dpr-sidebar-paper:hover \.dpr-sidebar-paper-evidence,\s*\.dpr-sidebar-paper:focus-within \.dpr-sidebar-paper-evidence,\s*\.dpr-sidebar-paper:hover \.dpr-sidebar-paper-meta,\s*\.dpr-sidebar-paper:focus-within \.dpr-sidebar-paper-meta\s*{[^}]*padding-right:\s*52px/i.test(css));

  const readRowRule = /\.dpr-sidebar-paper\[data-read-status="read"\]\s*{[^}]*background:/i;
  assert.ok(!readRowRule.test(css), 'read should not paint the whole row');

  assert.ok(/\.dpr-sidebar-paper\[data-read-status="good"\]\s*{[^}]*background:\s*#f0fdf4/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\[data-read-status="bad"\]\s*{[^}]*background:\s*#fef2f2/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\[data-read-status="blue"\]\s*{[^}]*background:\s*#eff6ff/i.test(css));
  assert.ok(/\.dpr-sidebar-paper\[data-read-status="orange"\]\s*{[^}]*background:\s*#faf5ff/i.test(css));

  assert.ok(/\.dpr-sidebar-paper-status-good\.is-active\s*{[^}]*background:\s*#22c55e/i.test(css));
  assert.ok(/\.dpr-sidebar-paper-status-blue\.is-active\s*{[^}]*background:\s*#3b82f6/i.test(css));
  assert.ok(/\.dpr-sidebar-paper-status-orange\.is-active\s*{[^}]*background:\s*#8b5cf6/i.test(css));
  assert.ok(/\.dpr-sidebar-paper-status-bad\.is-active\s*{[^}]*background:\s*#ef4444/i.test(css));
}

function testSidebarStickyHierarchyCssContract() {
  const css = fs.readFileSync('app/app.css', 'utf8');
  const rootRule = cssRule(css, '#dpr-sidebar-v2');
  assert.ok(/--dpr-sidebar-sticky-panel-top:\s*0px/i.test(rootRule));
  assert.ok(/--dpr-sidebar-sticky-axis-top:\s*34px/i.test(rootRule));
  assert.ok(/--dpr-sidebar-sticky-section-top:\s*70px/i.test(rootRule));

  const panelHeaderRule = cssRule(css, '.dpr-sidebar-panel.is-expanded > .dpr-sidebar-panel-header');
  assert.ok(/position:\s*sticky/i.test(panelHeaderRule));
  assert.ok(/top:\s*var\(--dpr-sidebar-sticky-panel-top\)/i.test(panelHeaderRule));
  assert.ok(/z-index:\s*18/i.test(panelHeaderRule));
  assert.ok(/background:\s*#ffffff/i.test(panelHeaderRule));

  const axisRowRule = cssRule(css, '.dpr-sidebar-panel.is-expanded > .dpr-sidebar-panel-content > .dpr-sidebar-axis-row');
  assert.ok(/position:\s*sticky/i.test(axisRowRule));
  assert.ok(/top:\s*var\(--dpr-sidebar-sticky-axis-top\)/i.test(axisRowRule));
  assert.ok(/z-index:\s*17/i.test(axisRowRule));
  assert.ok(/background:\s*#ffffff/i.test(axisRowRule));

  const sectionHeaderRule = cssRule(css, '.dpr-sidebar-panel.is-expanded .dpr-sidebar-axis-section-header');
  assert.ok(/position:\s*sticky/i.test(sectionHeaderRule));
  assert.ok(/top:\s*var\(--dpr-sidebar-sticky-section-top\)/i.test(sectionHeaderRule));
  assert.ok(/z-index:\s*16/i.test(sectionHeaderRule));
  assert.ok(/background:\s*#ffffff/i.test(sectionHeaderRule));
}

function testRenderBodyPutsConferenceAboveDaily() {
  const sidebar = loadSidebarForTest('#/conference/neurips-2024/paper-c');
  const tools = sidebar.__test;
  const model = tools.parseSidebar(sampleSidebar);
  assert.equal(typeof tools.renderBodyHtml, 'function');
  const html = tools.renderBodyHtml(model, {
    expandedGroups: { conference: true, daily: true },
    conferenceViewMode: 'conf',
    dailyViewMode: 'date',
    activeConference: 'neurips-2024',
    activeDailyDate: '20260624',
  });
  assert.ok(html.indexOf('dpr-sidebar-group-conference') < html.indexOf('dpr-sidebar-group-daily'));
  assert.ok(html.includes('data-axis-group="conference"'));
  assert.ok(html.includes('data-axis-group="daily"'));
  assert.ok(html.includes('data-axis-mode="conf"'));
  assert.ok(html.includes('data-axis-mode="date"'));
}

function testAxisSectionsAreExpandable() {
  const sidebar = loadSidebarForTest('#/conference/neurips-2024/paper-c');
  const tools = sidebar.__test;
  const model = tools.parseSidebar(sampleSidebar);
  assert.equal(typeof tools.axisSectionStateKey, 'function');

  const sectionKey = tools.axisSectionStateKey('conference', 'conf', 'neurips-2024:rl');
  const expandedHtml = tools.renderBodyHtml(model, {
    expandedGroups: { conference: true, daily: true },
    conferenceViewMode: 'conf',
    dailyViewMode: 'date',
    activeConference: 'neurips-2024',
    activeDailyDate: '20260624',
  });

  assert.ok(expandedHtml.includes('class="dpr-sidebar-axis-section dpr-sidebar-axis-section-conference is-expanded"'));
  assert.ok(expandedHtml.includes(`data-axis-section-toggle="${sectionKey}"`));
  assert.ok(expandedHtml.includes('aria-expanded="true"'));

  const collapsedHtml = tools.renderBodyHtml(model, {
    expandedGroups: { conference: true, daily: true },
    conferenceViewMode: 'conf',
    dailyViewMode: 'date',
    activeConference: 'neurips-2024',
    activeDailyDate: '20260624',
    collapsedAxisSections: new Set([sectionKey]),
  });

  assert.ok(collapsedHtml.includes('data-axis-section-toggle="' + sectionKey + '" aria-expanded="false"'));
  assert.ok(!collapsedHtml.includes('dpr-sidebar-axis-section-conference is-expanded" data-axis-section="neurips-2024:rl"'));
}

function testPanelCountsUseFullModel() {
  const sidebar = loadSidebarForTest('#/202606/24/paper-a');
  const tools = sidebar.__test;
  const model = tools.parseSidebar(sampleSidebar);
  assert.equal(typeof tools.computeModelReadSummary, 'function');

  const summary = tools.computeModelReadSummary(model, {
    '202606/24/paper-a': 'read',
    'conference/neurips-2024/paper-c': 'good',
  });

  assert.deepEqual(summary.total, { papers: 5, unread: 3 });
  assert.deepEqual(summary.daily, { papers: 3, unread: 2 });
  assert.deepEqual(summary.conference, { papers: 2, unread: 1 });

  const html = tools.renderBodyHtml(model, {
    expandedGroups: { conference: true, daily: true },
    conferenceViewMode: 'conf',
    dailyViewMode: 'date',
    activeConference: 'neurips-2024',
    activeDailyDate: '20260624',
    readMap: {
      '202606/24/paper-a': 'read',
      'conference/neurips-2024/paper-c': 'good',
    },
  });
  assert.ok(html.includes('<span class="dpr-sidebar-day-unread">1</span>/<span class="dpr-sidebar-day-total">2</span>'));
  assert.ok(html.includes('<span class="dpr-sidebar-day-unread">2</span>/<span class="dpr-sidebar-day-total">3</span>'));
}

function testSearchResultsComeFromFullModel() {
  const sidebar = loadSidebarForTest('#/202606/24/paper-a');
  const tools = sidebar.__test;
  const model = tools.parseSidebar(sampleSidebar);
  assert.equal(typeof tools.buildDailyResultView, 'function');

  const view = tools.buildDailyResultView(model, {
    keyword: 'paper d',
    readMap: {},
    unreadOnly: false,
  });

  assert.equal(view.resultMode, true);
  assert.deepEqual(view.groups.map((group) => group.label), ['2026-06-23']);
  assert.deepEqual(view.groups[0].papers.map((paper) => paper.title), ['Paper D']);

  const html = tools.renderBodyHtml(model, {
    expandedGroups: { conference: true, daily: true },
    conferenceViewMode: 'conf',
    dailyViewMode: 'date',
    activeConference: 'neurips-2024',
    activeDailyDate: '20260624',
    search: 'paper d',
    filter: 'all',
    readMap: {},
  });
  assert.ok(html.includes('Paper D'));
  assert.ok(!html.includes('Paper A'));
  assert.ok(!html.includes('dpr-sidebar-group-conference'));
  assert.ok(html.includes('dpr-sidebar-group-daily'));
}

function testSearchNoResultsShowsEmptyState() {
  const sidebar = loadSidebarForTest('#/202606/24/paper-a');
  const tools = sidebar.__test;
  const model = tools.parseSidebar(sampleSidebar);

  const html = tools.renderBodyHtml(model, {
    expandedGroups: { conference: true, daily: true },
    conferenceViewMode: 'conf',
    dailyViewMode: 'date',
    activeConference: 'neurips-2024',
    activeDailyDate: '20260624',
    search: 'not in sidebar',
    filter: 'all',
    readMap: {},
  });

  assert.ok(!html.includes('dpr-sidebar-group-conference'));
  assert.ok(!html.includes('dpr-sidebar-group-daily'));
  assert.ok(html.includes('dpr-sidebar-empty'));
}

function testUnreadResultsComeFromFullModel() {
  const sidebar = loadSidebarForTest('#/202606/24/paper-a');
  const tools = sidebar.__test;
  const model = tools.parseSidebar(sampleSidebar);
  assert.equal(typeof tools.buildDailyResultView, 'function');

  const view = tools.buildDailyResultView(model, {
    keyword: '',
    readMap: {
      '202606/24/paper-a': 'read',
      '202606/24/paper-b': 'read',
    },
    unreadOnly: true,
  });

  assert.deepEqual(view.groups.map((group) => group.label), ['2026-06-23']);
  assert.deepEqual(view.groups[0].papers.map((paper) => paper.title), ['Paper D']);
}

function testReadStatusNormalization() {
  const sidebar = loadSidebarForTest('#/202606/24/paper-a');
  const tools = sidebar.__test;
  assert.ok(tools, 'dpr-sidebar.js should export test helpers');
  assert.equal(tools.normalizeReadStatus('good'), 'good');
  assert.equal(tools.normalizeReadStatus('bad'), 'bad');
  assert.equal(tools.normalizeReadStatus('blue'), 'blue');
  assert.equal(tools.normalizeReadStatus('orange'), 'orange');
  assert.equal(tools.normalizeReadStatus('read'), 'read');
  assert.equal(tools.normalizeReadStatus(true), 'read');
  assert.equal(tools.normalizeReadStatus(false), '');
  assert.equal(tools.normalizeReadStatus(null), '');
}

testSidebarNavigationContract();
testAxisViewsForDailyAndConference();
testAxisTabsRenderUnreadCounts();
testPaperEvidenceAndActionButtonsRender();
testPaperMetaOrderKeepsEvidenceBetweenTitleAndStars();
testSidebarSortsByNewestTimeFirst();
testSidebarUtilityHelpers();
testEvidenceCssIsPersistent();
testSidebarPaperVisualStateCssContract();
testSidebarStickyHierarchyCssContract();
testRenderBodyPutsConferenceAboveDaily();
testAxisSectionsAreExpandable();
testPanelCountsUseFullModel();
testSearchResultsComeFromFullModel();
testSearchNoResultsShowsEmptyState();
testUnreadResultsComeFromFullModel();
testReadStatusNormalization();

console.log('dpr sidebar v2 tests passed');
