import 'dotenv/config';
import express, { Request, Response } from 'express';
import { processMessage } from './aria';
import { executeAction } from './handlers';
import { registerUser } from './db';
import { sendWhatsApp, validateTwilioSignature } from './twilio';
import { startScheduler } from './scheduler';

const app = express();
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ARIA', ts: new Date().toISOString() });
});

app.post('/webhook', async (req: Request, res: Response) => {
  const phone: string = req.body.From ?? '';
  const message: string = req.body.Body ?? '';
  console.log(`[webhook] from=${phone} body="${message}"`);

  if (!phone || !message) {
    res.sendStatus(400);
    return;
  }

  res.sendStatus(200);

  try {
    registerUser(phone);
    console.log('[aria] calling processMessage...');
    const ariaResponse = await processMessage(phone, message);
    console.log('[aria] action=', ariaResponse.action, 'reply=', ariaResponse.reply);
    const finalResponse = executeAction(phone, ariaResponse);
    console.log('[twilio] sending reply...');
    await sendWhatsApp(phone, finalResponse.reply);
    console.log('[twilio] reply sent');
  } catch (err) {
    console.error('[error]', err);
    const isArabic = message.match(/[؀-ۿ]/);
    try {
      await sendWhatsApp(phone, isArabic ? 'صار خطأ، حاول مرة ثانية.' : 'Something went wrong. Try again.');
    } catch (e) {
      console.error('[error] failed to send error reply', e);
    }
  }
});

const PORT = parseInt(process.env.PORT ?? '3000', 10);
app.listen(PORT, () => {
  console.log(`ARIA listening on :${PORT}`);
  startScheduler();
});
