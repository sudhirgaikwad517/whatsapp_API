async function test() {
  const url = 'http://localhost:5050/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=prowexa_whatsapp_webhook_secret_123&hub.challenge=CHALLENGE_SUCCESS';
  const res = await fetch(url);
  const text = await res.text();
  console.log(`HTTP ${res.status}: ${text}`);
}
test();
