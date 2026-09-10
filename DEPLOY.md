# VITRA — دليل التشغيل والنشر (Deploy Guide)

## 1. التشغيل محليًا (مجاني بالكامل)

```bash
cp .env.example .env   # ثم املأ القيم
npm install
npm run api            # الخادم على http://localhost:5000
npm run dev            # الواجهة على http://localhost:5173
```

- قاعدة البيانات محليًا: `MONGODB_URI=mongodb://127.0.0.1:27017/healthplan`
  (تحتاج MongoDB Community مثبتة، أو استخدم Atlas أدناه حتى محليًا).
- `npm run dev` يحوّل `/api` تلقائيًا إلى `localhost:5000` (انظر `vite.config.js`).

## 2. قاعدة البيانات السحابية المجانية (Atlas M0)

1. أنشئ cluster مجاني M0 (512MB — كافٍ لهذا الحجم).
2. أنشئ مستخدم قاعدة بيانات + IP Access (أو `0.0.0.0/0` للتجربة فقط).
3. ضع رابط الاتصال في `MONGODB_URI` محليًا وفي متغيرات Vercel لاحقًا.
4. لا حاجة لأي Migration: الفهارس (`username` الفريد، `userId` الفريد) تُبنى
   تلقائيًا عند أول اتصال، وتبنّي الشرائح القديمة يتم لمرة واحدة عند القراءة.

## 3. النشر على Vercel (الخطة المجانية Hobby تكفي)

```bash
npm i -g vercel
vercel --prod
```

متغيرات البيئة المطلوبة في لوحة Vercel (Settings → Environment Variables):
`MONGODB_URI` · `JWT_SECRET` (سلسلة عشوائية طويلة!) · `GEMINI_API_KEY` ·
`GEMINI_MODEL` (اختياري) · `JWT_EXPIRES_IN` (اختياري، الافتراضي `1d`).

**حدود Hobby (موثقة 2026):** المهلة القصوى 300 ثانية — إعداد
`maxDuration: 60` في `vercel.json` يعمل على المجانية **ولا يتطلب Pro**.
حدود الاستهلاك المجاني (نطاق/تنفيذ شهري) تكفي للعروض والتقييم؛ راقبها من
لوحة Vercel. التكلفة الوحيدة المحتملة عند التوسع: استهلاك Gemini
(حسب الاستخدام، مع شريحة مجانية) ثم ترقية Vercel عند تجاوز الحدود.

## 4. قائمة التحقق بعد النشر

- [ ] `GET /api/health` → `{ ok: true }` + ترويسات `Content-Security-Policy`
- [ ] `GET /api/auth/me` دون توكن → `401`
- [ ] تسجيل مستخدم جديد → يصل `/dashboard/<username>` المشتقة خادميًا
- [ ] حسابان على متصفح واحد: لا يتسرب أي مخطط بينهما
- [ ] الضيف: يولّد خطة دون حساب، و`GET /api/plans/mine` للضيف → `401`
- [ ] `npm run lint` + `npm test` + `npm run build` كلها خضراء قبل كل نشر
