async function testAutoResponder() {
  console.log('🤖 Sending simulated incoming "PRICE" keyword text from +917666130611...');

  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '2251442372294214',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15556677453',
                phone_number_id: '1181142285092556',
              },
              contacts: [
                {
                  profile: { name: 'Sudhir Gaikwad' },
                  wa_id: '917666130611',
                },
              ],
              messages: [
                {
                  from: '917666130611',
                  id: `wamid.bot_test_${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: 'PRICE' },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const res = await fetch('http://localhost:5050/api/v1/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log(`HTTP ${res.status}: ${text}`);
}

testAutoResponder().catch(console.error);
