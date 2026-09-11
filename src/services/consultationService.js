import axios from "axios";
import apiClient from "./apiClient.js";

/**
 * Client for the consultation request system.
 * - POST /api/consultation (any logged-in user; owner derived from JWT)
 * - GET /api/admin/requests (admin only; supports status filter + paging)
 * - PATCH /api/admin/requests/:id (admin only; status transitions)
 * Auth header injection is owned by apiClient — callers never pass tokens.
 */

export const CONSULTATION_STATUSES = ["pending", "forwarded_to_trainer", "resolved"];

/**
 * Normalizes any axios/network failure into a clear Arabic Error enriched
 * with the HTTP status code.
 * @param {unknown} error Caught error.
 * @param {string} fallback Fallback Arabic message.
 * @returns {never} Always throws.
 */
function normalizeConsultationError(error, fallback) {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    const serverError = error.response?.data?.error;

    if (!error.response) {
      throw Object.assign(new Error("تعذر الاتصال بالخادم. تحقق من اتصالك وحاول مجدداً."), {
        statusCode,
      });
    }
    if (statusCode === 401) {
      throw Object.assign(new Error("انتهت الجلسة. سجّل الدخول مجدداً."), { statusCode });
    }
    if (statusCode === 403) {
      throw Object.assign(new Error("هذه الصفحة للمشرفين فقط."), { statusCode });
    }
    if (typeof serverError === "string" && serverError) {
      throw Object.assign(new Error(serverError), { statusCode });
    }
    if (typeof statusCode === "number" && statusCode >= 500) {
      throw Object.assign(new Error("خطأ في الخادم. حاول لاحقاً."), { statusCode });
    }
    throw Object.assign(new Error(fallback), { statusCode });
  }
  throw error instanceof Error ? error : new Error(fallback);
}

/**
 * Submits a consultation request for the logged-in user.
 * @param {{ email: string, phone: string, message: string }} data Contact email + WhatsApp number + health message.
 * @returns {Promise<object>} Created request document.
 */
export async function submitConsultationRequest(data) {
  const email = String(data?.email ?? "").trim();
  const phone = String(data?.phone ?? "").trim();
  const message = String(data?.message ?? "").trim();

  if (!email || !phone || !message) {
    throw new Error("يرجى إدخال البريد الإلكتروني ورقم الهاتف ورسالتك.");
  }

  try {
    const response = await apiClient.post("/api/consultation", { email, phone, message });
    if (response.data?.ok !== true || !response.data?.request) {
      throw new Error(response.data?.error ?? "تعذر إرسال الطلب. حاول مجدداً.");
    }
    return response.data.request;
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) throw error;
    return normalizeConsultationError(error, "تعذر إرسال الطلب. حاول مجدداً.");
  }
}

/**
 * Lists consultation requests (admin only).
 * @param {{ status?: string, page?: number, limit?: number }} [options] Filter + paging.
 * @returns {Promise<{ requests: Array<object>, total: number, page: number, limit: number }>} Page of requests.
 */
export async function fetchConsultationRequests(options = {}) {
  const params = {};
  if (options.status && options.status !== "all") params.status = options.status;
  if (options.page) params.page = options.page;
  if (options.limit) params.limit = options.limit;

  try {
    const response = await apiClient.get("/api/admin/requests", { params });
    if (response.data?.ok !== true || !Array.isArray(response.data?.requests)) {
      throw new Error(response.data?.error ?? "تعذر تحميل الطلبات.");
    }
    return {
      requests: response.data.requests,
      total: typeof response.data.total === "number" ? response.data.total : response.data.requests.length,
      page: typeof response.data.page === "number" ? response.data.page : 1,
      limit: typeof response.data.limit === "number" ? response.data.limit : response.data.requests.length,
    };
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) throw error;
    return normalizeConsultationError(error, "تعذر تحميل الطلبات. حاول مجدداً.");
  }
}

/**
 * Updates a request's status (admin only). Waits for the server response —
 * callers must update UI from the returned document (no optimistic writes).
 * @param {string} id Request id.
 * @param {string} status New status (pending | forwarded_to_trainer | resolved).
 * @returns {Promise<object>} Updated request document.
 */
export async function updateConsultationRequestStatus(id, status) {
  if (!id) {
    throw new Error("معرّف الطلب مطلوب.");
  }
  if (!CONSULTATION_STATUSES.includes(status)) {
    throw new Error("الحالة الجديدة غير صالحة.");
  }

  try {
    const response = await apiClient.patch(`/api/admin/requests/${id}`, { status });
    if (response.data?.ok !== true || !response.data?.request) {
      throw new Error(response.data?.error ?? "تعذر تحديث الحالة.");
    }
    return response.data.request;
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) throw error;
    return normalizeConsultationError(error, "تعذر تحديث الحالة. حاول مجدداً.");
  }
}

export const consultationService = {
  CONSULTATION_STATUSES,
  submitConsultationRequest,
  fetchConsultationRequests,
  updateConsultationRequestStatus,
};

export default consultationService;
