export type Action =
  | 'ADD' | 'LIST' | 'DELETE' | 'UPDATE' | 'COMPLETE'
  | 'SNOOZE' | 'RECURRING' | 'SUMMARIZE' | 'BRIEFING'
  | 'SUGGEST' | 'COACH';

export type Priority = 'P1' | 'P2' | 'P3' | 'P4';
export type Recurrence = 'daily' | 'weekly' | 'monthly' | 'none';
export type RecurrenceDay = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
export type TaskStatus = 'active' | 'completed' | 'deleted';

export interface AriaTask {
  title: string;
  description?: string | null;
  datetime?: string | null;
  end_datetime?: string | null;
  priority: Priority;
  recurrence: Recurrence;
  recurrence_days?: RecurrenceDay[] | null;
  reminder_minutes_before: number;
  tags: string[];
  estimated_duration_minutes?: number | null;
  cultural_time_ref?: string | null;
}

export interface AriaConflict {
  existing_task: string;
  conflict_time: string;
}

export interface AriaResponse {
  action: Action;
  confidence: number;
  task?: AriaTask | null;
  conflicts?: AriaConflict[];
  suggestions?: string[];
  coaching?: string | null;
  reply: string;
}

export interface DbTask {
  id: string;
  user_phone: string;
  title: string;
  description: string | null;
  datetime: string | null;
  end_datetime: string | null;
  priority: Priority;
  status: TaskStatus;
  recurrence: Recurrence;
  recurrence_days: string | null;
  reminder_minutes_before: number;
  tags: string;
  estimated_duration_minutes: number | null;
  cultural_time_ref: string | null;
  reminder_sent: number;
  created_at: string;
  updated_at: string;
}
