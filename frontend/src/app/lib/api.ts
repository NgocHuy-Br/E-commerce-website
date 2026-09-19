export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

/** Đọc thông báo lỗi do GlobalExceptionHandler của backend trả về. */
async function readError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `Lỗi ${response.status}`;
  try {
    const parsed = JSON.parse(text) as {
      message?: string;
      detail?: string;
      fieldErrors?: Record<string, string>;
    };
    const fieldErrors = parsed.fieldErrors
      ? Object.entries(parsed.fieldErrors)
          .map(([field, message]) => `${field}: ${message}`)
          .join(", ")
      : "";
    return (
      [parsed.message ?? parsed.detail, fieldErrors]
        .filter(Boolean)
        .join(" — ") || text
    );
  } catch {
    return text;
  }
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, token } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    cache: "no-store",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readError(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export function query(
  params: Record<string, string | number | null | undefined>,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
}
