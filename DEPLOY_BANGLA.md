# সাইট অনলাইনে তোলার ধাপ (ThePipilika.com)

সবচেয়ে সহজ: **Railway** (সাইট + ডাটাবেস এক জায়গায়)। খরচ মাসে আনুমানিক ৫ ডলার থেকে।

## ১. কোড GitHub এ রাখুন
1. github.com এ একাউন্ট খুলুন (থাকলে লগইন)।
2. নতুন repository বানান, নাম `pipilika` (Private)।
3. `pipilika-site.zip` আনজিপ করে সব ফাইল সেই repo তে আপলোড করুন ("Add file → Upload files")।
   - অথবা Claude কে GitHub কানেক্ট করে দিতে বলুন, Claude নিজেই push করে দেবে।

## ২. Railway তে চালু করুন
1. railway.app এ GitHub দিয়ে লগইন করুন।
2. **New Project → Deploy from GitHub repo →** `pipilika` বাছুন।
3. একই প্রজেক্টে **New → Database → PostgreSQL** যোগ করুন।
4. সাইটের সার্ভিসে **Variables** এ এগুলো দিন:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `AUTH_SECRET` = যেকোনো লম্বা গোপন লেখা (৪০+ অক্ষর)
   - `NEXT_PUBLIC_SITE_URL` = `https://thepipilika.com`
   - `OTP_DEV_SHOW` = `false`
   - `UPLOAD_DIR` = `/data/storage`
5. সার্ভিসে **Volume** যোগ করুন, mount path: `/data` (ছবি/ডিজাইন ফাইল এখানে থাকবে)।
6. Deploy শেষ হলে Railway একটা লিংক দেবে (…up.railway.app)। সেটা খুলে দেখুন।
7. ডেমো ডাটা চাইলে একবার: সার্ভিস → **⋯ → Run command / Shell** → `npm run db:seed`
   (সতর্কতা: এটা পুরো ডাটাবেস মুছে ডেমো ডাটা বসায়। লাইভ হওয়ার পর আর চালাবেন না।)

## ৩. ডোমেইন যুক্ত করুন
1. Railway → সার্ভিস → **Settings → Networking → Custom Domain** → `thepipilika.com` লিখুন।
2. Railway যে DNS রেকর্ড (CNAME) দেখাবে, সেটা আপনার ডোমেইন কোম্পানির (Namecheap/GoDaddy ইত্যাদি) DNS এ যোগ করুন।
3. ১০ মিনিট থেকে কয়েক ঘণ্টার মধ্যে সাইট `https://thepipilika.com` এ চলবে (SSL অটো)।

## ৪. লাইভ করার আগে অবশ্যই
- `/staff-login` এ owner দিয়ে ঢুকে **Admin → Staff & roles** থেকে সব পাসওয়ার্ড বদলান।
- **Settings → Payments**: আসল bKash/Nagad নম্বর, ব্যাংক তথ্য, Bangla QR ছবি দিন।
- **Products / Gallery**: ডেমো ছবি বদলে আসল ছবি দিন।
- **Site editor**: লোগো, মেনু, ফুটার, হোম পেজ ঠিক করুন, তারপর Publish।
- কাস্টমার OTP পেতে SMS গেটওয়ে (যেমন BulkSMSBD) বা ইমেইল SMTP এর তথ্য Variables এ দিন (`SMS_API_URL`, `SMTP_*`)।
- চাইলে **Settings → Analytics**: GA4 / Facebook Pixel আইডি দিন।

## লগইন (ডেমো)
- স্টাফ: `owner@thepipilika.com` / `Pipilika@2026` (seller@, accounts@ একই পাসওয়ার্ড)
- কাস্টমার: `/login` এ `01711111111` (লাইভে কোড SMS এ যাবে)

কোনো ধাপে আটকে গেলে স্ক্রিনশট দিয়ে Claude কে জিজ্ঞেস করুন।
