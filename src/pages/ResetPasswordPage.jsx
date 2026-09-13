import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import toast from "react-hot-toast";
import { BASE_URL } from "../services/apiConfig.js";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const { isAuthLoading, login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error("required");
      return;
    }

    const response = await fetch(`${BASE_URL}/auth/reset-password/${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (data.ok) {
      toast.success("كلمة المرور تم تحديثها بنجاح.");
      // Login with new password
      await login({ email: "", password: password });
      navigate("/auth");
    } else {
      toast.error(data.error || "فشل في إعادة تعيين كلمة المرور.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="mt-6 text-2xl font-black text-slate-900">إعادة تعيين كلمة المرور</h1>
        <p className="text-sm leading-relaxed text-slate-500">
          أدخل كلمة مرور جديدة لإنشاء حسابك.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label="كلمة المرور الجديدة"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={undefined}
          />

          <Button type="submit" fullWidth disabled={isAuthLoading}>
            تحديث كلمة المرور
          </Button>
        </form>

        <div className="mt-6 text-sm text-slate-500">
  <a href="/auth" className="underline text-brand-700 hover:text-brand-900">العودة إلى صفحة الدخول</a>
</div>
      </div>
    </div>
  );
}