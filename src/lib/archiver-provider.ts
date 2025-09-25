import { Archiver } from './archiver-interface';
import { archiver as fsArchiver } from '../lib/archiver';
import { supabaseArchiver } from '../lib/supabase-archiver';

// Wrapper that calls two archivers but ignores failure in one so logging doesn't break the app
class DualArchiver implements Archiver {
  constructor(private a: Archiver, private b: Archiver) {}
  async logConversation(d: Parameters<Archiver['logConversation']>[0]) { await Promise.allSettled([this.a.logConversation(d), this.b.logConversation(d)]); }
  async logArtifact(d: Parameters<Archiver['logArtifact']>[0]) { await Promise.allSettled([this.a.logArtifact(d), this.b.logArtifact(d)]); }
  getRecentLogs(days?: number) { return this.a.getRecentLogs(days); }
  getConversationAnalytics(days?: number) { return this.a.getConversationAnalytics(days); }
  getTrackEffectiveness() { return this.a.getTrackEffectiveness(); }
  getMicroToolEffectiveness() { return this.a.getMicroToolEffectiveness(); }
}

function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}

export function getArchiver(): Archiver {
  const forced = process.env.ARCHIVER_BACKEND?.toLowerCase();
  const dual = process.env.ARCHIVER_DUAL_LOG === 'true';
  const isHosted = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');

  const supabaseOk = hasSupabaseEnv();


  if (dual && supabaseOk) {
    return new DualArchiver(fsArchiver as unknown as Archiver, supabaseArchiver as unknown as Archiver);
  }

  if (forced === 'supabase' || (forced === undefined && isHosted && supabaseOk)) {
    return supabaseArchiver as unknown as Archiver;
  }

  // default to filesystem
  return fsArchiver as unknown as Archiver;
}
