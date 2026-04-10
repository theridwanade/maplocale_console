export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface ApiRequestOptions extends Omit<
  RequestInit,
  "body" | "method"
> {
  method?: HttpMethod;
  query?: QueryParams;
  body?: unknown;
  baseUrl?: string;
  parseAs?: "json" | "text" | "blob" | "arrayBuffer" | "raw";
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  data: unknown;
  url: string;

  constructor(
    message: string,
    details: { status: number; statusText: string; data: unknown; url: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = details.status;
    this.statusText = details.statusText;
    this.data = details.data;
    this.url = details.url;
  }
}

const extractErrorMessage = (data: unknown): string | null => {
  if (typeof data === "string" && data.trim().length > 0) {
    return data;
  }

  if (data && typeof data === "object") {
    const candidateKeys = ["message", "error", "detail", "title"] as const;

    for (const key of candidateKeys) {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
  }

  return null;
};

export interface ApiClientConfig {
  baseUrl?: string;
  credentials?: RequestCredentials;
  defaultHeaders?: HeadersInit;
}

const isBodyInit = (value: unknown): value is BodyInit => {
  return (
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    typeof value === "string"
  );
};

const buildUrl = (
  baseUrl: string,
  path: string,
  query?: QueryParams,
): string => {
  const sanitizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("http")
    ? path
    : `${sanitizedBase}/${path.replace(/^\//, "")}`;
  const url = new URL(normalizedPath, window.location.origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

const parseErrorPayload = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  if (contentType.includes("text/")) {
    try {
      return await response.text();
    } catch {
      return null;
    }
  }

  return null;
};

const parseSuccessPayload = async <T>(
  response: Response,
  parseAs: ApiRequestOptions["parseAs"],
): Promise<T> => {
  if (parseAs === "raw") {
    return response as T;
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  if (parseAs === "text") {
    return (await response.text()) as T;
  }

  if (parseAs === "blob") {
    return (await response.blob()) as T;
  }

  if (parseAs === "arrayBuffer") {
    return (await response.arrayBuffer()) as T;
  }

  return (await response.json()) as T;
};

export const createApiClient = (config?: ApiClientConfig) => {
  const baseUrl = config?.baseUrl ?? import.meta.env.VITE_PUBLIC_API_URL ?? "";
  const defaultCredentials = config?.credentials ?? "include";
  const defaultHeaders = config?.defaultHeaders;

  const request = async <T = unknown>(
    path: string,
    options?: ApiRequestOptions,
  ): Promise<T> => {
    const method = options?.method ?? "GET";
    const url = buildUrl(options?.baseUrl ?? baseUrl, path, options?.query);

    const headers = new Headers(defaultHeaders);

    if (options?.headers) {
      new Headers(options.headers).forEach((value, key) =>
        headers.set(key, value),
      );
    }

    let requestBody: BodyInit | null | undefined;
    if (options?.body !== undefined && options?.body !== null) {
      if (isBodyInit(options.body)) {
        requestBody = options.body;
      } else {
        headers.set("Content-Type", "application/json");
        requestBody = JSON.stringify(options.body);
      }
    }

    let response: Response;

    try {
      response = await fetch(url, {
        method,
        body: requestBody,
        credentials: options?.credentials ?? defaultCredentials,
        headers,
        mode: options?.mode,
        cache: options?.cache,
        redirect: options?.redirect,
        referrerPolicy: options?.referrerPolicy,
        signal: options?.signal,
        keepalive: options?.keepalive,
        integrity: options?.integrity,
        priority: options?.priority,
      });
    } catch (error) {
      throw new ApiError(
        "Network request failed. Please check your connection and try again.",
        {
          status: 0,
          statusText: "NETWORK_ERROR",
          data: error,
          url,
        },
      );
    }

    if (!response.ok) {
      const data = await parseErrorPayload(response);
      const message =
        extractErrorMessage(data) ??
        `Request failed with status ${response.status}`;

      throw new ApiError(message, {
        status: response.status,
        statusText: response.statusText,
        data,
        url,
      });
    }

    return parseSuccessPayload<T>(response, options?.parseAs ?? "json");
  };

  return {
    request,
    get: <T = unknown>(
      path: string,
      options?: Omit<ApiRequestOptions, "method">,
    ) => request<T>(path, { ...options, method: "GET" }),
    post: <T = unknown>(
      path: string,
      body?: unknown,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) => request<T>(path, { ...options, method: "POST", body }),
    put: <T = unknown>(
      path: string,
      body?: unknown,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) => request<T>(path, { ...options, method: "PUT", body }),
    patch: <T = unknown>(
      path: string,
      body?: unknown,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) => request<T>(path, { ...options, method: "PATCH", body }),
    update: <T = unknown>(
      path: string,
      body?: unknown,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) => request<T>(path, { ...options, method: "PATCH", body }),
    delete: <T = unknown>(
      path: string,
      options?: Omit<ApiRequestOptions, "method">,
    ) => request<T>(path, { ...options, method: "DELETE" }),
    head: <T = unknown>(
      path: string,
      options?: Omit<ApiRequestOptions, "method">,
    ) => request<T>(path, { ...options, method: "HEAD" }),
    options: <T = unknown>(
      path: string,
      options?: Omit<ApiRequestOptions, "method">,
    ) => request<T>(path, { ...options, method: "OPTIONS" }),
  };
};

export const api = createApiClient();
