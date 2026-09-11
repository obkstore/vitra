import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

/**
 * Route guard that requires an authenticated admin session.
 *
 * - Logged out → redirect to /auth with ?next=<current path> so the
 *   login page can return the user after signing in (same as RequireAuth).
 * - Logged in without the admin role → inline unauthorized notice with a
 *   link home (no redirect loop, no dead-end 404).
 * - Admin → renders children.
 *
 * Client-side only: the server re-checks the DB role on every
 * /api/admin/* call, so a stale local role can never leak admin data —
 * the dashboard surfaces the 403 notice if that happens.
 *
 * @param {{ children: import("react").ReactNode }} props Guard props.
 * @returns {JSX.Element}
 */
export default function RequireAdmin({ children }) {
  const { isAuthenticated, isAdmin, username } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  if (!isAdmin) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-black text-slate-900">غير مصرّح لك بالدخول</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            هذه الصفحة للمشرفين فقط. أنت مسجّل الدخول كـ {username ?? "مستخدم"}.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-energy-500 via-orange-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md"
          >
            العودة إلى الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
