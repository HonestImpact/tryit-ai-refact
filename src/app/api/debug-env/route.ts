import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Only allow this in development or if a special debug key is provided
  const debugKey = req.nextUrl.searchParams.get('debug');
  
  if (process.env.NODE_ENV === 'production' && debugKey !== 'allow-debug-123') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
    supabaseAnonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    supabaseServiceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
  };

  return NextResponse.json(envCheck);
}
