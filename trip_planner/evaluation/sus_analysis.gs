/**
 * SUS and satisfaction analysis for the "Lanka Trip Planner: Usability Responses" spreadsheet.
 *
 * Setup: open the responses spreadsheet -> Extensions -> Apps Script -> paste this file -> Save.
 * Reload the spreadsheet; a "SUS Analysis" menu appears. Click SUS Analysis -> Run analysis.
 * It (re)creates two sheets:
 *   "SUS Scores"   one row per participant with the SUS score and grade
 *   "SUS Summary"  Table 5.8 values, the test against 68, international vs local, Cronbach's alpha,
 *                  and Table 5.7 (satisfaction means, SD and Mann-Whitney p)
 * Scoring (Brooke, 1996): odd items (answer - 1), even items (5 - answer); sum x 2.5 -> 0..100.
 * p-values are computed by sheet formulas (T.DIST.2T, NORM.S.DIST); Mann-Whitney uses the normal
 * approximation with tie and continuity correction.
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('SUS Analysis').addItem('Run analysis', 'runSusAnalysis').addToUi();
}

function runSusAnalysis() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var src = findResponseSheet_(ss);
  var data = src.getDataRange().getValues();
  var head = data[0].map(String);
  var col = function (prefix) {
    for (var i = 0; i < head.length; i++) if (head[i].indexOf(prefix) === 0) return i;
    throw new Error('Column starting with "' + prefix + '" not found in sheet "' + src.getName() + '".');
  };
  var optionalCol = function (prefix) { try { return col(prefix); } catch (e) { return -1; } };
  var c = {
    id: optionalCol('Participant ID'), task: col('Task completed'), time: col('Time from'), group: col('Which describes you'),
    s: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (i) { return col('S' + i + '. '); }),
    t: [1, 2, 3, 4, 5, 6, 7].map(function (i) { return col('T' + i + '. '); })
  };

  // ---- read participants --------------------------------------------------------------------------------
  var people = [], skipped = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (row.join('').trim() === '') continue;
    // without a Participant ID question, number participants in submission order (P01, P02, ...)
    var pid = c.id >= 0 ? String(row[c.id]).trim() : 'P' + ('0' + r).slice(-2);
    if (pid === '') continue;
    var s = c.s.map(function (k) { return Number(row[k]); });
    var t = c.t.map(function (k) { return Number(row[k]); });
    if (s.concat(t).some(function (v) { return !(v >= 1 && v <= 5); })) { skipped.push(pid); continue; }
    var sus = 0;
    s.forEach(function (v, i) { sus += (i % 2 === 0) ? v - 1 : 5 - v; });   // i=0 is item 1 (odd)
    people.push({
      id: pid,
      group: String(row[c.group]).indexOf('International') === 0 ? 'international' : 'local',
      task: String(row[c.task]).trim() === 'Yes' ? 1 : 0,
      time: Number(row[c.time]),
      s: s, t: t, sus: sus * 2.5
    });
  }
  if (people.length < 2) throw new Error('Need at least 2 complete responses (found ' + people.length + ').');

  // ---- sheet 1: per-participant scores ------------------------------------------------------------------
  var out = resetSheet_(ss, 'SUS Scores');
  var rows = [['Participant ID', 'Group', 'SUS score', 'Grade', 'Task completed', 'Plan time (s)',
               'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']];
  people.forEach(function (p) {
    rows.push([p.id, p.group, p.sus, grade_(p.sus), p.task, p.time].concat(p.s));
  });
  out.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  out.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  out.setFrozenRows(1);

  // ---- sheet 2: summary ---------------------------------------------------------------------------------
  var sum = resetSheet_(ss, 'SUS Summary');
  var intl = people.filter(function (p) { return p.group === 'international'; });
  var local = people.filter(function (p) { return p.group === 'local'; });
  var line = 1;
  var put = function (values, bold) {
    var rng = sum.getRange(line, 1, 1, values.length);
    rng.setValues([values]);
    if (bold) rng.setFontWeight('bold');
    line++;
    return line - 1;
  };

  put(['Table 5.8: Usability results'], true);
  put(['Group', 'n', 'SUS mean', 'SUS SD', 'Min', 'Max', '95% CI low', '95% CI high', 'Grade',
       'Task completion (%)', 'Mean plan time (s)'], true);
  [['International', intl], ['Local', local], ['All', people]].forEach(function (g) {
    var x = g[1].map(function (p) { return p.sus; });
    var n = x.length, m = mean_(x), sd = sd_(x);
    var r0 = line;
    put([g[0], n, n ? round_(m, 1) : '', n > 1 ? round_(sd, 1) : '', n ? Math.min.apply(null, x) : '',
         n ? Math.max.apply(null, x) : '', '', '', n ? grade_(m) : '',
         n ? round_(100 * mean_(g[1].map(function (p) { return p.task; })), 1) : '',
         n ? round_(mean_(g[1].map(function (p) { return p.time; })), 1) : '']);
    if (n > 1) {
      sum.getRange(r0, 7).setFormula('=ROUND(C' + r0 + '-T.INV.2T(0.05,B' + r0 + '-1)*D' + r0 + '/SQRT(B' + r0 + '),1)');
      sum.getRange(r0, 8).setFormula('=ROUND(C' + r0 + '+T.INV.2T(0.05,B' + r0 + '-1)*D' + r0 + '/SQRT(B' + r0 + '),1)');
    }
  });
  line++;

  // one-sample t-test against the benchmark of 68
  var all = people.map(function (p) { return p.sus; });
  var tStat = (mean_(all) - 68) / (sd_(all) / Math.sqrt(all.length));
  put(['SUS compared with benchmark 68 (one-sample t-test)'], true);
  put(['t', 'df', 'p (two-sided)'], true);
  var tr = put([round_(tStat, 3), all.length - 1, '']);
  sum.getRange(tr, 3).setFormula('=ROUND(T.DIST.2T(ABS(A' + tr + '),B' + tr + '),4)');
  line++;

  // international vs local
  put(['International vs local SUS (Mann-Whitney U)'], true);
  put(['U', 'z', 'p (two-sided)'], true);
  if (intl.length && local.length) {
    var mw = mannWhitney_(intl.map(function (p) { return p.sus; }), local.map(function (p) { return p.sus; }));
    var mr = put([mw.U, round_(mw.z, 3), '']);
    sum.getRange(mr, 3).setFormula('=ROUND(2*(1-NORM.S.DIST(ABS(B' + mr + '),TRUE)),4)');
  } else {
    put(['Needs at least one participant in each group']);
  }
  line++;

  put(["Cronbach's alpha (10 SUS items, even items reversed)"], true);
  put([round_(cronbach_(people.map(function (p) {
    return p.s.map(function (v, i) { return i % 2 === 0 ? v : 6 - v; });
  })), 3)]);
  line++;

  // Table 5.7
  var items = ['Recommendation relevance', 'Perceived personalisation', 'Itinerary usefulness', 'Route usefulness',
               'Budget usefulness', 'Crowd-awareness usefulness', 'Overall satisfaction'];
  put(['Table 5.7: User satisfaction'], true);
  put(['Satisfaction item (1-5)', 'Mean', 'SD', 'International mean', 'Local mean', 'Mann-Whitney z',
       'International vs local p'], true);
  items.forEach(function (name, k) {
    var x = people.map(function (p) { return p.t[k]; });
    var a = intl.map(function (p) { return p.t[k]; }), b = local.map(function (p) { return p.t[k]; });
    var both = a.length && b.length;
    var z = both ? mannWhitney_(a, b).z : '';
    var ir = put([name, round_(mean_(x), 2), round_(sd_(x), 2), a.length ? round_(mean_(a), 2) : '',
                  b.length ? round_(mean_(b), 2) : '', both ? round_(z, 3) : '', '']);
    if (both) sum.getRange(ir, 7).setFormula('=ROUND(2*(1-NORM.S.DIST(ABS(F' + ir + '),TRUE)),4)');
  });
  put(["Cronbach's alpha (7 satisfaction items)", round_(cronbach_(people.map(function (p) { return p.t; })), 3)]);
  line++;
  put(['Participants included: ' + people.length + ' (international ' + intl.length + ', local ' + local.length + ')' +
       (skipped.length ? '. Skipped (missing or invalid answers): ' + skipped.join(', ') : '')]);

  sum.autoResizeColumns(1, 11);
  ss.setActiveSheet(sum);
  SpreadsheetApp.getUi().alert('Done: ' + people.length + ' participants analysed. See "SUS Summary".');
}

// ---------------------------------------------------------------------------------------------- helpers
function findResponseSheet_(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var h = sheets[i].getRange(1, 1, 1, Math.max(1, sheets[i].getLastColumn())).getValues()[0].join('|');
    if (h.indexOf('Task completed') >= 0 && h.indexOf('S1. ') >= 0) return sheets[i];
  }
  throw new Error('No sheet with form responses found (looking for "Task completed" and "S1." columns).');
}

function resetSheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (sh) sh.clear(); else sh = ss.insertSheet(name);
  return sh;
}

function mean_(x) { return x.reduce(function (a, b) { return a + b; }, 0) / x.length; }

function sd_(x) {
  if (x.length < 2) return NaN;
  var m = mean_(x);
  return Math.sqrt(x.reduce(function (a, v) { return a + (v - m) * (v - m); }, 0) / (x.length - 1));
}

function round_(v, d) { return isFinite(v) ? Math.round(v * Math.pow(10, d)) / Math.pow(10, d) : ''; }

// adjective rating (Bangor et al., 2009); 68 is the conventional average
function grade_(s) {
  if (s >= 85.5) return 'Excellent';
  if (s >= 72.6) return 'Good';
  if (s >= 52) return 'OK';
  if (s >= 38) return 'Poor';
  return 'Awful';
}

function cronbach_(rows) {
  if (rows.length < 3) return NaN;
  var k = rows[0].length;
  var itemVar = 0;
  for (var j = 0; j < k; j++) itemVar += Math.pow(sd_(rows.map(function (r) { return r[j]; })), 2);
  var totals = rows.map(function (r) { return r.reduce(function (a, b) { return a + b; }, 0); });
  return k / (k - 1) * (1 - itemVar / Math.pow(sd_(totals), 2));
}

// normal approximation with tie correction and continuity correction (as scipy's asymptotic method)
function mannWhitney_(a, b) {
  var all = a.map(function (v) { return { v: v, g: 0 }; }).concat(b.map(function (v) { return { v: v, g: 1 }; }));
  all.sort(function (p, q) { return p.v - q.v; });
  var N = all.length, tieSum = 0;
  for (var i = 0; i < N;) {
    var j = i;
    while (j + 1 < N && all[j + 1].v === all[i].v) j++;
    var rank = (i + j) / 2 + 1, t = j - i + 1;
    for (var k = i; k <= j; k++) all[k].r = rank;
    tieSum += t * t * t - t;
    i = j + 1;
  }
  var n1 = a.length, n2 = b.length;
  var R1 = all.filter(function (p) { return p.g === 0; }).reduce(function (s, p) { return s + p.r; }, 0);
  var U = R1 - n1 * (n1 + 1) / 2;
  var mu = n1 * n2 / 2;
  var sigma = Math.sqrt(n1 * n2 / 12 * ((N + 1) - tieSum / (N * (N - 1))));
  var z = sigma > 0 ? (Math.abs(U - mu) - 0.5) / sigma : 0;
  return { U: U, z: U < mu ? -Math.max(z, 0) : Math.max(z, 0) };
}
