import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import PageWrapper from "../components/layout/PageWrapper";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";

/**
 * Admin landing page. Welcome screen for admin users: shows the admin's
 * username, a link to the consultation requests dashboard (/admin), and
 * logout. No diet plan buttons, no consultation form. Access control is
 * enforced by the route guard (not here); this page stays presentational.
 */
export default function AdminHomePage() {
	const navigate = useNavigate();
	const { username, logout } = useAuth();

	function handleLogout() {
		logout();
		navigate("/auth");
	}

	return (
		<PageWrapper maxWidth="md">
			<div dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 py-10">
				<Card className="w-full max-w-md border border-brand-100 bg-white/95 shadow-soft">
					<div className="text-center">
						<div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-mental-100 text-mental-700">
							<ShieldCheck className="h-7 w-7" />
						</div>
						<h1 className="mt-4 text-2xl font-black text-slate-900">
							مرحباً {username ?? "مشرف"}
						</h1>
						<p className="mt-2 text-sm leading-relaxed text-slate-500">
							هذه صفحتك الإدارية. تابع طلبات الاستشارات وحدّث حالتها من لوحة المشرف.
						</p>
					</div>
					<div className="mt-6 flex flex-col gap-3">
						<Button onClick={() => navigate("/admin")}>لوحة طلبات الاستشارات</Button>
						<Button variant="ghost" onClick={handleLogout}>
							تسجيل الخروج
						</Button>
					</div>
				</Card>
			</div>
		</PageWrapper>
	);
}
