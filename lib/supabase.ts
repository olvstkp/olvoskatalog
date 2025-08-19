import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://duxgrvwcwnxoogyekffw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1eGdydndjd254b29neWVrZmZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTIyNjcsImV4cCI6MjA2ODgyODI2N30.uzk40ZBpVNXWMiFyaqlOWk-Xfqiw-9Wgz5qRcKaj7qA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
