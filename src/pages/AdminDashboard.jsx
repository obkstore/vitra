import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Inbox, MessageCircle, RefreshCw } from "lucide-react";
import PageWrapper from "../components/layout/PageWrapper.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import {
  fetchConsultationRequests,
  updateConsultationRequestStatus,
} from "../services/consultationService.js";
import {
  ORDERED_STATUSES,
  STATUS_META,
  formatRequestDate,
  getRequestPhone,
  getRequesterName,
  getWhatsAppLink,
} from "../features/consultation/consultationStatus.js";

const PAGE_LIMIT = 20;

/**
 * Admin-only dashboard listing consultation requests.
 * Data via plain useState + useEffect (no React Query). Status changes are
 * confirmed: the row updates only after PATCH resolves, then the list
 * refetches so filter/total stay consistent with the server.
 *
 * @returns {JSX.Element}
 */
export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchConsultationRequests({
        status: statusFilter,
        page,
        limit: PAGE_LIMIT,
      });
      setRequests(data.requests);
      setTotal(data.total);
    } catch (err) {
      setRequests([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : "تعذر تحميل الطلبات.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadRequests();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRequests]);

  function handleFilterChange(event) {
    setStatusFilter(event.target.value);
    setPage(1);
    setExpandedId(null);
  }

  /**
   * Persists a status change and refreshes from the server.
   * The list refetches after a successful PATCH so a row that no longer
   * matches the active filter disappears and the total stays accurate.
   */
  async function handleStatusChange(id, nextStatus) {
    setUpdatingId(id);
    try {
      await updateConsultationRequestStatus(id, nextStatus);
      toast.success("تم تحديث الحالة بنجاح.");
      await loadRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر تحديث الحالة.");
    } finally {
      setUpdatingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <PageWrapper maxWidth="xl">
      <div dir="rtl" className="flex flex-col gap-5 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">لوحة المشرف</h1>
            <p className="mt-1 text-sm text-slate-500">
              طلبات الاستشارات الصحية — {total} {total === 1 ? "طلب" : "طلبات"}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadRequests} isLoading={isLoading}>
            {!isLoading && <RefreshCw className="h-4 w-4" />}
            تحديث
          </Button>
        </div>

        <Card className="border border-brand-100 bg-white/95 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="admin-status-filter" className="text-sm font-semibold text-slate-700">
              تصفية حسب الحالة:
            </label>
            <select
              id="admin-status-filter"
              value={statusFilter}
              onChange={handleFilterChange}
              disabled={isLoading}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 focus:border-mental-500 focus:outline-none focus:ring-2 focus:ring-mental-500 disabled:opacity-50"
            >
              <option value="all">الكل</option>
              {ORDERED_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_META[status].label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {isLoading ? (
          <Card className="flex items-center justify-center gap-3 border border-slate-100 bg-white py-14 shadow-soft">
            <Spinner size="lg" />
            <p className="text-sm text-slate-500">جاري تحميل الطلبات…</p>
          </Card>
        ) : error ? (
          <Card className="border border-red-100 bg-white py-10 text-center shadow-soft">
            <p role="alert" className="text-sm font-semibold text-red-600">
              {error}
            </p>
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={loadRequests}>
                إعادة المحاولة
              </Button>
            </div>
          </Card>
        ) : requests.length === 0 ? (
          <Card className="border border-slate-100 bg-white py-14 text-center shadow-soft">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">لا توجد طلبات بهذه الحالة.</p>
            <p className="mt-1 text-xs text-slate-400">جرّب تصفية مختلفة أو أعد التحميل لاحقاً.</p>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <Card padding="none" className="hidden overflow-hidden border border-slate-100 bg-white shadow-soft md:block">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">البريد</th>
                    <th scope="col" className="px-4 py-3 font-semibold">الهاتف / واتساب</th>
                    <th scope="col" className="px-4 py-3 font-semibold">المستخدم</th>
                    <th scope="col" className="px-4 py-3 font-semibold">الرسالة</th>
                    <th scope="col" className="px-4 py-3 font-semibold">التاريخ</th>
                    <th scope="col" className="px-4 py-3 font-semibold">الحالة</th>
                    <th scope="col" className="px-4 py-3 font-semibold">تغيير الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const meta = STATUS_META[request.status];
                    const isUpdating = updatingId === request._id;
                    const whatsAppLink = getWhatsAppLink(request);
                    return (
                      <tr key={request._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                        <td dir="ltr" className="max-w-[11rem] px-4 py-3 text-left align-top text-slate-700 break-all">
                          {request.email}
                        </td>
                        <td dir="ltr" className="px-4 py-3 text-left align-top whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-slate-700">
                            {getRequestPhone(request)}
                            {whatsAppLink && (
                              <a
                                href={whatsAppLink}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`مراسلة ${request.email} واتساب`}
                                title="مراسلة واتساب"
                                className="inline-flex items-center justify-center rounded-lg bg-brand-100 p-1.5 text-brand-800 transition-colors hover:bg-brand-200"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top font-semibold text-slate-800">
                          {getRequesterName(request)}
                        </td>
                        <td className="max-w-md px-4 py-3 align-top leading-relaxed text-slate-600">
                          {request.message}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap text-xs text-slate-400">
                          {formatRequestDate(request.createdAt)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${meta?.badgeClass ?? "bg-slate-100 text-slate-600"}`}
                          >
                            {meta?.label ?? request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <select
                            value={request.status}
                            disabled={isUpdating}
                            onChange={(event) => handleStatusChange(request._id, event.target.value)}
                            aria-label={`تغيير حالة الطلب من ${request.email}`}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-mental-500 focus:outline-none focus:ring-2 focus:ring-mental-500 disabled:opacity-50"
                          >
                            {ORDERED_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {STATUS_META[status].label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            {/* Mobile stacked cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {requests.map((request) => {
                const meta = STATUS_META[request.status];
                const isUpdating = updatingId === request._id;
                const isExpanded = expandedId === request._id;
                const whatsAppLink = getWhatsAppLink(request);
                return (
                  <Card key={request._id} className="border border-slate-100 bg-white shadow-soft">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${meta?.badgeClass ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {meta?.label ?? request.status}
                      </span>
                      <span className="text-xs text-slate-400">{formatRequestDate(request.createdAt)}</span>
                    </div>
                    <p dir="ltr" className="mt-3 text-left text-sm font-semibold text-slate-800 break-all">
                      {request.email}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">من: {getRequesterName(request)}</p>
                    <p dir="ltr" className="mt-1.5 flex items-center gap-1.5 text-left text-sm text-slate-700">
                      <span>{getRequestPhone(request)}</span>
                      {whatsAppLink && (
                        <a
                          href={whatsAppLink}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`مراسلة ${request.email} واتساب`}
                          title="مراسلة واتساب"
                          className="inline-flex items-center justify-center rounded-lg bg-brand-100 p-1.5 text-brand-800 transition-colors hover:bg-brand-200"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                    </p>
                    <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${isExpanded ? "" : "line-clamp-3"}`}>
                      {request.message}
                    </p>
                    {request.message?.length > 140 && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : request._id)}
                        className="mt-1 text-xs font-semibold text-brand-700 hover:text-brand-900"
                      >
                        {isExpanded ? "إخفاء" : "عرض المزيد"}
                      </button>
                    )}
                    <select
                      value={request.status}
                      disabled={isUpdating}
                      onChange={(event) => handleStatusChange(request._id, event.target.value)}
                      aria-label={`تغيير حالة الطلب من ${request.email}`}
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-mental-500 focus:outline-none focus:ring-2 focus:ring-mental-500 disabled:opacity-50"
                    >
                      {ORDERED_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_META[status].label}
                        </option>
                      ))}
                    </select>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                صفحة {page} من {totalPages} • إجمالي {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  السابق
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  التالي
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
