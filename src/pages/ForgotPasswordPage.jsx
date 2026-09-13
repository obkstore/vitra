import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { BASE_URL } from "../services/apiConfig.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();
  const { isAuthLoading } = useAuth();

const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSending) return;
    setIsSending(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "تعذر إرسال رابط إعادة الضبط. حاول مجدداً.");
      }

      toast.success(data.message ?? "إذا كان حسابك موجوداً، تم إرسال رابط إعادة ضبط كلمة المرور إلى بريدك الإلكتروني.");

      // Delay navigation so the success toast stays visible
      setTimeout(() => navigate("/auth"), 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر إرسال رابط إعادة الضبط. حاول مجدداً.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <i className="ri-arrow-left-line text-2xl" /> {/* Using a generic back icon */}
        </div>
        <h1 className="mt-6 text-2xl font-black text-slate-900">إعادة ضبط كلمة المرور</h1>
        <p className="text-sm leading-relaxed text-slate-500">
          أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label="البريد الإلكتروني"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={undefined}
          />

          <Button type="submit" fullWidth disabled={isAuthLoading || isSending}>
            {isSending ? "جاري الإرسال..." : "إرسال رابط re-set"}
          </Button>
        </form>

        <div className="mt-6 text-sm text-slate-500">
  <a href="/auth" className="underline text-brand-700 hover:text-brand-900">العودة إلى صفحة الدخول</a>
</div>
      </div>
    </div>
  );
}