import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ojxzssooylmydystjvdo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHpzc29veWxteWR5c3RqdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY3NTgsImV4cCI6MjA4MTkxMjc1OH0.lQcFC2HryZamOEbGYONHpY37K0kTK4OOAa9MlluV7Dc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createAdmin() {
  console.log("Signing up admin_qa@sellersuit.com...");
  const { data, error } = await supabase.auth.signUp({
    email: 'admin_qa@sellersuit.com',
    password: 'XxAa205203@1',
  });

  if (error) {
    console.error("Signup error:", error);
    process.exit(1);
  }

  console.log("User created! ID:", data.user.id);
}

createAdmin();
