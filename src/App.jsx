import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import usePlan from "./context/PlanContext";
import { useAuth } from "./context/AuthContext";
import RequireAuth from "./components/auth/RequireAuth";
import RequireAdmin from "./components/auth/RequireAdmin";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

function LoadingFallback() {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center gap-4">
			<div className="h-12 w-12 rounded-full bg-green-500 animate-pulse" />
			<p className="text-sm text-slate-700">جاري التحميل...</p>
		</div>
	);
}

/**
 * Blocks direct access to results unless the CURRENT identity owns a
 * generated plan. hasGenerated alone is not enough: plans are namespaced
 * per user, so the loaded plan must belong to whoever is signed in
 * (or to the guest slot when logged out).
 * @param {{ children: import("react").ReactNode }} props
 * @returns {JSX.Element}
 */
function ProtectedResultsRoute({ children }) {
	const { hasGenerated, planOwner } = usePlan();
	const { username } = useAuth();

	if (!hasGenerated || planOwner !== (username ?? null)) {
		return <Navigate to="/onboarding" replace />;
	}

	return children;
}

function App() {
	return (
		<div className="min-h-screen bg-slate-50 font-body">
			<Suspense fallback={<LoadingFallback />}>
				<Routes>
					<Route path="/" element={<LandingPage />} />
					<Route path="/auth" element={<AuthPage />} />
					{/* Per-user diet plan landing page — login redirects here via assignedPage. */}
					<Route
						path="/dashboard/:username"
						element={
							<RequireAuth requireOwnership>
								<DashboardPage />
							</RequireAuth>
						}
					/>
					<Route path="/onboarding" element={<OnboardingPage />} />
				<Route
					path="/results"
					element={
						<ProtectedResultsRoute>
							<ResultsPage />
						</ProtectedResultsRoute>
					}
				/>
				{/* Admin-only consultation request management. */}
				<Route
					path="/admin"
					element={
						<RequireAdmin>
							<AdminDashboard />
						</RequireAdmin>
					}
				/>
					<Route path="/404" element={<NotFoundPage />} />
					<Route path="*" element={<Navigate to="/404" replace />} />
				</Routes>
			</Suspense>
		</div>
	);
}

export default App;
