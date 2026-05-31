import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const from = process.env.TWILIO_WHATSAPP_NUMBER!;

let _client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!_client) _client = twilio(accountSid, authToken);
  return _client;
}

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  await getClient().messages.create({ from, to: toNumber, body });
}

export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}
