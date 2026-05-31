import {
  addTask, completeTask, deleteTask, snoozeTask, updateTask,
  getTasks, getTasksToday, findTaskByTitle, formatTasksForContext,
} from './db';
import type { AriaResponse } from './types';

export function executeAction(phone: string, aria: AriaResponse): AriaResponse {
  const { action, task } = aria;

  switch (action) {
    case 'ADD':
    case 'RECURRING': {
      if (!task) break;
      const saved = addTask(phone, task);
      const conflicts = detectConflicts(phone, saved.id, task.datetime);
      return { ...aria, conflicts: conflicts.length ? conflicts : undefined };
    }

    case 'COMPLETE': {
      if (!task?.title) break;
      const done = completeTask(phone, task.title);
      if (!done) {
        return {
          ...aria,
          reply: aria.reply.match(/[؀-ۿ]/)
            ? `ما لقيت المهمة: "${task.title}"`
            : `Task not found: "${task.title}"`,
        };
      }
      break;
    }

    case 'DELETE': {
      if (!task?.title) break;
      const removed = deleteTask(phone, task.title);
      if (!removed) {
        return {
          ...aria,
          reply: aria.reply.match(/[؀-ۿ]/)
            ? `ما لقيت المهمة: "${task.title}"`
            : `Task not found: "${task.title}"`,
        };
      }
      break;
    }

    case 'SNOOZE': {
      if (!task?.title || !task.datetime) break;
      snoozeTask(phone, task.title, task.datetime);
      break;
    }

    case 'UPDATE': {
      if (!task?.title) break;
      updateTask(phone, task.title, task);
      break;
    }

    case 'LIST':
    case 'SUMMARIZE': {
      const tasks = getTasks(phone);
      if (tasks.length === 0) {
        const isEmpty = aria.reply.match(/[؀-ۿ]/);
        return {
          ...aria,
          reply: isEmpty ? 'ما في مهام ✓ — قائمتك فاضية.' : 'All clear — no active tasks.',
        };
      }
      break;
    }

    default:
      break;
  }

  return aria;
}

function detectConflicts(phone: string, newTaskId: string, datetime: string | null | undefined) {
  if (!datetime) return [];
  const dt = new Date(datetime);
  const windowMs = 60 * 60 * 1000;
  const tasks = getTasks(phone);
  return tasks
    .filter(t => t.id !== newTaskId && t.datetime)
    .filter(t => Math.abs(new Date(t.datetime!).getTime() - dt.getTime()) < windowMs)
    .map(t => ({ existing_task: t.title, conflict_time: t.datetime! }));
}
