# qa-app: Live Multi-Speaker Q&A Application

`qa-app` is a modern real-time Q&A web application designed for multi-speaker training sessions, workshops, and tech conferences. Participants can submit questions to a specific speaker or "any speaker", upvote questions, view live answers on a projector screen, receive answers via email, and browse archived Q&A knowledge bases.

---

## 🚀 Features

- **Multi-Speaker Training Sessions**: Schedule sessions, assign speakers with specialties, and manage dynamic brand themes.
- **Participant Q&A**: Live submission with 500-char limits, real-time upvotes, and public/private archive opt-in.
- **Speaker Queue**: Speaker-filtered answer dashboard with 2000-char replies and email dispatch via Nodemailer.
- **Live Projector Screen (`/session/:id/live`)**: Read-only high-visibility display with live clock, active open board, and answered strip.
- **Knowledge Base & Archive**: Per-session archive and global multi-criteria search (keyword, speaker, date range).
- **Post-Session Close-Out**: 1-click session conclusion marking open questions "unanswered" and emailing archive links to opted-in askers.
- **Session Sponsors & Partners**: Tiered sponsor support (Title, Gold, Supporting) with logo displays, prominence scaling, and no-opener links.
- **Security & Privacy Hardening**: Strict CORS origin restriction, rate limiting on mutations, and guaranteed email masking across all public endpoints.

---

## 🛠️ Setup Steps

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables & Email Setup
Configure `.env` in the project root:

#### Option A: Gmail / Google Workspace (Live Emails)
1. Turn on **2-Step Verification** in your Google Account: https://myaccount.google.com/security
2. Generate an **App Password** (Select App: "Mail" or custom name "Q&A App"): https://myaccount.google.com/apppasswords
3. Configure your `.env`:

```env
# Admin Authentication
ADMIN_TOKEN=admin123

# Server Port & CORS Configuration
PORT=4000
FRONTEND_ORIGIN=http://localhost:5174,http://localhost:5173

# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password
MAIL_FROM="Q&A Sessions" <your_email@gmail.com>
```

#### Option B: Mock Mode (Local Development)
To log outgoing emails to the terminal without connecting to a mail server:
```env
SMTP_HOST=mock
```

#### Test Email Configuration
Validate your connection and send a test email:
```bash
# Check SMTP connection
npm run test:email

# Send a test email to a recipient
node server/test-email.js recipient@example.com
```

---

## 🏃 Running the Application

### Start the Backend Server (Port 4000)
```bash
npm run server
```
The server will run at `http://localhost:4000` with API routes mounted at `/api`.

### Start the Frontend Dev Server (Port 5174 / 5173)
```bash
npm run dev
```
Open `http://localhost:5174` in your browser.

### Build Frontend for Production
```bash
npm run build
```

---

## 🔐 Security & Hardening Rules

1. **Origin Restriction (CORS)**: Requests from unauthorized browser origins are rejected using `FRONTEND_ORIGIN`.
2. **Rate Limiting**: All `POST` routes are protected with `express-rate-limit` (100 requests per 15-minute window per IP).
3. **Email Privacy**: Participant and speaker email addresses are never returned on public endpoints; only authenticated admin endpoints (`x-admin-token`) have access to contact emails.
4. **Archived Sessions Immutability**: Archived sessions reject all write mutations (`questions`, `replies`, `upvotes`, `sponsors`, `advance`) with `409 Conflict`.
