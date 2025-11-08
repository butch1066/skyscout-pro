# 🚀 Quick Start Guide

Get SkyScout Pro running in 5 minutes!

## Step 1: Clone the Repository

```bash
git clone https://github.com/butch1066/skyscout-pro.git
cd skyscout-pro
```

## Step 2: Get Your FREE API Keys

### Amadeus (2,000 free calls/month)
1. Go to https://developers.amadeus.com
2. Click "Register" → Sign up
3. Go to "My Self-Service Workspace"
4. Click "Create New App"
5. Copy your **Client ID** and **Client Secret**

### Kiwi.com (1,000 free calls/month)
1. Go to https://tequila.kiwi.com/portal/docs
2. Click "Sign Up"
3. Go to dashboard
4. Copy your **API Key**

### SerpAPI (100 free searches/month)
1. Go to https://serpapi.com
2. Click "Register"
3. Go to dashboard
4. Copy your **API Key**

## Step 3: Setup Backend

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
```

Now edit `backend/.env` and paste your API keys:

```bash
AMADEUS_CLIENT_ID=paste_your_amadeus_client_id
AMADEUS_CLIENT_SECRET=paste_your_amadeus_client_secret
KIWI_API_KEY=paste_your_kiwi_api_key
SERPAPI_KEY=paste_your_serpapi_key
```

Start the backend:

```bash
npm start
```

✅ Backend is now running at `http://localhost:3001`

## Step 4: Test It Works

Open a new terminal and test:

```bash
curl http://localhost:3001/api/health
```

You should see: `{"status":"healthy",...}`

## Step 5: Try a Real Flight Search

```bash
curl -X POST http://localhost:3001/api/search-flights \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "JFK",
    "destination": "LAX",
    "departDate": "2025-12-01",
    "passengers": 1
  }'
```

You'll get real flight prices! 🎉

## Step 6 (Optional): Run the Web App

```bash
# In a new terminal
cd frontend
npm install
npm start
```

Web app opens at `http://localhost:3000`

## Step 7 (Optional): Build Mobile App

```bash
cd mobile
npm install

# For Android
cd android
./gradlew assembleRelease

# APK is at: android/app/build/outputs/apk/release/app-release.apk
```

## 🎯 What Now?

- ✅ Backend is running with real APIs
- ✅ Test searches work
- ✅ Ready to build your app!

## Next Steps

1. **Customize** - Change colors, add features
2. **Deploy** - Put it on Heroku, Vercel, AWS
3. **Monetize** - Add affiliate links, ads
4. **Scale** - Add more flight sources

## 🆘 Need Help?

- Backend won't start? Check your API keys in `.env`
- Can't find API keys? Follow the links above step-by-step
- Other issues? Open an issue on GitHub

## 📚 More Documentation

- [Full Documentation](README.md)
- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

---

**That's it! You now have a working flight search platform. Happy coding! ✈️**