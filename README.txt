AJITH TICKET VERIFICATION — ONLINE DEPLOYMENT PACKAGE

This is an independent visitor ticket-code system, not a Google login or third-party OTP collection page.

FEATURES
- Visitors generate a random six-digit ticket code.
- The code appears to the visitor and is saved to a hosted PostgreSQL database.
- Admin has a separate password-protected dashboard.
- Admin can view generated codes and verify them.
- A successful verification marks a code as redeemed; it cannot be reused.
- Codes expire after 24 hours.

IMPORTANT BEFORE DEPLOYING
The admin password previously shared in chat should NOT be reused. Set a new, unique admin password.
Do not send your hosting passwords, database password, or secret keys in chat.

FREE-TEST DEPLOYMENT OVERVIEW
1. Create a GitHub account and upload the contents of this folder to a private or public repository.
2. Create a Supabase project and copy its PostgreSQL connection string (use the URI/connection string option).
3. Create a Render account and create a new Web Service from the GitHub repository.
4. Set Build Command: npm install
5. Set Start Command: npm start
6. Add environment variables in Render:
   NODE_ENV = production
   ADMIN_PASSWORD = a new strong private password (at least 12 characters)
   SESSION_SECRET = a random secret at least 32 characters long
   DATABASE_URL = the Supabase PostgreSQL connection string
7. Deploy. Render provides a public *.onrender.com URL.
8. Visitor page is the root URL. Admin page is /admin.html.

FREE-TIER NOTES
- Render free web services sleep after 15 minutes idle and may take about a minute to wake.
- Render free web services have ephemeral local filesystems, so this version uses PostgreSQL rather than SQLite.
- Supabase Free database projects may pause after a week of inactivity and have usage/storage limits. Check current terms before relying on this for important records.
- This is a starter demo, not a full production security audit. For public commercial use, add a persistent session store, CSRF protection, backups, monitoring, and stricter abuse controls.
