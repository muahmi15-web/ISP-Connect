# ISP Connect — customer app prototype (Phase 1)

A simple ISP customer app: **(1)** admin posts outage/info announcements from an
admin panel → customers get a push notification (Firebase) and see it in the app
inbox; **(2)** customers create complaint tickets in the app → they appear in the
admin panel, where the admin replies and changes status.

No payments, no OTP (phone + password login only), no ISP backend integration —
all data is managed manually through the admin panel.

## Project layout

```
app/
├── server.js               # Express server (API + static hosting)
├── db.js                   # SQLite schema + admin seed (data/isp.db)
├── fcm.js                  # Firebase push wrapper (graceful if unconfigured)
├── routes/                 # auth, announcements, tickets, devices, users
├── public/
│   ├── pwa/                # customer app: installable PWA, no build step
│   └── admin/              # admin panel: plain HTML/CSS/JS, no build step
├── config/                 # put firebase-service-account.json here (gitignored)
├── config.example/         # example configs showing what the ISP must provide
└── data/                   # SQLite database file (created on first run)
```

## Run locally

Requirements: Node.js 18+.

```bash
cd app
npm install
npm start
```

Then open:

- Customer app: http://localhost:3000/
- Admin panel:  http://localhost:3000/admin

## Test accounts

| Role     | Phone       | Password  |
|----------|-------------|-----------|
| Admin    | 03000000000 | admin123  |
| Customer | (register a new one in the app) | — |

Change the admin password after first login (Profile is customer-only; use the
API or create a second admin and disable the seed — simplest: log in to
`/admin`, then ask a developer to rotate it, or change it directly in the DB).

## API overview

All JSON. Auth via `Authorization: Bearer <token>`.

| Method | Endpoint                     | Who      | Purpose                              |
|--------|------------------------------|----------|--------------------------------------|
| POST   | /api/auth/register           | public   | Register customer                    |
| POST   | /api/auth/login              | public   | Login (admin or customer)            |
| GET    | /api/auth/me                 | user     | Current user                         |
| POST   | /api/auth/change-password    | user     | Change own password                  |
| GET    | /api/announcements           | user     | List announcements, newest first     |
| POST   | /api/announcements           | admin    | Post announcement + FCM broadcast    |
| GET    | /api/tickets                 | user     | Own tickets (admin: all, `?status=`) |
| POST   | /api/tickets                 | user     | Create complaint ticket              |
| GET    | /api/tickets/:id             | owner/ad | Ticket + replies                     |
| PATCH  | /api/tickets/:id             | admin    | Change status                        |
| POST   | /api/tickets/:id/replies     | owner/ad | Reply on a ticket                    |
| POST   | /api/devices                 | user     | Register FCM push token              |
| DELETE | /api/devices                 | user     | Remove FCM push token (logout)       |
| GET    | /api/users                   | admin    | List users                           |
| PATCH  | /api/users/:id               | admin    | Enable / disable user                |
| GET    | /api/health                  | public   | Health check + push status           |

## What the ISP must provide (checklist)

- [ ] **Firebase project** (free tier is enough to start):
  - [ ] `firebase-service-account.json` → place in `app/config/` (enables push from the server)
  - [ ] Web app config (apiKey, projectId, senderId, appId) → paste into `app/public/pwa/firebase-config.js`
  - [ ] **VAPID key** (Firebase Console → Project settings → Cloud Messaging → Web Push certificates) → same file
- [ ] **Branding**: app name, logo (PNG 192px + 512px — currently placeholder SVGs), brand colors
- [ ] **Admin phone number + name** for the real admin account (replace the seed)
- [ ] **Hosting decision**: where the Node server will run (a VPS or any Node host; the SQLite file lives next to the app)

Without the Firebase items, everything still works except **push notifications**:
announcements are saved and appear in the app inbox (which also works offline).

## Demo script (for showing the ISP)

1. Open `/admin`, log in as admin, post an announcement — "Internet issue in Gulberg, our team is working on it."
2. Open `/` on a phone, register a customer, allow notifications.
3. Post another announcement from `/admin` → it pops up on the phone.
4. In the phone app: Complain tab → submit "Internet down since morning".
5. In `/admin` → Tickets: open it, reply "Technician is on the way", set status In progress.
6. On the phone: Tickets tab → see the reply and status.

## Notes / limits of this prototype

- PWA, not a native APK — installs via "Add to Home screen"; needs HTTPS in production for push.
- Icons are placeholder SVGs; replace with real PNGs for the Play-Store-style install prompt.
- SQLite file DB is fine for a small ISP; move to Postgres/MySQL if they grow large.
- No rate limiting / audit log yet — add before public launch.
