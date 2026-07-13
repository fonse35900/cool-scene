import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  return NextResponse.json({
    env: process.env.VERCEL_ENV || 'unknown',
    has_url: !!url,
    url_prefix: url ? url.slice(0, 20) : null,
    has_token: !!token,
    token_length: token ? token.length : 0,
    has_jwt: !!process.env.JWT_SECRET,
  });
}
