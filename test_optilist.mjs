import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://ojxzssooylmydystjvdo.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHpzc29veWxteWR5c3RqdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY3NTgsImV4cCI6MjA4MTkxMjc1OH0.lQcFC2HryZamOEbGYONHpY37K0kTK4OOAa9MlluV7Dc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testOptilist() {
  const email = 'ebaytest3@gmail.com';
  const password = 'XxAa205203@1'; // Reused from admin_qa

  console.log("Signing in as", email);
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) throw signInError;
  const token = authData.session.access_token;
  console.log("Logged in successfully. User ID:", authData.user.id);

  // Simulate OptiList payload
  const payload = {
    title: "Test OptiList Amazon Product",
    amazonUrl: "https://www.amazon.com/dp/B08F7PTF53",
    amazonAsin: "B08F7PTF53",
    amazonPrice: 29.99,
    ebayPrice: 39.99,
    sku: "TEST-SKU-1234",
    status: "active",
    amazon_data: { productTitle: "Test OptiList Amazon Product" }
  };

  console.log("Calling create-listing edge function...");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-listing`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  console.log("Status:", res.status);
  const bodyText = await res.text();
  console.log("Response Body:", bodyText);
}

testOptilist().catch(console.error);
