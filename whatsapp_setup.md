# Free Meta WhatsApp Cloud API Setup Guide

You can send real WhatsApp OTP verification messages to your phone for **100% free** using Meta's official WhatsApp Developer API. Meta provides **1,000 free conversations per month** for developer and business testing.

Follow these 4 simple steps to get your credentials in 5 minutes:

### Step 1: Create a Meta Developer Account
1. Go to the [Meta for Developers Portal](https://developers.facebook.com/).
2. Log in with your Facebook account and register as a developer.
3. Click **Create App** in the dashboard.
4. Select **Other** -> **Business** (or select **WhatsApp** if prompted directly) and create your app.

### Step 2: Set Up WhatsApp inside your App
1. Inside your new App dashboard, scroll down to **Add products to your app** and click **Set up** on the **WhatsApp** card.
2. Select or create a Meta Business Account when prompted, and click **Continue**.

### Step 3: Get your Free Testing Credentials
1. In the left-hand menu, go to **WhatsApp** -> **API Setup**.
2. Under **Temporary access token**, copy the long token (valid for 24 hours for developer testing).
3. Under **Step 1: Select phone numbers**, copy the **Phone number ID**.
4. Under **Step 2: To send and receive messages**, add your own personal mobile number as a **Recipient phone number** (you must verify it with an OTP once to allow sending messages to it).

### Step 4: Configure the App
Paste these copied values into your project `.env` file (for local development) or Cloudflare Pages settings (for production):

```env
WHATSAPP_TOKEN="YOUR_TEMPORARY_ACCESS_TOKEN"
WHATSAPP_PHONE_NUMBER_ID="YOUR_PHONE_NUMBER_ID"
```

Save the file and restart your server. You will now receive real WhatsApp OTP messages directly on your phone!
