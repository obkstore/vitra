import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

/**
 * Only allow internal redirects to a stored assignedPage.
 * Mirrors resolveAssignedPage() in src/pages/AuthPage.jsx: anything that
 * is not an internal path falls back to /404 so a bad stored value can
 * never send the browser off-site (open-redirect guard).
 * @param {unknown} page Stored assignedPage value.
 * @returns {string} Safe internal route.
 */
function resolveOwnPage(page) {
  if (typeof page !== "string" || !page.startsWith("/") || page.startsWith("//")) {
    return "/404";
  }
  return page;
}

/**
 * Route guard that requires authentication and optionally ownership.
 *
 * - Logged out → redirect to /auth with ?next=<current path> so the
 *   login page can return the user after signing in.
 * - Logged in but visiting another user's dashboard (requireOwnership +
 *   :username param mismatch) → smooth redirect back to their OWN
 *   assignedPage instead of a dead-end 404.
 * - Self-loop guard: if their OWN page is the page they are already on
 *   (stale/mismatched stored assignedPage), a <Navigate> would bounce to
 *   the same URL forever and render permanent blank. Render an inline
 *   notice with a link instead.
 *
 * @param {{ children: import("react").ReactNode, requireOwnership?: boolean }} props Guard props.
 * @returns {JSX.Element}
 */
export default function RequireAuth({ children, requireOwnership = false }) {
  const { isAuthenticated, username, assignedPage } = useAuth();
  const location = useLocation();
  // Always called (hooks rules); only enforced when requireOwnership is true.
  const params = useParams();

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  if (requireOwnership) {
    const routeUsername = params?.username;
    if (typeof routeUsername === "string" && routeUsername && routeUsername !== username) {
      const ownPage = resolveOwnPage(assignedPage);
      if (ownPage === location.pathname) {
        return (
          <div dir="rtl" className="min-h-screen flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md text-center rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
              <h1 className="text-xl font-black text-slate-900">هذه الصفحة ليست صفحتك</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                أنت مسجّل الدخول كـ {username ?? "مستخدم"}.
              </p>
              <Link
                to={ownPage}
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-energy-500 via-orange-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md"
              >
                العودة إلى صفحتي
              </Link>
            </div>
          </div>
        );
      }
      return <Navigate to={ownPage} replace />;
    }
  }

  return children;
}
