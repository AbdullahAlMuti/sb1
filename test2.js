const SUPABASE_URL = 'https://ojxzssooylmydystjvdo.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHpzc29veWxteWR5c3RqdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY3NTgsImV4cCI6MjA4MTkxMjc1OH0.lQcFC2HryZamOEbGYONHpY37K0kTK4OOAa9MlluV7Dc'

const connectToken = "ssct_8v38TS0SWX3JL2FbkyfnZ6l_R7QSgp8BP_C598ba8iM"
const clientSecret = "sscs_V10HZmPSWaGTzcCzbY8p9h5nJ_4yByhsdKQOA52jfII"

async function runTest2() {
  console.log('\n[Test 7] Polling status (approved)')
  const res5 = await fetch(`${SUPABASE_URL}/functions/v1/extension-pairing-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify({ connectToken, clientSecret })
  })
  const poll2 = await res5.json()
  console.log('Poll 2:', poll2)

  if (poll2.status === 'approved') {
    console.log('\n[Test 8] Redeeming token')
    const res6 = await fetch(`${SUPABASE_URL}/functions/v1/extension-token-redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
      body: JSON.stringify({ connectToken, clientSecret })
    })
    const redeemResult = await res6.json()
    console.log('Redeem Result:', JSON.stringify(redeemResult, null, 2))
  }
}

runTest2().catch(console.error)
