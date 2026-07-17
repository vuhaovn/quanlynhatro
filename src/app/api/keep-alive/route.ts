import { NextResponse } from 'next/server'

// Vercel Cron gọi endpoint này mỗi ngày để Supabase free tier không bị pause
// (project bị pause nếu không có hoạt động database trong 7 ngày)
export const dynamic = 'force-dynamic'

export async function GET() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/settings?select=id&limit=1`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: 'no-store',
    }
  )

  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    at: new Date().toISOString(),
  })
}
