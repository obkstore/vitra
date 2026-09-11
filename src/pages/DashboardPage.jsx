import { Link, useNavigate, useParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import PageWrapper from "../components/layout/PageWrapper";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import ConsultationForm from "../features/consultation/ConsultationForm";

/**
 * Per-user landing page. After login the frontend redirects here using the
 * `assignedPage` value from the login response (e.g. '/dashboard/user1'),
 * so each user lands on their OWN diet plan page.
 * Ownership is enforced by RequireAuth; this page stays presentational.
 */
export default function DashboardPage() {
	const { username: routeUsername } = useParams();
	const navigate = useNavigate();
	const { username: authUsername, isAdmin, logout } = useAuth();
	const displayName = routeUsername ?? authUsername ?? "";

	function handleLogout() {
		logout();
		navigate("/auth");
	}

	return (
		<PageWrapper maxWidth="md">
			<div dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 py-10">
				<Card className="w-full max-w-md border border-brand-100 bg-white/95 shadow-soft">
					<div className="text-center">
						<h1 className="text-2xl font-black text-slate-900">
							خطة {displayName}
						</h1>
						<p className="mt-2 text-sm leading-relaxed text-slate-500">
							هذه صفحتك الغذائية الخاصة. تابع من هنا إلى إعداد خطتك أو نتائجك.
						</p>
					</div>
					<div className="mt-6 flex flex-col gap-3">
						<Button onClick={() => navigate("/onboarding")}>إعداد الخطة</Button>
						<Button variant="secondary" onClick={() => navigate("/results")}>
							عرض النتائج
						</Button>
						{isAdmin && (
							<Link
								to="/admin"
								className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-mental-400 px-5 py-2.5 text-sm font-semibold text-mental-700 transition-colors hover:bg-mental-50"
							>
								<ShieldCheck className="h-4 w-4" />
								لوحة المشرف
							</Link>
						)}
						<Button variant="ghost" onClick={handleLogout}>
							تسجيل الخروج
						</Button>
					</div>
				</Card>
				<div className="w-full max-w-md">
					<ConsultationForm />
				</div>
			</div>
		</PageWrapper>
	);
}
