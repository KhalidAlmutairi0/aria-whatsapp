import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { DbTask, AriaTask, Priority, TaskStatus } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readTasks(): DbTask[] {
  ensureDataDir();
  if (!fs.existsSync(TASKS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8')) as DbTask[];
  } catch {
    return [];
  }
}

function writeTasks(tasks: DbTask[]): void {
  ensureDataDir();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
}

function readUsers(): string[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) as string[];
  } catch {
    return [];
  }
}

function writeUsers(users: string[]): void {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function now(): string {
  return new Date().toISOString();
}

export function registerUser(phone: string): void {
  const users = readUsers();
  if (!users.includes(phone)) {
    writeUsers([...users, phone]);
  }
}

export function getAllUsers(): string[] {
  return readUsers();
}

export function addTask(phone: string, task: AriaTask): DbTask {
  const tasks = readTasks();
  const record: DbTask = {
    id: uuidv4(),
    user_phone: phone,
    title: task.title,
    description: task.description ?? null,
    datetime: task.datetime ?? null,
    end_datetime: task.end_datetime ?? null,
    priority: task.priority,
    status: 'active',
    recurrence: task.recurrence,
    recurrence_days: task.recurrence_days ? JSON.stringify(task.recurrence_days) : null,
    reminder_minutes_before: task.reminder_minutes_before ?? 30,
    tags: JSON.stringify(task.tags ?? []),
    estimated_duration_minutes: task.estimated_duration_minutes ?? null,
    cultural_time_ref: task.cultural_time_ref ?? null,
    reminder_sent: 0,
    created_at: now(),
    updated_at: now(),
  };
  writeTasks([...tasks, record]);
  return record;
}

export function getTasks(phone: string, status: TaskStatus = 'active'): DbTask[] {
  return readTasks()
    .filter(t => t.user_phone === phone && t.status === status)
    .sort((a, b) => {
      const pOrder = { P1: 1, P2: 2, P3: 3, P4: 4 };
      const pDiff = (pOrder[a.priority] ?? 4) - (pOrder[b.priority] ?? 4);
      if (pDiff !== 0) return pDiff;
      if (a.datetime && b.datetime) return a.datetime.localeCompare(b.datetime);
      return 0;
    });
}

export function getTasksToday(phone: string): DbTask[] {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return getTasks(phone).filter(t => {
    if (!t.datetime) return false;
    const d = new Date(t.datetime);
    return d >= start && d <= end;
  });
}

export function getTasksThisWeek(phone: string): DbTask[] {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  return getTasks(phone).filter(t => {
    if (!t.datetime) return false;
    const d = new Date(t.datetime);
    return d >= start && d <= end;
  });
}

export function findTaskByTitle(phone: string, title: string): DbTask | undefined {
  const tasks = getTasks(phone);
  return (
    tasks.find(t => t.title === title) ??
    tasks.find(t => t.title.toLowerCase().includes(title.toLowerCase())) ??
    tasks.find(t => title.toLowerCase().includes(t.title.toLowerCase()))
  );
}

export function completeTask(phone: string, title: string): DbTask | null {
  const tasks = readTasks();
  const target = findTaskByTitle(phone, title);
  if (!target) return null;
  const updated = tasks.map(t =>
    t.id === target.id ? { ...t, status: 'completed' as TaskStatus, updated_at: now() } : t
  );
  writeTasks(updated);
  if (target.recurrence !== 'none') scheduleNextOccurrence({ ...target, status: 'completed' });
  return { ...target, status: 'completed' };
}

export function deleteTask(phone: string, title: string): DbTask | null {
  const tasks = readTasks();
  const target = findTaskByTitle(phone, title);
  if (!target) return null;
  writeTasks(tasks.map(t =>
    t.id === target.id ? { ...t, status: 'deleted' as TaskStatus, updated_at: now() } : t
  ));
  return { ...target, status: 'deleted' };
}

export function snoozeTask(phone: string, title: string, newDatetime: string): DbTask | null {
  const tasks = readTasks();
  const target = findTaskByTitle(phone, title);
  if (!target) return null;
  writeTasks(tasks.map(t =>
    t.id === target.id ? { ...t, datetime: newDatetime, reminder_sent: 0, updated_at: now() } : t
  ));
  return { ...target, datetime: newDatetime, reminder_sent: 0 };
}

export function updateTask(phone: string, title: string, updates: Partial<AriaTask>): DbTask | null {
  const tasks = readTasks();
  const target = findTaskByTitle(phone, title);
  if (!target) return null;
  const merged: DbTask = {
    ...target,
    title: updates.title ?? target.title,
    description: updates.description !== undefined ? (updates.description ?? null) : target.description,
    datetime: updates.datetime !== undefined ? (updates.datetime ?? null) : target.datetime,
    priority: (updates.priority ?? target.priority) as Priority,
    tags: updates.tags !== undefined ? JSON.stringify(updates.tags) : target.tags,
    reminder_sent: updates.datetime ? 0 : target.reminder_sent,
    updated_at: now(),
  };
  writeTasks(tasks.map(t => t.id === target.id ? merged : t));
  return merged;
}

export function getTasksDueForReminder(): Array<{ task: DbTask; phone: string }> {
  const n = new Date();
  return readTasks()
    .filter(t => t.status === 'active' && t.datetime && !t.reminder_sent)
    .filter(t => {
      const due = new Date(t.datetime!);
      const reminderAt = new Date(due.getTime() - t.reminder_minutes_before * 60000);
      const diffMs = reminderAt.getTime() - n.getTime();
      return diffMs >= -60000 && diffMs <= 60000;
    })
    .map(t => ({ task: t, phone: t.user_phone }));
}

export function markReminderSent(id: string): void {
  const tasks = readTasks();
  writeTasks(tasks.map(t => t.id === id ? { ...t, reminder_sent: 1 } : t));
}

function scheduleNextOccurrence(task: DbTask): void {
  if (!task.datetime) return;
  const base = new Date(task.datetime);
  let next: Date;
  if (task.recurrence === 'daily') next = new Date(base.getTime() + 86400000);
  else if (task.recurrence === 'weekly') next = new Date(base.getTime() + 7 * 86400000);
  else if (task.recurrence === 'monthly') { next = new Date(base); next.setMonth(next.getMonth() + 1); }
  else return;

  addTask(task.user_phone, {
    title: task.title,
    description: task.description ?? undefined,
    datetime: next.toISOString(),
    end_datetime: task.end_datetime ?? undefined,
    priority: task.priority as Priority,
    recurrence: task.recurrence as AriaTask['recurrence'],
    recurrence_days: task.recurrence_days ? JSON.parse(task.recurrence_days) : undefined,
    reminder_minutes_before: task.reminder_minutes_before,
    tags: JSON.parse(task.tags),
    estimated_duration_minutes: task.estimated_duration_minutes ?? undefined,
    cultural_time_ref: task.cultural_time_ref ?? undefined,
  });
}

export function formatTasksForContext(tasks: DbTask[]): string {
  if (tasks.length === 0) return 'none';
  return tasks.map(t => {
    const dt = t.datetime ? ` | ${t.datetime}` : '';
    const rec = t.recurrence !== 'none' ? ` ↻${t.recurrence}` : '';
    return `[${t.priority}] ${t.title}${dt}${rec}`;
  }).join('\n');
}
