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
    defaultValues: { username: "", password: "" },
    mode: "onTouched",
  });

  // Clear stale values + server errors when switching modes.
  useEffect(() => {
    reset({ username: "", password: "" });
    clearAuthError();
  }, [mode, reset, clearAuthError]);

  /**
   * Submits credentials via AuthContext; session persistence happens
   * inside authService. Navigation is delegated to the parent via onSuccess.
   */
  async function onSubmit(data) {
    try {
      const session = isRegister
        ? await register({ username: data.username.trim(), password: data.password })
        : await login({ username: data.username.trim(), password: data.password });
      toast.success(isRegister ? "تم إنشاء الحساب بنجاح." : "تم تسجيل الدخول بنجاح.");
      onSuccess?.(session);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل الدخول. تحقق من البيانات وحاول مجدداً.");
    }
  }

  return (
    <form className="mt-7 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Input
        label="اسم المستخدم"
        type="text"
        autoComplete="username"
        error={errors.username?.message}
        {...registerField("username")}
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
