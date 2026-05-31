import cron from 'node-cron';
import { getTasksDueForReminder, markReminderSent, getAllUsers } from './db';
import { generateBriefing } from './aria';
import { sendWhatsApp } from './twilio';

export function startScheduler(): void {
  // Check reminders every minute
  cron.schedule('* * * * *', async () => {
    const due = getTasksDueForReminder();
    for (const { task, phone } of due) {
      const dt = task.datetime ? new Date(task.datetime).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }) : '';
      const isArabic = task.title.match(/[؀-ۿ]/);
      const msg = isArabic
        ? `⏰ تذكير: ${task.title}${dt ? ` — ${dt}` : ''}`
        : `⏰ Reminder: ${task.title}${dt ? ` — ${dt}` : ''}`;
      try {
        await sendWhatsApp(phone, msg);
        markReminderSent(task.id);
      } catch (err) {
        console.error(`Reminder failed for ${task.id}:`, err);
      }
    }
  });

  // Weekly briefing — every Sunday at 8:00 AM KSA (UTC+3 = 05:00 UTC)
  cron.schedule('0 5 * * 0', async () => {
    const users = getAllUsers();
    for (const phone of users) {
      try {
        const briefing = await generateBriefing(phone);
        if (briefing) {
          await sendWhatsApp(phone, `📋 أسبوعك:\n${briefing}`);
        }
      } catch (err) {
        console.error(`Briefing failed for ${phone}:`, err);
      }
    }
  }, { timezone: 'UTC' });

  console.log('Scheduler started: reminders (every minute), briefing (Sunday 8AM KSA)');
}
