import { Coordinates, PrayerTimes, CalculationMethod, Madhab } from 'adhan';

const LAT = parseFloat(process.env.LATITUDE ?? '24.6877');
const LNG = parseFloat(process.env.LONGITUDE ?? '46.7219');

export interface PrayerSchedule {
  fajr: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export function getPrayerTimes(date: Date = new Date()): PrayerSchedule {
  const coordinates = new Coordinates(LAT, LNG);
  const params = CalculationMethod.MuslimWorldLeague();
  params.madhab = Madhab.Shafi;
  const pt = new PrayerTimes(coordinates, date, params);
  return {
    fajr: pt.fajr,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };
}

export function formatPrayerContext(p: PrayerSchedule): string {
  const f = (d: Date) => d.toISOString();
  return `Fajr=${f(p.fajr)} Dhuhr=${f(p.dhuhr)} Asr=${f(p.asr)} Maghrib=${f(p.maghrib)} Isha=${f(p.isha)}`;
}

const KSA_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const KSA_WORK_NOTES = ['first workday', '', '', '', 'last workday', 'weekend', 'weekend'];

export function getDayContext(date: Date = new Date()): string {
  const tz = process.env.TIMEZONE ?? 'Asia/Riyadh';
  const dayIdx = new Date(date.toLocaleString('en-US', { timeZone: tz })).getDay();
  return `${KSA_DAYS[dayIdx]} — KSA ${KSA_WORK_NOTES[dayIdx] || 'workday'}`;
}

export function getGulfISO(date: Date = new Date()): string {
  const tz = process.env.TIMEZONE ?? 'Asia/Riyadh';
  const offset = '+03:00';
  const local = new Date(date.toLocaleString('en-US', { timeZone: tz }));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())}${offset}`;
}
