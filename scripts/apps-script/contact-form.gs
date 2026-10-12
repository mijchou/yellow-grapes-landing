/**
 * Yellow Grapes — website contact form (Google Apps Script web app).
 *
 * The landing page's contact form (index.html → CONTACT_ENDPOINT) POSTs JSON:
 *   { name, email, topic, message, lang, website }
 * as `Content-Type: text/plain` (a "simple" request, so no CORS preflight).
 * This script:
 *   1. drops bot submissions (the hidden `website` honeypot field is filled),
 *   2. validates + trims every field,
 *   3. rate-limits (1 message per sender per minute, and an hourly cap),
 *   4. logs the message to the "Contact" sheet (backup if an email is missed),
 *   5. emails it to NOTIFY_TO with Reply-To set to the sender, so you can
 *      answer straight from your inbox,
 * and replies { success: true } or { success: false, error: '…' }.
 *
 * This file is NOT deployed by CI. It's versioned here so the live script can
 * always be restored. To deploy or update it:
 *   1. Open the Apps Script project behind CONTACT_ENDPOINT (the old waitlist
 *      script: from its Google Sheet → Extensions → Apps Script, or
 *      script.google.com).
 *   2. Replace the contents of Code.gs with this file. Save.
 *   3. Pick `authorize` in the function dropdown → Run, and allow the requested
 *      permissions (send email as you; edit the spreadsheet). Running it also
 *      sends a test email to NOTIFY_TO.
 *   4. Deploy → Manage deployments → select the existing Web app → ✏️ Edit →
 *      Version: "New version" → Deploy. (Editing the existing deployment keeps
 *      the /exec URL unchanged, so index.html needs no edit. "Execute as: Me",
 *      "Who has access: Anyone".)
 *
 * Mail quota: ~100 recipients/day on a personal Google account (1,500 on
 * Google Workspace). If the quota runs out, messages are still logged to the
 * sheet and the visitor still sees success.
 */

// ── Settings ─────────────────────────────────────────────────────────────────
var NOTIFY_TO = 'mchou@torsade.com.tw';
var SENDER_NAME = 'Yellow Grapes 網站';
// Leave '' if this script is bound to a spreadsheet (it then logs to that one).
// For a standalone script, paste the target spreadsheet's ID here.
var SHEET_ID = '';
var SHEET_NAME = 'Contact';
var TIMEZONE = 'Asia/Taipei';

var LIMITS = { name: 100, email: 254, message: 2000 };
var PER_SENDER_SECONDS = 60;   // one message per email address per minute
var HOURLY_CAP = 40;           // across all senders — protects the mail quota

var TOPICS = {
  general: '一般詢問 General',
  business: '商家合作 Business',
  press: '媒體 Press',
  other: '其他 Other'
};
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Web app entry point ──────────────────────────────────────────────────────
function doPost(e) {
  var data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '');
  } catch (err) {
    return reply_({ success: false, error: 'invalid' });
  }
  if (!data || typeof data !== 'object') return reply_({ success: false, error: 'invalid' });

  // Honeypot filled → a bot. Pretend it worked; do nothing.
  if (clean_(data.website, 200)) return reply_({ success: true });

  var msg = {
    name: clean_(data.name, LIMITS.name),
    email: clean_(data.email, LIMITS.email),
    topic: Object.prototype.hasOwnProperty.call(TOPICS, data.topic) ? data.topic : 'other',
    message: clean_(data.message, LIMITS.message, true),
    lang: data.lang === 'zh' ? 'zh' : 'en'
  };
  if (!msg.name || !EMAIL_RE.test(msg.email) || !msg.message) {
    return reply_({ success: false, error: 'invalid' });
  }

  var cache = CacheService.getScriptCache();
  var senderKey = 'sender_' + digest_(msg.email.toLowerCase());
  if (cache.get(senderKey)) return reply_({ success: false, error: 'rate_limited' });
  var hourKey = 'hour_' + Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMddHH');
  var sentThisHour = Number(cache.get(hourKey) || 0);
  if (sentThisHour >= HOURLY_CAP) return reply_({ success: false, error: 'rate_limited' });
  cache.put(senderKey, '1', PER_SENDER_SECONDS);
  cache.put(hourKey, String(sentThisHour + 1), 3600);

  var when = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm');
  var logged = logRow_(msg, when);
  var mailed = sendMail_(msg, when);

  // Logged or mailed is enough — the message isn't lost either way.
  return reply_(logged || mailed ? { success: true } : { success: false, error: 'server' });
}

// Visiting the /exec URL in a browser shouldn't show an error page.
function doGet() {
  return reply_({ ok: true });
}

// Run once from the editor to grant permissions (and send a test email).
function authorize() {
  sheet_();
  MailApp.sendEmail(NOTIFY_TO, '[Yellow Grapes] 網站聯絡表單已啟用',
    'The website contact form can now send email to this address.\n網站聯絡表單已可寄信到此信箱。');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function clean_(value, max, multiline) {
  if (typeof value !== 'string') return '';
  var text = value.replace(/\r\n?/g, '\n');
  // Strip control characters (keep newlines/tabs only for multi-line text).
  text = multiline
    ? text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    : text.replace(/[\u0000-\u001F\u007F]/g, ' ');
  text = text.trim();
  return text.length > max ? text.slice(0, max) : text;
}

function digest_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).slice(0, 32);
}

// Prefix values a spreadsheet would treat as a formula (CSV/formula injection).
function cell_(text) {
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function sheet_() {
  var book = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!book) return null;
  var sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.appendRow(['Time (Taipei)', 'Name', 'Email', 'Topic', 'Language', 'Message']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function logRow_(msg, when) {
  try {
    var sheet = sheet_();
    if (!sheet) return false;
    sheet.appendRow([when, cell_(msg.name), cell_(msg.email), msg.topic, msg.lang, cell_(msg.message)]);
    return true;
  } catch (err) {
    console.error('Contact log failed: ' + err);
    return false;
  }
}

function sendMail_(msg, when) {
  try {
    if (MailApp.getRemainingDailyQuota() < 1) {
      console.warn('Mail quota exhausted — message only logged to the sheet.');
      return false;
    }
    var subjectName = msg.name.replace(/\s+/g, ' ').slice(0, 60);
    MailApp.sendEmail({
      to: NOTIFY_TO,
      replyTo: msg.email,
      name: SENDER_NAME,
      subject: '[Yellow Grapes] 網站聯絡 · ' + TOPICS[msg.topic] + ' · ' + subjectName,
      body: [
        '主題 Topic:  ' + TOPICS[msg.topic],
        '姓名 Name:   ' + msg.name,
        '信箱 Email:  ' + msg.email,
        '語言 Lang:   ' + (msg.lang === 'zh' ? '中文' : 'English'),
        '時間 Time:   ' + when + ' (Taipei)',
        '',
        '訊息 Message:',
        msg.message,
        '',
        '—',
        'Sent from the contact form on yellow.grapes.com.tw. Reply to this email to answer ' + msg.name + ' directly.'
      ].join('\n')
    });
    return true;
  } catch (err) {
    console.error('Contact email failed: ' + err);
    return false;
  }
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
