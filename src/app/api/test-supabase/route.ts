import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error 
      });
    }
    
    console.log('Supabase connection successful');
    
    // Test insert
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('conversations')
      .insert({
        environment: 'production', // Use valid environment value
        track_type: 'skeptical',
        session_id: 'test_session_' + Date.now(),
        user_engagement: 'medium'
      })
      .select();
    
    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: insertError.message,
        details: insertError 
      });
    }
    
    console.log('Supabase insert successful:', insertData);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Supabase connection and insert working',
      data: insertData 
    });
    
  } catch (error) {
    console.error('Test Supabase error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error 
    });
  }
}
