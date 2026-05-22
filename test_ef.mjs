import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ojxzssooylmydystjvdo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHpzc29veWxteWR5c3RqdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY3NTgsImV4cCI6MjA4MTkxMjc1OH0.lQcFC2HryZamOEbGYONHpY37K0kTK4OOAa9MlluV7Dc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFn() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'admin_qa@sellersuit.com',
    password: 'XxAa205203@1',
  });

  const token = authData.session.access_token;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/extension-admin-devices`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ page: 1, pageSize: 10 })
  });
  
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}

testFn();
