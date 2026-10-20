# Hostinger (Business Web Hosting) এ সাইট চালু করার ধাপ

আপনার প্ল্যানে Next.js চলে। শুধু ডাটাবেস বাইরে রাখতে হবে (Hostinger এ PostgreSQL নেই)। আমরা **Neon** ব্যবহার করব, যেটা ফ্রি।

## ধাপ ১: ফ্রি ডাটাবেস (Neon)
1. **neon.tech** এ যান, Google দিয়ে Sign up করুন।
2. **Create project** চাপুন। নাম দিন `pipilika`, Region দিন **Singapore** (বাংলাদেশের কাছে)।
3. **Connection string** কপি করুন। দেখতে এরকম হবে:
   `postgresql://user:pass@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
   এটা কোথাও সেভ করে রাখুন।

## ধাপ ২: Hostinger এ Node.js অ্যাপ বানান
1. hPanel এ যান: **Websites → Add website → Node.js Apps** (বা "Deploy Node.js app")।
2. **Import Git repository** (GitHub) বাছুন → GitHub একাউন্ট কানেক্ট করুন → `enamul-mahian/pipilika` repo, branch `main` বাছুন।
   - (GitHub না চাইলে **Upload files** দিয়ে `pipilika-site.zip` আপলোডও করা যায়।)
3. সেটিংস এভাবে দিন:
   - Framework: **Next.js**
   - Node version: **22.x**
   - Package manager: **npm**
   - Build command: `npm run build`
   - Start command: `npm start`
4. **Environment variables** এ এগুলো যোগ করুন:

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon থেকে কপি করা লিংক |
| `AUTH_SECRET` | যেকোনো লম্বা গোপন লেখা (৪০+ অক্ষর, যেমন কয়েকটা শব্দ আর সংখ্যা মিলিয়ে) |
| `NEXT_PUBLIC_SITE_URL` | `https://thepipilika.com` |
| `OTP_DEV_SHOW` | `true` (শুরুতে টেস্টের জন্য; SMS সেটআপের পর `false` করবেন) |

5. **Deploy** চাপুন। প্রথমবার ৩–৮ মিনিট লাগতে পারে।
   - প্রথম deploy এ ডাটাবেস নিজে থেকে তৈরি হবে এবং ডেমো প্রোডাক্ট, পেজ আর লগইন বসে যাবে।
   - পরের deploy গুলোতে আপনার ডাটা মুছবে না।

   - GitHub দিয়ে কানেক্ট করলে, পরে কোড আপডেট হলে Hostinger এ **Redeploy** চাপলেই নতুন সাইট চলে আসবে (অটো-deploy অপশন থাকলে সেটা চালু রাখুন)।

## ধাপ ৩: ডোমেইন
অ্যাপের সেটিংসে **Domain** থেকে `thepipilika.com` যুক্ত করুন। ডোমেইন Hostinger এ থাকলে DNS নিজে থেকে ঠিক হয়ে যাবে। SSL ফ্রি।

## ধাপ ৪: দেখে নিন
- সাইট: `https://thepipilika.com`
- অ্যাডমিন: `https://thepipilika.com/staff-login`
  - লগইন: `owner@thepipilika.com`, পাসওয়ার্ড `Pipilika@2026`
  - **ঢুকেই Staff & roles থেকে পাসওয়ার্ড বদলান।**

## খেয়াল রাখবেন
- কাস্টমারের আপলোড করা ছবি সার্ভারের `storage` ফোল্ডারে থাকে। নতুন zip দিয়ে আবার deploy করলে এগুলো মুছে যেতে পারে। পরে চাইলে Cloudflare R2 (ফ্রি) সেটআপ করে দেব, তখন ছবি কখনো হারাবে না।
- কাস্টমার যেন SMS এ OTP পায়, সেজন্য SMS কোম্পানির (যেমন BulkSMSBD) API লিংক `SMS_API_URL` এ দিতে হবে। তারপর `OTP_DEV_SHOW` এর মান `false` করবেন।

## Deploy ফেল করলে
Build log এর শেষের ২০ লাইনের স্ক্রিনশট পাঠান, আমি ঠিক করে দেব।
