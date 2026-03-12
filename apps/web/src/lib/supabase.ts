import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          explorer_axis: 'homebody' | 'explorer';
          risk_axis: 'cautious' | 'risktaker';
          declared_personality: Record<string, number>;
          exhibited_personality: Record<string, number>;
          current_day: number;
          current_phase: 'calibration' | 'expansion' | 'rupture';
          congruence_delta: number;
          streak_count: number;
          rerolls_remaining: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      quest_logs: {
        Row: {
          id: string;
          user_id: string;
          quest_id: number;
          assigned_at: string;
          status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'replaced';
          completed_at: string | null;
          congruence_delta_at_assignment: number;
          phase_at_assignment: 'calibration' | 'expansion' | 'rupture';
          was_rerolled: boolean;
          was_fallback: boolean;
          safety_consent_given: boolean;
        };
        Insert: Omit<Database['public']['Tables']['quest_logs']['Row'], 'id' | 'assigned_at'>;
        Update: Partial<Database['public']['Tables']['quest_logs']['Insert']>;
      };
    };
  };
};
