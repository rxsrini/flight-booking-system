# 🚀 Deploy to Railway - 3 Clicks Only!

## **Automatic Deployment (No Terminal Commands Needed!)**

### **Step 1: Click This Link**
👉 **https://railway.app/new/github**

### **Step 2: Select Your Repository**
1. Log in with GitHub
2. Find: `rxsrini/flight-booking-system`
3. Click **"Deploy Now"**

### **Step 3: Set Environment Variables**
After deployment starts, click on your project and add these variables:

```
JWT_SECRET=pciWWNA1QZ1OzjkNmibHTGbcq7IvZQxa526JnSZqsRk=
ENCRYPTION_KEY=EoL9XEt91HEQDVSsXSp9+niOxdER0x1l
NODE_ENV=production
JWT_EXPIRATION=1h
REFRESH_TOKEN_EXPIRATION=7d
AMADEUS_API_KEY=test_key
AMADEUS_API_SECRET=test_secret
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=demo@example.com
SMTP_PASSWORD=demo
```

**That's it!** ✅

Railway will automatically:
- ✅ Detect all services
- ✅ Create PostgreSQL database
- ✅ Create Redis cache
- ✅ Deploy all 9 microservices
- ✅ Deploy frontend
- ✅ Provide URLs for each service

---

## **Your URLs will be:**

After deployment (5-10 minutes):
- Frontend: `https://your-app.railway.app`
- API Gateway: `https://api-gateway.railway.app`
- All services will have their own URLs

---

## **Need Real API Keys?**

### **Amadeus (Flight Search)**
1. Sign up: https://developers.amadeus.com
2. Get API keys
3. Replace `AMADEUS_API_KEY` and `AMADEUS_API_SECRET`

### **Stripe (Payments)**
1. Sign up: https://stripe.com
2. Get test keys from dashboard
3. Replace `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`

### **Email (Gmail)**
1. Enable 2FA on Gmail
2. Create App Password: https://myaccount.google.com/apppasswords
3. Replace `SMTP_USER` and `SMTP_PASSWORD`

---

## **Deployment Status**

Check deployment at: https://railway.app/dashboard

All services will show as "Active" when ready! 🎉
