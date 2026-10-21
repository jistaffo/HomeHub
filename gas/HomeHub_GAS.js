/**
 * HomeHub Apps Script backend.
 *
 * Deploy: Extensions > Apps Script (from your Google Sheet) > paste this file's
 * contents in as Code.gs > Deploy > New deployment > Web app > Execute as Me,
 * Who has access: Anyone. Copy the /exec URL into the app's setup modal.
 *
 * Access control: every request must carry a `token` query param matching the
 * HH_TOKEN Script Property (Project Settings > Script Properties in the Apps
 * Script editor — never hardcode it here, never commit it). Requests without
 * a matching token are rejected before touching the spreadsheet. This is the
 * real access boundary — the /exec URL itself is not a secret worth relying on.
 *
 * Storage model:
 *  - RECORD_KEYS (logs, contractors, warranties, utils, ct, findings, todos)
 *    each get their own sheet tab, one row per record, columns auto-derived
 *    from the union of fields seen — so these stay human-eyeballable/editable
 *    directly in Sheets, unlike a single JSON-blob cell.
 *  - Everything else (completion maps, the sensitive-fields object) is
 *    opaque app state with no natural row shape — those live as one row
 *    each in a single "_AppState" tab: [key, json, updatedAt].
 */

var RECORD_KEYS = ['homehub:logs', 'homehub:contractors', 'homehub:warranties', 'homehub:utils', 'homehub:ct', 'homehub:findings', 'homehub:todos'];
var APPSTATE_TAB = '_AppState';

function doGet(e) {
  var params = e.parameter || {};
  var callback = params.callback;
  var result;
  try {
    result = handleRequest(params);
  } catch (err) {
    result = { ok: false, error: String(err && err.message || err) };
  }
  var body = JSON.stringify(result);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function handleRequest(params) {
  var token = PropertiesService.getScriptProperties().getProperty('HH_TOKEN');
  if (!token) return { ok: false, error: 'Server not configured: set the HH_TOKEN script property first.' };
  if (params.token !== token) return { ok: false, error: 'Unauthorized' };

  var key = params.key;
  if (!key) return { ok: false, error: 'Missing key' };

  if (params.action === 'get') {
    if (key === '__ping__') return { ok: true, value: '' };
    return { ok: true, value: getKey(key) };
  }
  if (params.action === 'set') {
    var raw = params.value;
    // Client double-encodes (encodeURIComponent then JSON.stringify); undo both.
    var jsonStr = decodeURIComponent(raw);
    setKey(key, jsonStr);
    return { ok: true };
  }
  return { ok: false, error: 'Unknown action' };
}

function getKey(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (RECORD_KEYS.indexOf(key) !== -1) {
    var sheet = ss.getSheetByName(tabNameFor(key));
    if (!sheet) return '[]';
    return JSON.stringify(readRecordSheet(sheet));
  }
  var stateSheet = getOrCreateAppStateSheet(ss);
  var row = findAppStateRow(stateSheet, key);
  if (!row) return '';
  return stateSheet.getRange(row, 2).getValue() || '';
}

function setKey(key, jsonStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (RECORD_KEYS.indexOf(key) !== -1) {
    var records = [];
    try { records = JSON.parse(jsonStr) || []; } catch (e) { records = []; }
    var sheet = ss.getSheetByName(tabNameFor(key));
    if (!sheet) sheet = ss.insertSheet(tabNameFor(key));
    writeRecordSheet(sheet, records);
    return;
  }
  var stateSheet = getOrCreateAppStateSheet(ss);
  var row = findAppStateRow(stateSheet, key);
  var now = new Date().toISOString();
  if (row) {
    stateSheet.getRange(row, 2, 1, 2).setValues([[jsonStr, now]]);
  } else {
    stateSheet.appendRow([key, jsonStr, now]);
  }
}

function tabNameFor(key) {
  // 'homehub:logs' -> 'logs'
  return key.indexOf(':') !== -1 ? key.split(':')[1] : key;
}

function getOrCreateAppStateSheet(ss) {
  var sheet = ss.getSheetByName(APPSTATE_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(APPSTATE_TAB);
    sheet.appendRow(['key', 'value_json', 'updatedAt']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findAppStateRow(sheet, key) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (keys[i][0] === key) return i + 2;
  }
  return null;
}

function readRecordSheet(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var rec = {};
    var empty = true;
    for (var c = 0; c < headers.length; c++) {
      var h = headers[c];
      if (!h) continue;
      var v = values[r][c];
      if (v !== '' && v !== null && v !== undefined) empty = false;
      rec[h] = coerceCell(v);
    }
    if (!empty) out.push(rec);
  }
  return out;
}

function coerceCell(v) {
  // Sheets hands back Date objects for date-looking strings sometimes; keep
  // everything else as-is (numbers/booleans already come back typed).
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return v;
}

function writeRecordSheet(sheet, records) {
  // Union of all keys across records, in first-seen order, so column order
  // stays stable across writes instead of reshuffling every save.
  var headerSet = {};
  var headers = [];
  records.forEach(function (rec) {
    Object.keys(rec).forEach(function (k) {
      if (!headerSet[k]) { headerSet[k] = true; headers.push(k); }
    });
  });
  sheet.clearContents();
  if (headers.length === 0) return;
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  if (records.length === 0) return;
  var rows = records.map(function (rec) {
    return headers.map(function (h) {
      var v = rec[h];
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    });
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}
