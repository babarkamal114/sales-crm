'use client';

import { useEffect, useState } from 'react';
import {
  createContactNoteAction,
  createContactTaskAction,
} from '@/server/actions/contacts/collaboration';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';

export function ContactQuickNoteDialog({
  open,
  onOpenChange,
  contactId,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  onPosted: () => void;
}) {
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) setBody('');
  }, [open]);

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error('Write a note');
      return;
    }
    setPending(true);
    try {
      const result = await createContactNoteAction({ contactId, body: trimmed });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Note posted');
      onOpenChange(false);
      onPosted();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Team note</DialogTitle>
        </DialogHeader>
        <textarea
          className="min-h-[120px] w-full rounded-xl border border-line bg-soft/30 px-3 py-2.5 text-[13px] font-medium text-ink-900"
          placeholder="Visible to everyone who can view this contact…"
          value={body}
          maxLength={10_000}
          onChange={(event) => setBody(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={() => void submit()}>
            {pending ? 'Posting…' : 'Post note'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ContactQuickTaskDialog({
  open,
  onOpenChange,
  contactId,
  currentUserId,
  teamMembers,
  defaultAssigneeId,
  defaultKind = 'follow_up',
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  currentUserId: string;
  teamMembers: { id: string; fullName: string }[];
  defaultAssigneeId?: string;
  defaultKind?: 'follow_up' | 'member_request';
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId ?? currentUserId);
  const [dueDate, setDueDate] = useState('');
  const [kind, setKind] = useState(defaultKind);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setAssigneeId(defaultAssigneeId ?? currentUserId);
      setKind(defaultKind);
    } else {
      setTitle('');
      setDueDate('');
    }
  }, [open, currentUserId, defaultAssigneeId, defaultKind]);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error('Add a title');
      return;
    }
    setPending(true);
    try {
      const dueAt = dueDate
        ? new Date(`${dueDate}T12:00:00.000Z`).toISOString()
        : undefined;
      const result = await createContactTaskAction({
        contactId,
        title: trimmed,
        assigneeId,
        dueAt,
        kind,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(kind === 'member_request' ? 'Request sent' : 'Task added');
      onOpenChange(false);
      onCreated();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {kind === 'member_request' ? 'Request teammate' : 'Add task'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            className="h-10 w-full rounded-xl border border-line px-3 text-[13px]"
            placeholder="What needs to happen?"
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
          />
          <label className="block space-y-1">
            <span className="text-[12px] font-semibold text-ink-500">Assign to</span>
            <select
              className="h-10 w-full rounded-xl border border-line px-3 text-[13px] font-semibold"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[12px] font-semibold text-ink-500">Due date (optional)</span>
            <input
              type="date"
              className="h-10 w-full rounded-xl border border-line px-3 text-[13px]"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={() => void submit()}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
