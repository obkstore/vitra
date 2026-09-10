# VITRA

تطبيق عربي لتوليد خطط تغذية وتمارين مخصصة.

## التشغيل المحلي

1. انسخ `.env.example` إلى `.env`.
2. اترك `AI_PROVIDER=mock` للتجربة المحلية دون مفتاح.
3. شغّل `npm install` ثم `npm run dev`.

للتجربة مع Gemini، شغّل runtime يدعم مجلد `api` (مثل `vercel dev`) واضبط
`AI_PROVIDER=gemini` و`GEMINI_API_KEY`. لا تستخدم `VITE_` مع أي مفتاح سري.

## التحقق

- `npm test`
- `npm run lint`
- `npm run build`

التطبيق إرشادي وليس بديلاً عن الطبيب أو أخصائي التغذية.
