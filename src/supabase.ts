/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { IS_SAMPLE } from './sample/sampleMode';
import { createFakeSupabase } from './sample/fakeSupabase';

const supabaseUrl = (import.meta as { env: Record<string, string> }).env.VITE_SUPABASE_URL || 'https://pkhossmmicxpjczqsmpf.supabase.co';
const supabaseAnonKey = (import.meta as { env: Record<string, string> }).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBraG9zc21taWN4cGpjenFzbXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjkwMDYsImV4cCI6MjA4NDUwNTAwNn0.q1c3HIbe9qL79LPfnUspL8RT0DIA6-5Yt1-WlZC3_8Y';

// Sample mode (dev only) swaps in an in-memory client with fictional data.
export const supabase = import.meta.env.DEV && IS_SAMPLE ? createFakeSupabase() : createClient(supabaseUrl, supabaseAnonKey);
