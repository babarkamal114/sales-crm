import 'server-only';

import { and, eq, isNotNull, isNull, min } from 'drizzle-orm';
import { contact, contactTask } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';

/** Sets `contact.next_task_due_at` from the earliest open contact task due date. */
export async function syncContactNextTaskDueAt(
  tx: DbTransaction,
  orgId: string,
  contactId: string,
): Promise<void> {
  const [row] = await tx
    .select({ due: min(contactTask.dueAt) })
    .from(contactTask)
    .where(
      and(
        eq(contactTask.orgId, orgId),
        eq(contactTask.contactId, contactId),
        isNull(contactTask.deletedAt),
        isNull(contactTask.completedAt),
        isNotNull(contactTask.dueAt),
      ),
    );

  const nextDue = row?.due ?? null;

  await tx
    .update(contact)
    .set({ nextTaskDueAt: nextDue })
    .where(and(eq(contact.orgId, orgId), eq(contact.id, contactId)));
}
