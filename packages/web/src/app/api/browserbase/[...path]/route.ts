import { NextRequest, NextResponse } from 'next/server';

const BROWSERBASE_API = 'https://api.browserbase.com';
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX ?? '10', 10);
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// IP-based rate limiting for session creation (in-memory, resets on redeploy)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Purge expired entries to prevent memory leak
  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap) {
      if (now >= val.resetAt) rateLimitMap.delete(key);
    }
  }

  let entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - entry.count),
    resetAt: entry.resetAt,
  };
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function proxyRequest(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  let apiKey: string;
  let projectId: string;

  try {
    apiKey = getRequiredEnv('BROWSERBASE_API_KEY');
    projectId = getRequiredEnv('BROWSERBASE_PROJECT_ID');
  } catch {
    return NextResponse.json(
      { error: 'Browserbase proxy not configured' },
      { status: 503 },
    );
  }

  const { path } = await params;
  const pathStr = path.join('/');
  const isSessionCreate = req.method === 'POST' && pathStr === 'v1/sessions';

  // Rate-limit session creation only
  if (isSessionCreate) {
    const ip = getRateLimitKey(req);
    const { allowed, remaining, resetAt } = checkRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': String(remaining),
          },
        },
      );
    }
  }

  // Build upstream URL preserving query string
  const url = new URL(pathStr, BROWSERBASE_API);
  const searchParams = req.nextUrl.searchParams.toString();
  if (searchParams) {
    url.search = searchParams;
  }

  // Forward headers, replacing auth
  const headers = new Headers();
  for (const [key, value] of req.headers.entries()) {
    // Skip hop-by-hop and auth headers
    if (['host', 'connection', 'x-bb-api-key', 'transfer-encoding'].includes(key.toLowerCase())) {
      continue;
    }
    headers.set(key, value);
  }
  headers.set('X-BB-API-Key', apiKey);

  // Build body — override projectId for session creation
  let body: BodyInit | undefined;
  if (req.body && req.method !== 'GET' && req.method !== 'HEAD') {
    if (isSessionCreate) {
      try {
        const json = await req.json();
        json.projectId = projectId;
        body = JSON.stringify(json);
        headers.set('content-type', 'application/json');
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
    } else {
      body = req.body;
    }
  }

  try {
    const upstream = await fetch(url.toString(), {
      method: req.method,
      headers,
      body,
    });

    // Stream response back
    const responseHeaders = new Headers();
    for (const [key, value] of upstream.headers.entries()) {
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream request failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
