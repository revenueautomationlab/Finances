# 🎯 Exact Copy-Paste Configuration

## Your Setup Details
- **Dev URL**: http://localhost:5174
- **Netlify URL**: https://ralfinance.netlify.app
- **Supabase Project ID**: mssxrafomjlzoypjvjdu

---

## Google Cloud - Copy THIS URL ONLY

### Authorized Redirect URIs
Put **ONLY THIS URL** in your Google OAuth client:

```
https://mssxrafomjlzoypjvjdu.supabase.co/auth/v1/callback
```

✅ That's the only one Google needs. Don't add localhost or Netlify here!

---

## Supabase - Copy BOTH of THESE URLs

### Authentication → URL Configuration → Redirect URLs

Add these two URLs:

**URL 1 (Development):**
```
http://localhost:5174/auth/callback
```

**URL 2 (Production):**
```
https://ralfinance.netlify.app/auth/callback
```

✅ Add both of these to Supabase

---

## Your Code is Already Correct

The `signInWithGoogle()` function in `src/contexts/AuthContext.jsx` is already configured correctly:

```jsx
const signInWithGoogle = async () => {
  try {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  } catch (err) {
    console.error('Login error:', err)
    setError(err.message)
  }
}
```

✅ It automatically sends the correct redirectTo based on whether you're on localhost or production!

---

## The Callback Handler

Your `/auth/callback` route in `src/main.jsx` is already set up correctly:

```jsx
<Route path="/auth/callback" element={<AuthCallbackPage />} />
```

The `AuthCallbackPage.jsx` automatically:
1. Receives the auth callback from Supabase
2. Checks if user is authenticated
3. Validates the email (revenueautomationlab@gmail.com only)
4. Redirects to home page if authorized
5. Signs out if unauthorized

✅ No changes needed here!

---

## Email Validation is Already Enforced

Two places validate the email:

**Layer 1: AuthContext.jsx - On initial load**
```jsx
if (session?.user) {
  if (session.user.email === 'revenueautomationlab@gmail.com') {
    setUser(session.user)
  } else {
    await supabase.auth.signOut()
    setError('Access denied...')
  }
}
```

**Layer 2: AuthContext.jsx - On every login**
```jsx
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    if (session.user.email === 'revenueautomationlab@gmail.com') {
      setUser(session.user)
    } else {
      await supabase.auth.signOut()
      setError('Access denied...')
    }
  }
})
```

✅ Only authorized email can access! Anyone else is auto-signed out.

---

## Step-by-Step Setup (5 minutes)

### 1️⃣ Google Cloud (3 minutes)

1. Go to https://console.cloud.google.com/
2. Create new project: `RAL Finance App`
3. Search for **Google+ API** → Enable it
4. Go to **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Choose **Web application**
6. Under **Authorized redirect URIs**, add:
   ```
   https://mssxrafomjlzoypjvjdu.supabase.co/auth/v1/callback
   ```
7. Click **CREATE**
8. Copy your **Client ID** and **Client Secret**

### 2️⃣ Supabase (2 minutes)

1. Go to https://app.supabase.com/projects
2. Click **RAL Finance** project
3. Go to **Authentication** → **Providers**
4. Find **Google** → Toggle **Enabled** ON
5. Paste your Google **Client ID** and **Client Secret**
6. Click **SAVE**
7. Go to **Authentication** → **URL Configuration**
8. Under **Redirect URLs**, add:
   - `http://localhost:5174/auth/callback`
   - `https://ralfinance.netlify.app/auth/callback`
9. Click **Save**

### 3️⃣ Test It

```bash
npm run dev
```

1. Go to http://localhost:5174
2. Click **"Sign in with Google"**
3. Sign in with **revenueautomationlab@gmail.com** → ✅ Should work!
4. Sign in with another email → ❌ Auto sign out (expected!)

---

## You're All Set! 🎉

Everything else is already configured in your code. Just follow the Google Cloud and Supabase steps above, and you're done!

No code changes needed.
No environment variables to add.
No Router changes needed.
No callback handler changes needed.

✅ It just works!
