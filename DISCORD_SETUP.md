# Discord OAuth Setup Guide

## 1. Discord Developer Console Setup

### Step 1: Create a Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Give it a name (e.g., "Super League Fantasy")
4. Click "Create"

### Step 2: Configure OAuth2
1. In your Discord application, go to the **OAuth2** section in the left sidebar
2. Under **OAuth2 URL Generator**:
   - Select the following scopes:
     - `identify` - Get user's basic information (username, avatar, etc.)
     - `email` - Get user's email address (if available)
   - Copy the generated **Redirect URL** - you'll need this for Supabase

### Step 3: Get Your Credentials
1. In the **OAuth2** section, find:
   - **Client ID** - Copy this
   - **Client Secret** - Click "Reset Secret" if needed, then copy it
   - **Redirect URL** - This should be: `https://<your-project-ref>.supabase.co/auth/v1/callback`

### Step 4: Add Redirect URL
1. In the **OAuth2** section, scroll down to **Redirects**
2. Click "Add Redirect"
3. Add your Supabase callback URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - Replace `<your-project-ref>` with your actual Supabase project reference
   - You can find this in your Supabase dashboard URL or in your project settings

## 2. Supabase Dashboard Setup

### Step 1: Enable Discord Provider
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Providers**
3. Find **Discord** in the list
4. Toggle it **ON**

### Step 2: Add Discord Credentials
1. In the Discord provider settings, enter:
   - **Client ID** (from Discord Developer Console)
   - **Client Secret** (from Discord Developer Console)
2. Click **Save**

### Step 3: Configure Redirect URLs
1. In Supabase, go to **Authentication** > **URL Configuration**
2. Add your site URL(s):
   - Development: `http://localhost:3000`
   - Production: Your production URL
3. The callback URL is automatically handled by Supabase

## 3. Environment Variables

Make sure you have these in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=<your-anon-key>
```

## 4. Testing

1. Start your Next.js dev server: `pnpm dev`
2. Navigate to `/auth/login`
3. Click "Continue with Discord"
4. You should be redirected to Discord's authorization page
5. After authorizing, you'll be redirected back to your app

## Troubleshooting

### Common Issues:

1. **"Invalid redirect_uri"**
   - Make sure the redirect URL in Discord matches exactly: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Check for trailing slashes or typos

2. **"Invalid client"**
   - Verify your Client ID and Client Secret in Supabase match Discord
   - Make sure Discord provider is enabled in Supabase

3. **Redirect not working**
   - Check that your site URL is configured in Supabase Authentication settings
   - Verify the callback route is set up correctly

4. **User not authenticated after redirect**
   - Check browser console for errors
   - Verify the callback route is handling the code exchange properly


