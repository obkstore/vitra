import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext.jsx";
import { loginSchema, registerSchema } from "./authSchema.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";

/**
 * Single login/register form driven by a `mode` prop.
 * Shares fields and layout between both modes to avoid duplication.
 *
 * @param {{
 *  mode: "login"|"register",
 *  onSuccess?: (session: { token: string, username: string, assignedPage: string }) => void
 * }} props Form props.
 * @returns {JSX.Element}
 */
export default function AuthForm({ mode, onSuccess }) {
  const isRegister = mode === "register";
  const { login, register, isAuthLoading, authError, clearAuthError } = useAuth();

  const {
    register: registerField,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: { username: "", email: "", password: "" },
    mode: "onTouched",
  });

  // Clear stale values + server errors when switching modes.
  useEffect(() => {
    reset({ username: "", email: "", password: "" });
    clearAuthError();
  }, [mode, reset, clearAuthError]);

  /**
   * Submits credentials via AuthContext; session persistence happens
   * inside authService. Navigation is delegated to the parent via onSuccess.
   */
  async function onSubmit(data) {
    try {
      const session = isRegister
        ? await register({ username: data.username.trim(), email: data.email, password: data.password })
        : await login({ email: data.email, password: data.password });
      toast.success(isRegister ? "تم إنشاء الحساب بنجاح." : "تم تسجيل الدخول بنجاح.");
      onSuccess?.(session);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل الدخول. تحقق من البيانات وحاول مجدداً.");
    }
  }

  return (
    <form className="mt-7 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Input
        label={isRegister ? "اسم المستخدم" : "اسم المستخدم (اختياري)"}
        type="text"
        autoComplete="username"
        hint={isRegister ? undefined : "اختياري — تسجيل الدخول بالبريد الإلكتروني"}
        disabled={!isRegister}
        className={!isRegister ? "opacity-50 bg-slate-50" : undefined}
        error={isRegister ? errors.username?.message : undefined}
        {...registerField("username")}
      />
      <Input
        label="البريد الإلكتروني"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...registerField("email")}
      />
      <Input
        label="كلمة المرور"
        type="password"
        autoComplete={isRegister ? "new-password" : "current-password"}
        error={errors.password?.message}
        {...registerField("password")}
      />
      {authError && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {authError}
        </p>
      )}
      <Button type="submit" fullWidth isLoading={isAuthLoading}>
        {isRegister ? "إنشاء الحساب" : "تسجيل الدخول"}
      </Button>
    </form>
  );
}
