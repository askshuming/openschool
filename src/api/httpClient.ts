export class HttpError extends Error {
  status: number;
  errorCode?: string;
  requestId?: string;
  details?: unknown;

  constructor(
    status: number,
    message: string,
    options?: { errorCode?: string; requestId?: string; details?: unknown },
  ) {
    super(message);
    this.status = status;
    this.errorCode = options?.errorCode;
    this.requestId = options?.requestId;
    this.details = options?.details;
  }
}

export async function postJson<TReq, TRes>(
  url: string,
  body: TReq,
): Promise<TRes> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new HttpError(res.status, data?.message ?? "请求失败", {
      errorCode: data?.errorCode,
      requestId: data?.requestId,
      details: data?.details,
    });
  }
  return data as TRes;
}

export async function getJson<TRes>(url: string): Promise<TRes> {
  const res = await fetch(url, {
    method: "GET",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new HttpError(res.status, data?.message ?? "请求失败", {
      errorCode: data?.errorCode,
      requestId: data?.requestId,
      details: data?.details,
    });
  }
  return data as TRes;
}
