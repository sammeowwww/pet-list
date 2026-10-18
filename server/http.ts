export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(
  data: unknown,
  status = 200,
  headers: HeadersInit = {},
): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new HttpError(415, 'JSON required.');
  const text = await request.text();
  if (text.length > 5_000_000) throw new HttpError(413, 'Request too large.');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}
export function requireSameOrigin(request: Request): void {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    throw new HttpError(403, 'Request origin rejected.');
}
export function cookie(request: Request, name: string): string | null {
  return (
    request.headers
      .get('cookie')
      ?.split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? null
  );
}
export function setCookie(
  request: Request,
  name: string,
  value: string,
  maxAge: number,
): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
