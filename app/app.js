(function () {
  'use strict';

  var STORAGE_KEY = 'leonida-trophy-progress-v1';
  var DATA_URL = 'data/trophies.json';

  var state = {
    trophies: [],
    sources: [],
    earned: {},
    filter: 'all',
    query: '',
    hideSpoilers: false,
    earnedOnly: false,
    openId: null
  };

  var KIND_LABELS = {
    story: 'Story',
    activity: 'Activity',
    collectible: 'Collectible',
    crime: 'Crime',
    world: 'World',
    money: 'Money',
    hidden: 'Hidden',
    platinum: 'Platinum',
    completion: '100%'
  };

  var STAGES = [
    {
      num: 1,
      title: 'Play the story',
      blurb: 'Five chapters, about 60–80 hours. Story trophies pop as you go; free-roam opens after the credits.',
      items: [
        'Finish all five chapters and the final mission',
        'Take optional stranger missions as they appear',
        'Meditate at the first spot in Chapter 1 (missable!)',
        'Scan vehicles and study animals on the way'
      ]
    },
    {
      num: 2,
      title: 'The 100% checklist',
      blurb: 'About 100 hours after the credits. Open Progress, then Stats, then 100% Completion.',
      items: [
        'Work the checklist: story, exploration, discovery',
        '300 of 397 stunts, 70 of 80 challenges',
        '15 of 18 card sets, 200 of 277 vehicles',
        'All 5 bank vaults, all drone races, Bret’s quests'
      ]
    },
    {
      num: 3,
      title: 'Cleanup',
      blurb: 'About 10 hours. Whatever is left, then the platinum.',
      items: [
        'Finish 8 Strangers & Freaks strands',
        'Crime and world one-offs (tanks, planes, vaults)',
        'Money trophies: laundering, shops, garages',
        'Vice Got a Price! pops with the last trophy'
      ]
    }
  ];

  function $(id) { return document.getElementById(id); }

  function loadEarned() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveEarned() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.earned));
    } catch (e) { /* storage unavailable; progress just won't persist */ }
  }

  function earnedCount() {
    var n = 0;
    state.trophies.forEach(function (t) { if (state.earned[t.id]) n += 1; });
    return n;
  }

  function gradeLetter(grade) {
    return { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' }[grade] || '?';
  }

  function stageLabel(stage) {
    return { 1: 'Stage 1 · Story', 2: 'Stage 2 · 100% checklist', 3: 'Stage 3 · Cleanup' }[stage] || '';
  }

  function isSpoilerHidden(t) {
    return state.hideSpoilers && t.story && !state.earned[t.id];
  }

  function visibleTrophies() {
    var q = state.query.trim().toLowerCase();
    return state.trophies.filter(function (t) {
      if (state.earnedOnly && !state.earned[t.id]) return false;
      if (state.filter === 'missable' && !t.missable) return false;
      if (state.filter !== 'all' && state.filter !== 'missable' && t.kind !== state.filter) return false;
      if (q) {
        var hay = (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderProgress() {
    var total = state.trophies.length;
    var n = earnedCount();
    var pct = total ? Math.round((n / total) * 100) : 0;
    $('progressCount').textContent = n + ' / ' + total;
    $('progressPct').textContent = pct + '%';
    $('progressFill').style.width = pct + '%';
    var counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    var totals = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    state.trophies.forEach(function (t) {
      totals[t.grade] += 1;
      if (state.earned[t.id]) counts[t.grade] += 1;
    });
    $('gradeCounts').textContent =
      counts.platinum + '/' + totals.platinum + ' platinum · ' +
      counts.gold + '/' + totals.gold + ' gold · ' +
      counts.silver + '/' + totals.silver + ' silver · ' +
      counts.bronze + '/' + totals.bronze + ' bronze';
  }

  function renderRoadmap() {
    var wrap = $('stages');
    wrap.innerHTML = '';
    STAGES.forEach(function (s) {
      var n = state.trophies.filter(function (t) { return t.stage === s.num; }).length;
      var div = document.createElement('div');
      div.className = 'stage';
      var h = document.createElement('h3');
      var num = document.createElement('span');
      num.className = 'stage-num';
      num.textContent = s.num;
      h.appendChild(num);
      h.appendChild(document.createTextNode(s.title));
      div.appendChild(h);
      var p = document.createElement('p');
      p.textContent = s.blurb;
      div.appendChild(p);
      var c = document.createElement('p');
      c.className = 'stage-count';
      c.textContent = n + ' trophies';
      div.appendChild(c);
      var ul = document.createElement('ul');
      s.items.forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });
      div.appendChild(ul);
      wrap.appendChild(div);
    });

    var miss = state.trophies.filter(function (t) { return t.missable; });
    var call = $('missableCallout');
    call.innerHTML = '';
    var strong = document.createElement('strong');
    strong.textContent = 'One trophy can be missed: ';
    call.appendChild(strong);
    miss.forEach(function (t, i) {
      if (i) call.appendChild(document.createTextNode(', '));
      var b = document.createElement('b');
      b.textContent = t.name;
      call.appendChild(b);
    });
    call.appendChild(document.createTextNode(
      ' — meditate at the first spot in Chapter 1, on the balcony at home the morning after the Down to Earth mission. ' +
      'That spot is gone once the chapter ends. Everything else can be finished in free-roam after the credits.'
    ));
  }

  function renderSources() {
    var ul = $('sourceList');
    ul.innerHTML = '';
    state.sources.forEach(function (s) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = s.url;
      a.textContent = s.name;
      a.rel = 'noopener';
      li.appendChild(a);
      li.appendChild(document.createTextNode(' — trophy guide and roadmap, checked 19 November 2026.'));
      ul.appendChild(li);
    });
  }

  function trophyRow(t) {
    var li = document.createElement('li');
    li.className = 'trophy' + (state.earned[t.id] ? ' earned' : '');
    li.dataset.id = t.id;

    var head = document.createElement('div');
    head.className = 'trophy-head';

    var check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'trophy-check';
    check.checked = !!state.earned[t.id];
    check.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
    check.addEventListener('click', function (ev) {
      ev.stopPropagation();
      state.earned[t.id] = check.checked ? true : undefined;
      if (!check.checked) delete state.earned[t.id];
      saveEarned();
      renderProgress();
      li.classList.toggle('earned', check.checked);
      renderListMeta();
      if (state.hideSpoilers && t.story) renderList();
    });
    head.appendChild(check);

    var badge = document.createElement('span');
    badge.className = 'grade-badge grade-' + t.grade;
    badge.textContent = gradeLetter(t.grade);
    badge.title = t.grade;
    head.appendChild(badge);

    var main = document.createElement('div');
    main.className = 'trophy-main';

    var name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = isSpoilerHidden(t) ? 'Hidden story trophy' : t.name;
    main.appendChild(name);

    var desc = document.createElement('div');
    desc.className = 'trophy-desc';
    desc.textContent = isSpoilerHidden(t)
      ? 'Earn this trophy to reveal its name and description.'
      : t.description;
    main.appendChild(desc);

    var tags = document.createElement('div');
    tags.className = 'trophy-tags';
    var kindTag = document.createElement('span');
    kindTag.className = 'tag';
    kindTag.textContent = KIND_LABELS[t.kind] || t.kind;
    tags.appendChild(kindTag);
    if (t.missable) {
      var m = document.createElement('span');
      m.className = 'tag missable';
      m.textContent = 'Missable';
      tags.appendChild(m);
    }
    if (!t.confirmed) {
      var u = document.createElement('span');
      u.className = 'tag unconfirmed';
      u.textContent = 'Unconfirmed steps';
      tags.appendChild(u);
    }
    if (state.earned[t.id]) {
      var e = document.createElement('span');
      e.className = 'tag earned-tag';
      e.textContent = 'Earned';
      tags.appendChild(e);
    }
    main.appendChild(tags);
    head.appendChild(main);
    li.appendChild(head);

    head.addEventListener('click', function (ev) {
      if (ev.target === check) return;
      state.openId = state.openId === t.id ? null : t.id;
      renderList();
      if (state.openId === t.id) {
        var open = document.querySelector('.trophy[data-id="' + t.id + '"] .trophy-detail');
        if (open) open.scrollIntoView({ block: 'nearest' });
      }
    });

    if (state.openId === t.id) {
      var detail = document.createElement('div');
      detail.className = 'trophy-detail';

      var h = document.createElement('h4');
      h.textContent = 'How to unlock it';
      detail.appendChild(h);

      var guide = document.createElement('p');
      guide.textContent = t.guide;
      detail.appendChild(guide);

      if (!t.confirmed) {
        var note = document.createElement('p');
        note.className = 'unconfirmed-note';
        note.textContent = 'Not yet confirmed: no guide site has verified the exact steps for this trophy as of 19 November 2026. The guide above is the best available lead, not a proven method.';
        detail.appendChild(note);
      }

      var src = document.createElement('p');
      src.className = 'source';
      src.appendChild(document.createTextNode('Source: '));
      var a = document.createElement('a');
      a.href = t.source.url;
      a.textContent = t.source.name;
      a.rel = 'noopener';
      src.appendChild(a);
      detail.appendChild(src);

      var dl = document.createElement('dl');
      var rows = [
        ['Roadmap', stageLabel(t.stage)],
        ['Kind', KIND_LABELS[t.kind] || t.kind],
        ['Grade', t.grade.charAt(0).toUpperCase() + t.grade.slice(1)]
      ];
      if (t.missable) rows.push(['Warning', 'Potentially missable — see the roadmap callout.']);
      rows.forEach(function (row) {
        var dt = document.createElement('dt');
        dt.textContent = row[0];
        var dd = document.createElement('dd');
        dd.textContent = row[1];
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      detail.appendChild(dl);
      li.appendChild(detail);
    }

    return li;
  }

  function renderListMeta() {
    var shown = visibleTrophies().length;
    $('listMeta').textContent = 'Showing ' + shown + ' of ' + state.trophies.length + ' trophies' +
      (state.hideSpoilers ? ' · story spoilers hidden until earned' : '') +
      ' · progress is saved in this browser only.';
  }

  function renderList() {
    var list = $('trophyList');
    list.innerHTML = '';
    var shown = visibleTrophies();
    shown.forEach(function (t) { list.appendChild(trophyRow(t)); });
    $('emptyMsg').hidden = shown.length !== 0;
    renderListMeta();
  }

  function exportProgress() {
    var data = {
      app: 'leonida-trophy-guide',
      exported_at: new Date().toISOString(),
      earned: Object.keys(state.earned).map(Number).sort(function (a, b) { return a - b; })
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'gta6-trophies-progress.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var ids = data.earned || data;
        if (!Array.isArray(ids)) throw new Error('bad file');
        var next = {};
        ids.forEach(function (id) {
          var n = Number(id);
          if (state.trophies.some(function (t) { return t.id === n; })) next[n] = true;
        });
        state.earned = next;
        saveEarned();
        renderProgress();
        renderList();
      } catch (e) {
        alert('That file is not a valid progress export.');
      }
    };
    reader.readAsText(file);
  }

  function init() {
    state.earned = loadEarned();

    $('searchInput').addEventListener('input', function (ev) {
      state.query = ev.target.value;
      renderList();
    });

    $('filterChips').addEventListener('click', function (ev) {
      var btn = ev.target.closest('.chip');
      if (!btn) return;
      state.filter = btn.dataset.filter;
      document.querySelectorAll('#filterChips .chip').forEach(function (c) {
        c.classList.toggle('active', c === btn);
      });
      renderList();
    });

    $('spoilerToggle').addEventListener('change', function (ev) {
      state.hideSpoilers = ev.target.checked;
      state.openId = null;
      renderList();
    });

    $('earnedToggle').addEventListener('change', function (ev) {
      state.earnedOnly = ev.target.checked;
      renderList();
    });

    $('exportBtn').addEventListener('click', exportProgress);
    $('importBtn').addEventListener('click', function () { $('importFile').click(); });
    $('importFile').addEventListener('change', function (ev) {
      if (ev.target.files && ev.target.files[0]) importProgress(ev.target.files[0]);
      ev.target.value = '';
    });
    $('resetBtn').addEventListener('click', function () {
      if (confirm('Clear all checked trophies?')) {
        state.earned = {};
        saveEarned();
        renderProgress();
        renderList();
      }
    });

    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('trophies.json failed to load');
        return res.json();
      })
      .then(function (data) {
        state.trophies = data.trophies || [];
        state.sources = data.sources || [];
        renderProgress();
        renderRoadmap();
        renderSources();
        renderList();
      })
      .catch(function () {
        $('trophyList').innerHTML = '';
        $('emptyMsg').hidden = false;
        $('emptyMsg').textContent = 'The trophy list could not be loaded. Open this page from a local server or a hosted copy so data/trophies.json can load.';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
