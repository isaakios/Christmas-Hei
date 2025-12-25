import { createClient } from '@supabase/supabase-js'

// 使用 import.meta.env 配合 VITE_ 前綴
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)