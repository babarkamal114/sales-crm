import 'server-only';

import { alias } from 'drizzle-orm/pg-core';
import {
  and,
  desc,
  asc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm';
import { canContactSummary } from '@/domain/contacts/consent';
import { displayName } from '@/domain/contacts/display-name';
import type { ContactListQuery } from '@/domain/contacts/list-query';
import type { ContactListResponse, ContactListRow, ContactListSummary } from '@/domain/contacts/list-view';
import { assertCan } from '@/server/access/capabilities';
import {
  company,
  contact,
  contactConsent,
  contactTag,
  opportunity,
  pipelineStage,
  tag,
  user,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

function ownerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

type SortField = NonNullable<ContactListQuery['sort']>;

type ListCursor = {
  sort: SortField;
  dir: 'asc' | 'desc';
  id: string;
  v: string;
};

function encodeListCursor(input: ListCursor): string {
  return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url');
}

function decodeListCursor(
  raw: string,
  expected: { sort: SortField; dir: 'asc' | 'desc' },
): ListCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as ListCursor;
    if (parsed.sort !== expected.sort || parsed.dir !== expected.dir) return null;
    if (!parsed.id || !parsed.v) return null;
    return parsed;
  } catch {
    return null;
  }
}

function cursorPredicate(
  cursor: ListCursor,
  sort: SortField,
  dir: 'asc' | 'desc',
  ownerNameCol: Parameters<typeof gt>[0],
) {
  const forward = dir === 'asc';

  if (sort === 'created') {
    const at = new Date(cursor.v);
    return forward
      ? or(gt(contact.createdAt, at), and(eq(contact.createdAt, at), gt(contact.id, cursor.id)))
      : or(lt(contact.createdAt, at), and(eq(contact.createdAt, at), lt(contact.id, cursor.id)));
  }

  if (sort === 'name') {
    return forward
      ? or(
          gt(contact.displayName, cursor.v),
          and(eq(contact.displayName, cursor.v), gt(contact.id, cursor.id)),
        )
      : or(
          lt(contact.displayName, cursor.v),
          and(eq(contact.displayName, cursor.v), lt(contact.id, cursor.id)),
        );
  }

  if (sort === 'company') {
    return forward
      ? or(
          gt(company.name, cursor.v),
          and(eq(company.name, cursor.v), gt(contact.id, cursor.id)),
        )
      : or(
          lt(company.name, cursor.v),
          and(eq(company.name, cursor.v), lt(contact.id, cursor.id)),
        );
  }

  if (sort === 'owner') {
    return forward
      ? or(
          gt(ownerNameCol, cursor.v),
          and(eq(ownerNameCol, cursor.v), gt(contact.id, cursor.id)),
        )
      : or(
          lt(ownerNameCol, cursor.v),
          and(eq(ownerNameCol, cursor.v), lt(contact.id, cursor.id)),
        );
  }

  if (sort === 'deal_value') {
    const dealValue = sql`coalesce((
      select max(o.value_pence) from crm.opportunity o
      where o.contact_id = ${contact.id}
        and o.org_id = ${contact.orgId}
        and o.status = 'open'
        and o.deleted_at is null
    ), 0)`;
    const value = Number(cursor.v);
    return forward
      ? or(gt(dealValue, value), and(eq(dealValue, value), gt(contact.id, cursor.id)))
      : or(lt(dealValue, value), and(eq(dealValue, value), lt(contact.id, cursor.id)));
  }

  const at = new Date(cursor.v);
  const activityKey = sql`coalesce(${contact.lastActivityAt}, ${contact.createdAt})`;
  return forward
    ? or(gt(activityKey, at), and(eq(activityKey, at), gt(contact.id, cursor.id)))
    : or(lt(activityKey, at), and(eq(activityKey, at), lt(contact.id, cursor.id)));
}

function sortValueForRow(
  sort: SortField,
  row: {
    contact: typeof contact.$inferSelect;
    companyName: string | null;
    ownerName: string | null;
    openDealValue: number | null;
  },
): string {
  const c = row.contact;
  switch (sort) {
    case 'created':
      return c.createdAt.toISOString();
    case 'name':
      return c.displayName;
    case 'company':
      return row.companyName ?? '';
    case 'owner':
      return row.ownerName ?? '';
    case 'deal_value':
      return String(row.openDealValue ?? 0);
    case 'last_activity':
    default:
      return (c.lastActivityAt ?? c.createdAt).toISOString();
  }
}

function buildListFilter(session: TenantSession, query: ContactListQuery) {
  const parts = [eq(contact.orgId, session.orgId), isNull(contact.deletedAt)];

  if (query.list === 'mine') {
    parts.push(eq(contact.ownerId, session.userId));
  }
  if (query.owner === 'me') {
    parts.push(eq(contact.ownerId, session.userId));
  }
  if (query.list === 'new_week') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    parts.push(gte(contact.createdAt, weekAgo));
  }
  if (query.list === 'no_next_step') {
    parts.push(isNull(contact.nextTaskDueAt));
  }
  if (query.list === 'dnd') {
    parts.push(
      sql`exists (
        select 1 from crm.contact_consent cc
        where cc.contact_id = ${contact.id}
          and cc.org_id = ${contact.orgId}
          and cc.dnd = true
      )`,
    );
  }

  if (query.lifecycle) {
    parts.push(eq(contact.lifecycle, query.lifecycle));
  }
  if (query.tagId) {
    parts.push(
      sql`exists (
        select 1 from crm.contact_tag ct
        where ct.contact_id = ${contact.id}
          and ct.tag_id = ${query.tagId}
          and ct.org_id = ${contact.orgId}
      )`,
    );
  }
  if (query.source?.trim()) {
    parts.push(ilike(contact.source, `%${query.source.trim()}%`));
  }

  if (query.q) {
    const pattern = `%${query.q.replace(/%/g, '\\%')}%`;
    parts.push(
      or(
        ilike(contact.displayName, pattern),
        ilike(contact.email, pattern),
        ilike(contact.phoneE164, pattern),
        ilike(contact.firstName, pattern),
        ilike(contact.lastName, pattern),
        sql`exists (
          select 1 from crm.company co
          where co.id = ${contact.companyId}
            and co.org_id = ${contact.orgId}
            and co.name ilike ${pattern}
        )`,
      )!,
    );
  }

  return and(...parts);
}

export async function getContactListSummary(
  tx: DbTransaction,
  session: TenantSession,
): Promise<ContactListSummary> {
  assertCan(session, 'contact.view');

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [totals] = await tx
    .select({
      total: sql<number>`count(*)::int`,
      addedThisWeek: sql<number>`count(*) filter (where ${gte(contact.createdAt, weekAgo)})::int`,
      mine: sql<number>`count(*) filter (where ${contact.ownerId} = ${session.userId})::int`,
      noNext: sql<number>`count(*) filter (where ${contact.nextTaskDueAt} is null)::int`,
      dnd: sql<number>`count(distinct ${contact.id}) filter (where exists (
        select 1 from crm.contact_consent cc
        where cc.contact_id = ${contact.id}
          and cc.org_id = ${contact.orgId}
          and cc.dnd = true
      ))::int`,
    })
    .from(contact)
    .where(and(eq(contact.orgId, session.orgId), isNull(contact.deletedAt)));

  return {
    total: totals?.total ?? 0,
    addedThisWeek: totals?.addedThisWeek ?? 0,
    smartListCounts: {
      all: totals?.total ?? 0,
      mine: totals?.mine ?? 0,
      new_week: totals?.addedThisWeek ?? 0,
      no_next_step: totals?.noNext ?? 0,
      dnd: totals?.dnd ?? 0,
    },
  };
}

export async function listContacts(
  tx: DbTransaction,
  session: TenantSession,
  query: ContactListQuery,
): Promise<ContactListResponse> {
  assertCan(session, 'contact.view');

  const where = buildListFilter(session, query);
  const sort = query.sort ?? 'last_activity';
  const dir = query.dir ?? 'desc';
  const decodedCursor = query.cursor ? decodeListCursor(query.cursor, { sort, dir }) : null;

  const ownerUser = alias(user, 'owner_user');
  const activityKey = sql`coalesce(${contact.lastActivityAt}, ${contact.createdAt})`;
  const dealValue = sql`coalesce((
    select max(o.value_pence) from crm.opportunity o
    where o.contact_id = ${contact.id}
      and o.org_id = ${contact.orgId}
      and o.status = 'open'
      and o.deleted_at is null
  ), 0)`;

  const order =
    sort === 'created'
      ? dir === 'asc'
        ? [asc(contact.createdAt), asc(contact.id)]
        : [desc(contact.createdAt), desc(contact.id)]
      : sort === 'name'
        ? dir === 'asc'
          ? [asc(contact.displayName), asc(contact.id)]
          : [desc(contact.displayName), desc(contact.id)]
        : sort === 'company'
          ? dir === 'asc'
            ? [asc(company.name), asc(contact.id)]
            : [desc(company.name), desc(contact.id)]
          : sort === 'owner'
            ? dir === 'asc'
              ? [asc(ownerUser.fullName), asc(contact.id)]
              : [desc(ownerUser.fullName), desc(contact.id)]
            : sort === 'deal_value'
              ? dir === 'asc'
                ? [asc(dealValue), asc(contact.id)]
                : [desc(dealValue), desc(contact.id)]
              : dir === 'asc'
                ? [asc(activityKey), asc(contact.id)]
                : [desc(activityKey), desc(contact.id)];

  let cursorClause = where;
  if (decodedCursor) {
    cursorClause = and(where, cursorPredicate(decodedCursor, sort, dir, ownerUser.fullName));
  }

  const rows = await tx
    .select({
      contact,
      ownerName: ownerUser.fullName,
      companyName: company.name,
      openDealValue: dealValue,
    })
    .from(contact)
    .innerJoin(ownerUser, eq(contact.ownerId, ownerUser.id))
    .leftJoin(company, eq(contact.companyId, company.id))
    .where(cursorClause)
    .orderBy(...order)
    .limit(query.limit + 1);

  const slice = rows.slice(0, query.limit);
  const contactIds = slice.map((row) => row.contact.id);

  const openDeals =
    contactIds.length === 0
      ? []
      : await tx
          .select({
            contactId: opportunity.contactId,
            id: opportunity.id,
            name: opportunity.name,
            valuePence: opportunity.valuePence,
            status: opportunity.status,
            stageName: pipelineStage.name,
          })
          .from(opportunity)
          .innerJoin(pipelineStage, eq(opportunity.stageId, pipelineStage.id))
          .where(
            and(
              eq(opportunity.orgId, session.orgId),
              inArray(opportunity.contactId, contactIds),
              eq(opportunity.status, 'open'),
              isNull(opportunity.deletedAt),
            ),
          );

  const dealByContact = new Map(openDeals.map((row) => [row.contactId, row]));

  const tagRows =
    contactIds.length === 0
      ? []
      : await tx
          .select({
            contactId: contactTag.contactId,
            tagId: tag.id,
            name: tag.name,
            colourKey: tag.colourKey,
          })
          .from(contactTag)
          .innerJoin(tag, eq(contactTag.tagId, tag.id))
          .where(inArray(contactTag.contactId, contactIds));

  const tagsByContact = new Map<string, ContactListRow['tags']>();
  for (const row of tagRows) {
    const list = tagsByContact.get(row.contactId) ?? [];
    list.push({ id: row.tagId, name: row.name, colourKey: row.colourKey });
    tagsByContact.set(row.contactId, list);
  }

  const consentRows =
    contactIds.length === 0
      ? []
      : await tx
          .select()
          .from(contactConsent)
          .where(
            and(
              eq(contactConsent.orgId, session.orgId),
              inArray(contactConsent.contactId, contactIds),
            ),
          );

  const consentByContact = new Map<string, typeof consentRows>();
  for (const row of consentRows) {
    const list = consentByContact.get(row.contactId) ?? [];
    list.push(row);
    consentByContact.set(row.contactId, list);
  }

  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - 14);

  const listRows: ContactListRow[] = slice.map((row) => {
    const c = row.contact;
    const ownerDisplay = row.ownerName?.trim() || 'User';
    const deal = dealByContact.get(c.id);
    const consent = consentByContact.get(c.id) ?? [];
    const lastAt = c.lastActivityAt ?? c.createdAt;

    return {
      id: c.id,
      displayName: displayName(c),
      email: c.email,
      emailVerified: c.emailVerified,
      phoneE164: c.phoneE164,
      companyName: row.companyName,
      owner: {
        id: c.ownerId,
        fullName: ownerDisplay,
        initials: ownerInitials(ownerDisplay),
      },
      tags: tagsByContact.get(c.id) ?? [],
      source: c.source,
      openDeal: deal
        ? {
            id: deal.id,
            name: deal.name,
            valuePence: deal.valuePence,
            stageName: deal.stageName,
            status: deal.status,
          }
        : null,
      canContact: canContactSummary(
        {
          email: c.email,
          phoneE164: c.phoneE164,
          recipientType: c.recipientType,
          restricted: c.restricted,
        },
        consent.map((item) => ({
          channel: item.channel,
          dnd: item.dnd,
          marketingConsent: item.marketingConsent,
        })),
      ),
      lastActivityAt: c.lastActivityAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      isStaleActivity: lastAt < staleThreshold,
    };
  });

  const last = slice[slice.length - 1];
  const nextCursor =
    rows.length > query.limit && last
      ? encodeListCursor({
          sort,
          dir,
          id: last.contact.id,
          v: sortValueForRow(sort, {
            contact: last.contact,
            companyName: last.companyName,
            ownerName: last.ownerName,
            openDealValue: Number(last.openDealValue ?? 0),
          }),
        })
      : null;

  return { rows: listRows, nextCursor, totalApprox: null };
}

/** Same filters as the list view — for bulk “select all matching” (cap 500). */
export async function listContactIdsForQuery(
  tx: DbTransaction,
  session: TenantSession,
  query: ContactListQuery,
  max = 500,
): Promise<string[]> {
  assertCan(session, 'contact.view');
  const where = buildListFilter(session, query);
  const rows = await tx
    .select({ id: contact.id })
    .from(contact)
    .where(where)
    .orderBy(desc(contact.lastActivityAt), desc(contact.id))
    .limit(max);
  return rows.map((row) => row.id);
}
