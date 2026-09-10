import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, ArrowLeft } from "lucide-react";
import PageWrapper from "../components/layout/PageWrapper";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import AuthForm from "../features/auth/AuthForm";
import { useAuth } from "../context/AuthContext";

/**
 * Only allow internal redirects from the login response.
 * The API returns the user's own diet-plan page (e.g. '/dashboard/user1');
 * anything else falls back to onboarding so a malicious value can never
 * send the browser off-site (open-redirect guard).
 */
export function resolveAssignedPage(page) {
	if (typeof page !== "string" || !page.startsWith("/") || page.startsWith("//")) {
		return "/onboarding";
	}
	return page;
}

export default function AuthPage() {
	const navigate = useNavigate();
	const [mode, setMode] = useState("login");
	const { isAuthenticated, assignedPage } = useAuth();

	const copy = {
		title: mode === "login" ? "مرحباً بعودتك" : "أنشئ حسابك في VITRA",
		subtitle: "احفظ خطتك وارجع إليها بسهولة على هذا الجهاز.",
		switchText: mode === "login" ? "جديد على VITRA؟" : "لديك حساب بالفعل?",
		switchAction: mode === "login" ? "إنشاء حساب" : "تسجيل الدخول",
	};

	// Already logged in: land each user on THEIR diet plan page.
	useEffect(() => {
		if (isAuthenticated) {
			navigate(resolveAssignedPage(assignedPage), { replace: true });
		}
	}, [isAuthenticated, assignedPage, navigate]);

	/**
	 * Handles a successful login/register session from AuthForm.
	 * Session persistence already happened inside authService via useAuth().
	 */
	function handleSuccess(session) {
		navigate(resolveAssignedPage(session?.assignedPage));
	}

	return (
		<PageWrapper maxWidth="md" withHeader={false}>
			<div dir="rtl" className="min-h-screen flex items-center justify-center px-4 py-10">
				<Card className="w-full max-w-md border border-brand-100 bg-white/95 shadow-soft">
					<div className="text-center">
						<div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
							{mode === "login" ? <LogIn /> : <UserPlus />}
						</div>
						<h1 className="mt-5 text-2xl font-black text-slate-900">{copy.title}</h1>
						<p className="mt-2 text-sm leading-relaxed text-slate-500">{copy.subtitle}</p>
					</div>
					<AuthForm mode={mode} onSuccess={handleSuccess} />
					<div className="mt-5 flex flex-col gap-3 text-center">
						<button type="button" className="text-sm font-semibold text-brand-700 hover:text-brand-900" onClick={() => setMode(mode === "login" ? "register" : "login")}>
							{copy.switchText} {copy.switchAction}
						</button>
						<Button variant="secondary" onClick={() => navigate("/onboarding")}>المتابعة كضيف</Button>
						<button type="button" className="inline-flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-800" onClick={() => navigate("/")}>
							<ArrowLeft className="h-4 w-4" /> الرئيسية
						</button>
					</div>
				</Card>
			</div>
		</PageWrapper>
	);
}
