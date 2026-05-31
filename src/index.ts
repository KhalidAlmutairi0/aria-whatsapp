import 'dotenv/config';
import express, { Request, Response } from 'express';
import { processMessage } from './aria';
import { executeAction } from './handlers';
import { registerUser } from './db';
import { sendWhatsApp, validateTwilioSignature } from './twilio';
import { startScheduler } from './scheduler';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ARIA', ts: new Date().toISOString() });
});

app.post('/webhook', async (req: Request, res: Response) => {
  // Validate Twilio signature in production
  if (process.env.NODE_ENV === 'production') {
    const sig = req.headers['x-twilio-signature'] as string;
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    if (!validateTwilioSignature(sig, url, req.body)) {
      res.status(403).send('Forbidden');
      return;
    }
  }

  const phone: string = req.body.From ?? '';
  const message: string = req.body.Body ?? '';

  if (!phone || !message) {
    res.sendStatus(400);
    return;
  }

  res.sendStatus(200);

  try {
    registerUser(phone);
    const ariaResponse = await processMessage(phone, message);
    const finalResponse = executeAction(phone, ariaResponse);
    await sendWhatsApp(phone, finalResponse.reply);
  } catch (err) {
    console.error('Webhook error:', err);
    const isArabic = message.match(/[؀-ۿ]/);
    try {
      await sendWhatsApp(phone, isArabic ? 'صار خطأ، حاول مرة ثانية.' : 'Something went wrong. Try again.');
    } catch {}
  }
});

const PORT = parseInt(process.env.PORT ?? '3000', 10);
app.listen(PORT, () => {
  console.log(`ARIA listening on :${PORT}`);
  startScheduler();
});
