/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as { env: Record<string, string> }).env.VITE_SUPABASE_URL || 'https://pkhossmmicxpjczqsmpf.supabase.co';
const supabaseAnonKey = (import.meta as { env: Record<string, string> }).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBraG9zc21taWN4cGpjenFzbXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjkwMDYsImV4cCI6MjA4NDUwNTAwNn0.q1c3HIbe9qL79LPfnUspL8RT0DIA6-5Yt1-WlZC3_8Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
