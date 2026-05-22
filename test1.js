const SUPABASE_URL = 'https://ojxzssooylmydystjvdo.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHpzc29veWxteWR5c3RqdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY3NTgsImV4cCI6MjA4MTkxMjc1OH0.lQcFC2HryZamOEbGYONHpY37K0kTK4OOAa9MlluV7Dc'

async function runTest1() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/extension-pairing-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify({ installId: 'test-install-123', version: '1.0.0' })
  })
  const data = await res.json()
  console.log(JSON.stringify(data))
}

runTest1().catch(console.error)
