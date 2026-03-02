# Google Auth Setup - Easy Step-by-Step Guide

## Part 1: Google Cloud Setup (10 minutes)

### Step 1: Create a Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Sign in with your Google account (or create one)
3. Click the **Project** dropdown at the top
4. Click **NEW PROJECT**
5. Name it: `RAL Finance App`
6. Click **CREATE**
7. Wait for the project to be created (you'll see a notification)

### Step 2: Enable Google OAuth API

1. In the Google Cloud Console, go to **APIs & Services**
2. Click **+ ENABLE APIS AND SERVICES**
3. Search for: `Google+ API`
4. Click on it and click **ENABLE**
5. Go back and search for: `OAuth 2.0`
6. Find and enable **Google Identity Services API**

### Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted to create consent screen first:
   - Click **CONFIGURE CONSENT SCREEN**
   - Choose **External** user type
   - Click **CREATE**
   - Fill in:
     - **App name**: RAL Finance
     - **User support email**: revenueautomationlab@gmail.com
     - **Developer contact**: revenueautomationlab@gmail.com
   - Click **SAVE AND CONTINUE** → **SAVE AND CONTINUE** → **SAVE AND CONTINUE**
   - Click **BACK TO CREDENTIALS**

4. Click **+ CREATE CREDENTIALS** → **OAuth client ID** again
5. Choose **Web application**
6. Name it: `RAL Finance Web`
7. Under **Authorized redirect URIs**, add **ONLY THIS URL**:

   ```
   https://mssxrafomjlzoypjvjdu.supabase.co/auth/v1/callback
   ```

   > ✅ This is the ONLY URL Google needs!
   > Your localhost and Netlify URLs will go in Supabase, not here.

8. Click **CREATE**
9. You'll see a popup with:
   - **Client ID** (copy this!)
   - **Client Secret** (copy this!)
10. Click **OK**

### Step 4: Save Your Credentials

You now have:

- **Client ID**: (something like `12345...apps.googleusercontent.com`)
- **Client Secret**: (something like `GOCSPX-...`)

**Save these somewhere safe** - you'll need them in the next step!

---

## Part 2: Supabase Setup (5 minutes)

### Step 1: Enable Google Provider in Supabase

1. Go to https://app.supabase.com/projects
2. Click your **RAL Finance** project
3. Go to **Authentication** (left sidebar)
4. Click **Providers**
5. Find **Google** and click to expand it
6. Toggle **Enabled** to ON
7. Paste your Google credentials:
   - **Client ID**: (paste from Google Cloud)
   - **Client Secret**: (paste from Google Cloud)
8. Click **SAVE**

### Step 2: Configure Redirect URLs

1. Still in **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, click **+ Add URL**
3. Add these 2 URLs (one at a time):
   ```
   http://localhost:5174/auth/callback
   https://ralfinance.netlify.app/auth/callback
   ```
   > ✅ These go in Supabase (not in Google Cloud!)
4. Click **Save**

**That's it!** You don't need to add anything else.

---

## Part 3: Using the App (First Time)

### First Login

1. Start your app: `npm run dev`
2. Go to http://localhost:5174
3. Click **"Sign in with Google"**
4. You'll be redirected to Google login
5. Sign in with any Google account
6. **If you use revenueautomationlab@gmail.com**: ✅ You can access the app
7. **If you use any other email**: ❌ You'll see "Access denied" error

> This is by design! Only the authorized email can use the app.

### Logging Out

- Scroll down in the sidebar
- Click **"Sign Out"** button
- You'll be redirected to login page

---

## Troubleshooting

### "Redirect URL mismatch"

- Make sure Supabase URL Configuration has your redirect URLs
- Make sure Google Cloud has ONLY: `https://mssxrafomjlzoypjvjdu.supabase.co/auth/v1/callback`
- Don't add localhost or Netlify URLs to Google Cloud - those go in Supabase only!

### "Invalid Client"

- Double-check you copied the correct **Client ID** and **Client Secret**
- Make sure there are no extra spaces

### "Unable to access the application"

- You logged in with the wrong email
- Only **revenueautomationlab@gmail.com** can access
- Sign out and try again with the authorized email

### "Login page appears but button doesn't work"

- Check browser console (F12 → Console)
- Make sure `.env.local` has your Supabase URL and Key
- Try refreshing the page

### "Stuck on 'Signing in' page"

- Wait 5-10 seconds
- If still stuck, close browser and go to localhost again
- OR check your `.env.local` file is correct

---

## What's Happening Behind the Scenes

### Login Flow

```
1. User clicks "Sign in with Google"
   ↓
2. Redirects to Google login page
   ↓
3. User signs in with Google account
   ↓
4. Google redirects back to /auth/callback
   ↓
5. Supabase creates auth session
   ↓
6. App checks if email is authorized
   ✅ YES: Redirects to dashboard
   ❌ NO: Shows error and signs out
```

### Data Access

- All database operations require authentication
- Only authenticated users can read/write data
- The app only allows revenueautomationlab@gmail.com

---

## Configuration Summary

| Platform         | Field                    | Value                                                                                  |
| ---------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| **Google Cloud** | App name                 | RAL Finance App                                                                        |
| **Google Cloud** | OAuth Type               | Web application                                                                        |
| **Google Cloud** | Authorized redirect URIs | `https://mssxrafomjlzoypjvjdu.supabase.co/auth/v1/callback` (ONLY this one)            |
| **Supabase**     | Provider                 | Google (Enabled)                                                                       |
| **Supabase**     | Client ID                | From Google Cloud                                                                      |
| **Supabase**     | Client Secret            | From Google Cloud                                                                      |
| **Supabase**     | Redirect URLs            | `http://localhost:5174/auth/callback` + `https://ralfinance.netlify.app/auth/callback` |
| **App**          | Authorized Email         | revenueautomationlab@gmail.com                                                         |

---

## Moving to Production

Good news! You've already added your Netlify URL to Supabase in the setup steps above.

Google Cloud is already configured with the Supabase callback (no changes needed for Netlify).

Just deploy:

```bash
npm run build
git push
```

Your app will work on https://ralfinance.netlify.app automatically! 🚀

No additional configuration needed.

---

## Security Notes

✅ **Your app is secure!**

- Only authenticated users can access anything
- Google handles the actual login (your password stays safe with Google)
- Database has Row Level Security (RLS) enabled
- Only authenticated users can read/modify data
- Environment variables are never exposed to users

---

## Need Help?

Check:

1. Browser console (F12) for error messages
2. Google Cloud Console credentials are correct
3. Supabase URL Configuration has your URLs
4. You're using the authorized email (revenueautomationlab@gmail.com)

---

**You're all set! Authentication is fully configured!** 🎉
