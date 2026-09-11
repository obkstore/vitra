import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Mail, SendHorizontal } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { submitConsultationRequest } from "../../services/consultationService.js";
import { consultationSchema } from "./consultationSchema.js";

/**
 * Consultation request form for logged-in users.
 * Email is fully editable (no account email exists on the User model to
 * prefill from); the message is the user's health or diet question.
 * Submit calls POST /api/consultation with loading + toast feedback.
 *
 * @returns {JSX.Element}
 */
export default function ConsultationForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(consultationSchema),
    defaultValues: { email: "", message: "" },
    mode: "onTouched",
  });

  /**
   * Submits email + message; owner comes from the verified JWT server-side.
   * On success the email is kept and only the message clears, so follow-up
   * questions don't require retyping the address.
   */
  async function onSubmit(data) {
    try {
      await submitConsultationRequest({
        email: data.email.trim(),
        message: data.message.trim(),
      });
      toast.success("تم إرسال طلبك بنجاح. سنرد عليك قريباً.");
      reset({ email: data.email, message: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال الطلب. حاول مجدداً.");
    }
  }

  return (
    <Card className="w-full border border-brand-100 bg-white/95 shadow-soft">
      <Card.Header>
        <Card.Title>اطلب استشارة صحية</Card.Title>
      </Card.Header>
      <Card.Body>
        <p className="mb-4 text-sm leading-relaxed text-slate-500">
          أرسل سؤالك الصحي أو الغذائي وسيرد عليك المشرف أو المدرّب على بريدك الإلكتروني.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label="البريد الإلكتروني"
            type="email"
            autoComplete="email"
            dir="ltr"
            placeholder="name@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register("email")}
          />
          <div className="w-full">
            <label htmlFor="consultation-message" className="mb-1.5 block text-sm font-medium text-slate-700">
              رسالتك
            </label>
            <textarea
              id="consultation-message"
              rows={5}
              maxLength={5000}
              placeholder="اكتب سؤالك الصحي أو الغذائي هنا (10 أحرف على الأقل)…"
              aria-invalid={Boolean(errors.message) || undefined}
              aria-describedby={errors.message ? "consultation-message-error" : undefined}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-mental-500 focus:outline-none focus:ring-2 focus:ring-mental-500 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:border-rose-500 aria-[invalid=true]:focus:ring-rose-500"
              {...register("message")}
            />
            {errors.message?.message && (
              <p id="consultation-message-error" className="mt-1 text-xs text-rose-500">
                ⚠ {errors.message.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            fullWidth
            isLoading={isSubmitting}
            leftIcon={<SendHorizontal className="h-4 w-4" />}
          >
            إرسال الطلب
          </Button>
        </form>
      </Card.Body>
    </Card>
  );
}
