'use client';

import { useState } from 'react';
import type { OpportunityDetailView } from '@/domain/opportunities/detail-view';
import { formatDateTime, formatShortDate } from '@/features/opportunities/lib/format-duration';
import {
  createOpportunityTaskAction,
  setOpportunityTaskCompletedAction,
} from '@/server/actions/opportunities/collaboration';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

export function DealSheetTasks({
  deal,
  currentUserId,
  onChanged,
}: {
  deal: OpportunityDetailView;
  currentUserId: string;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [dueDate, setDueDate] = useState('');
  const [pending, setPending] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const addTask = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error('Add a task title');
      return;
    }
    setPending(true);
    try {
      const dueAt = dueDate
        ? new Date(`${dueDate}T12:00:00.000Z`).toISOString()
        : undefined;
      const result = await createOpportunityTaskAction({
        opportunityId: deal.id,
        title: trimmed,
        assigneeId,
        dueAt,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setTitle('');
      setDueDate('');
      toast.success('Task added');
      onChanged();
    } finally {
      setPending(false);
    }
  };

  const toggleComplete = async (taskId: string, completed: boolean) => {
    setTogglingId(taskId);
    try {
      const result = await setOpportunityTaskCompletedAction({ taskId, completed });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      onChanged();
    } finally {
      setTogglingId(null);
    }
  };

  const openTasks = deal.tasks.filter((task) => !task.completedAt);
  const doneTasks = deal.tasks.filter((task) => task.completedAt);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line/70 bg-white p-3 shadow-sm">
        <p className="text-[12px] font-semibold text-ink-500">Add a task</p>
        <div className="mt-2 space-y-2">
          <input
            className="h-10 w-full rounded-xl border border-line bg-soft/30 px-3 text-[13px] font-medium text-ink-900"
            placeholder="e.g. Send proposal deck"
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <label className="flex min-w-[140px] flex-1 flex-col gap-1">
              <span className="text-[11px] font-semibold text-ink-400">Assign to</span>
              <select
                className="h-9 rounded-lg border border-line bg-white px-2 text-[12px] font-semibold text-ink-800"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
              >
                {deal.teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                    {member.id === currentUserId ? ' (you)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-ink-400">Due date</span>
              <input
                type="date"
                className="h-9 rounded-lg border border-line bg-white px-2 text-[12px] font-medium text-ink-800"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <Button type="button" size="sm" disabled={pending} onClick={() => void addTask()}>
            {pending ? 'Adding…' : 'Add task'}
          </Button>
        </div>
      </div>

      {deal.tasks.length === 0 ? (
        <p className="rounded-2xl border border-line/70 bg-soft/40 px-4 py-8 text-center text-[13px] font-medium text-ink-500">
          No tasks on this deal. Assign follow-ups to anyone on your team.
        </p>
      ) : (
        <div className="space-y-4">
          {openTasks.length > 0 ? (
            <TaskGroup
              label="Open"
              tasks={openTasks}
              togglingId={togglingId}
              onToggle={toggleComplete}
            />
          ) : null}
          {doneTasks.length > 0 ? (
            <TaskGroup
              label="Done"
              tasks={doneTasks}
              togglingId={togglingId}
              onToggle={toggleComplete}
              muted
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function TaskGroup({
  label,
  tasks,
  togglingId,
  onToggle,
  muted,
}: {
  label: string;
  tasks: OpportunityDetailView['tasks'];
  togglingId: string | null;
  onToggle: (taskId: string, completed: boolean) => void;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">{label}</p>
      <ul className="space-y-2">
        {tasks.map((task) => {
          const done = Boolean(task.completedAt);
          return (
            <li
              key={task.id}
              className={cn(
                'flex items-start gap-3 rounded-2xl border border-line/70 bg-white px-3 py-2.5 shadow-sm',
                muted && 'opacity-75',
              )}
            >
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-line"
                checked={done}
                disabled={togglingId === task.id}
                aria-label={done ? 'Mark task open' : 'Mark task done'}
                onChange={() => void onToggle(task.id, !done)}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-[13px] font-bold text-ink-900',
                    done && 'text-ink-500 line-through',
                  )}
                >
                  {task.title}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-ink-500">
                  {task.assignee ? (
                    <>
                      Assigned to <span className="font-semibold text-ink-700">{task.assignee.fullName}</span>
                    </>
                  ) : (
                    'Unassigned'
                  )}
                  {task.dueAt ? (
                    <>
                      {' · Due '}
                      {formatShortDate(task.dueAt)}
                    </>
                  ) : null}
                  {done && task.completedAt ? (
                    <>
                      {' · Done '}
                      {formatDateTime(task.completedAt)}
                    </>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-ink-400">
                  Added by {task.createdBy.fullName}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
