// Firebase Cloud Messaging wrapper.
// Loads config/firebase-service-account.json if present. If missing (or the
// firebase-admin package is not installed), push is disabled gracefully:
// announcements are still saved and shown in the app inbox.
const fs = require('fs');
const path = require('path');

const KEY_PATH = path.join(__dirname, 'config', 'firebase-service-account.json');

let admin = null;
let enabled = false;

try {
  admin = require('firebase-admin');
} catch (e) {
  console.log('[fcm] firebase-admin not installed — push notifications disabled.');
}

if (admin) {
  if (fs.existsSync(KEY_PATH)) {
    try {
      const serviceAccount = require(KEY_PATH);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      enabled = true;
      console.log('[fcm] Firebase Admin initialized — push notifications enabled.');
    } catch (e) {
      console.log('[fcm] Could not initialize Firebase Admin:', e.message);
    }
  } else {
    console.log('[fcm] No config/firebase-service-account.json — push disabled (inbox still works).');
  }
}

function isEnabled() {
  return enabled;
}

// Send a push notification to many FCM tokens. Never throws.
async function sendToTokens(tokens, title, body) {
  if (!enabled || !tokens || tokens.length === 0) return { sent: 0, failed: 0 };
  const message = {
    notification: { title, body },
    data: { type: 'announcement' },
    tokens,
  };
  try {
    const res = await admin.messaging().sendEachForMulticast(message);
    // Clean up tokens that are no longer valid.
    const bad = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token') {
          bad.push(tokens[i]);
        }
      }
    });
    if (bad.length) {
      const db = require('./db');
      const del = db.prepare('DELETE FROM devices WHERE fcm_token = ?');
      bad.forEach((t) => del.run(t));
      console.log(`[fcm] Removed ${bad.length} dead device token(s).`);
    }
    return { sent: res.successCount, failed: res.failureCount };
  } catch (e) {
    console.log('[fcm] send failed:', e.message);
    return { sent: 0, failed: tokens.length };
  }
}

module.exports = { isEnabled, sendToTokens };
