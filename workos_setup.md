# WorkOS Phone OTP Authentication Setup Guide

You can send real SMS OTP verification messages to your users using WorkOS.

Follow these simple steps to configure your credentials:

### Step 1: Create a WorkOS Account
1. Go to the [WorkOS Dashboard](https://dashboard.workos.com/).
2. Log in or sign up for a free developer account.
3. Obtain your **API Key** from the dashboard settings.

### Step 2: Configure the App
Add your API key to your project `.env` file (for local development) or Cloudflare Pages environment variables (for production):

```env
WORKOS_API_KEY="YOUR_WORKOS_API_KEY"
```

Save the file and restart your server. The app will automatically connect to WorkOS to trigger real SMS OTP verifications. 

*(If `WORKOS_API_KEY` is not set, the app runs in free testing mode: it will print the generated OTP to the server console log and display it as an on-screen hint for developer convenience).*
