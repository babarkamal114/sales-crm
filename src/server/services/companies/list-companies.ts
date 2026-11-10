import 'server-only';

import { and, asc, desc, eq, gt, ilike, isNull, lt, or, sql } from 'drizzle-orm';
import type { CompanyListQuery } from '@/domain/companies/list-query';
import type { CompanyListResponse, CompanyListRow } from '@/domain/companies/list-view';
import { assertCan } from '@/server/access/capabilities';
import { company, companyStats, user } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function encodeCursor(sortValue: string | number, id: string): string {
  return Buffer.from(JSON.stringify({ v: sortValue, id }), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): { v: string | number; id: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      v: string | number;
      id: string;
    };
    if ((typeof parsed.v === 'string' || typeof parsed.v === 'number') && typeof parsed.id === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

const staleThresholdSql = sql`now() - interval '14 days'`;
const openDealCount = sql<number>`coalesce(${companyStats.openDealCount}, 0)`;

export async function listCompanies(
  tx: DbTransaction,
  session: TenantSession,
  query: CompanyListQuery,
): Promise<CompanyListResponse> {
  assertCan(session, 'contact.view');

  const limit = query.limit ?? 50;
  const sort = query.sort ?? 'name';
  const dir = query.dir ?? 'asc';
  const forward = dir === 'asc';
  const list = query.list ?? 'all';

  const baseOrgFilter = and(eq(company.orgId, session.orgId), isNull(company.deletedAt));

  const filters = [baseOrgFilter];

  if (list === 'mine') {
    filters.push(eq(company.ownerId, session.userId));
  }
  if (list === 'customers') {
    filters.push(eq(company.lifecycle, 'customer'));
  }
  if (list === 'open_deals') {
    filters.push(gt(openDealCount, 0));
  }
  if (list === 'stale') {
    filters.push(or(isNull(company.lastActivityAt), lt(company.lastActivityAt, staleThresholdSql))!);
  }

  const q = query.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
    filters.push(
      or(
        ilike(company.name, pattern),
        ilike(company.domain, pattern),
        ilike(company.city, pattern),
        ilike(company.companiesHouseNumber, pattern),
      )!,
    );
  }

  const openDealsValue = sql<number>`coalesce(${companyStats.openPipelineValue}, 0)::int`;
  const wonTotal = sql<number>`coalesce(${companyStats.wonValueTotal}, 0)::int`;
  const contactCount = sql<number>`coalesce(${companyStats.contactCount}, 0)::int`;
  const lastActivity = company.lastActivityAt;

  const sortColumn =
    sort === 'contacts'
      ? contactCount
      : sort === 'deals'
        ? openDealsValue
        : sort === 'won'
          ? wonTotal
          : sort === 'activity'
            ? lastActivity
            : sort === 'created'
              ? company.createdAt
              : company.name;

  const decoded = query.cursor ? decodeCursor(query.cursor) : null;
  if (decoded) {
    if (sort === 'name') {
      const v = String(decoded.v);
      filters.push(
        forward
          ? or(gt(company.name, v), and(eq(company.name, v), gt(company.id, decoded.id)))!
          : or(lt(company.name, v), and(eq(company.name, v), lt(company.id, decoded.id)))!,
      );
    } else if (sort === 'created') {
      const v = new Date(String(decoded.v));
      filters.push(
        forward
          ? or(gt(company.createdAt, v), and(eq(company.createdAt, v), gt(company.id, decoded.id)))!
          : or(lt(company.createdAt, v), and(eq(company.createdAt, v), lt(company.id, decoded.id)))!,
      );
    } else if (sort === 'activity') {
      const v = decoded.v ? new Date(String(decoded.v)) : null;
      if (v) {
        filters.push(
          forward
            ? or(gt(company.lastActivityAt, v), and(eq(company.lastActivityAt, v), gt(company.id, decoded.id)))!
            : or(lt(company.lastActivityAt, v), and(eq(company.lastActivityAt, v), lt(company.id, decoded.id)))!,
        );
      }
    } else if (sort === 'deals') {
      const v = Number(decoded.v);
      filters.push(
        forward
          ? or(gt(openDealsValue, v), and(eq(openDealsValue, v), gt(company.id, decoded.id)))!
          : or(lt(openDealsValue, v), and(eq(openDealsValue, v), lt(company.id, decoded.id)))!,
      );
    } else if (sort === 'won') {
      const v = Number(decoded.v);
      filters.push(
        forward
          ? or(gt(wonTotal, v), and(eq(wonTotal, v), gt(company.id, decoded.id)))!
          : or(lt(wonTotal, v), and(eq(wonTotal, v), lt(company.id, decoded.id)))!,
      );
    } else if (sort === 'contacts') {
      const v = Number(decoded.v);
      filters.push(
        forward
          ? or(gt(contactCount, v), and(eq(contactCount, v), gt(company.id, decoded.id)))!
          : or(lt(contactCount, v), and(eq(contactCount, v), lt(company.id, decoded.id)))!,
      );
    }
  }

  const order =
    forward ? [asc(sortColumn), asc(company.id)] : [desc(sortColumn), desc(company.id)];

  const [summaryRow] = await tx
    .select({
      total: sql<number>`count(*)::int`,
      customerCount: sql<number>`count(*) filter (where ${company.lifecycle} = 'customer')::int`,
      mineCount: sql<number>`count(*) filter (where ${company.ownerId} = ${session.userId})::int`,
      openDealsCount: sql<number>`count(*) filter (where coalesce(${companyStats.openDealCount}, 0) > 0)::int`,
      staleCount: sql<number>`count(*) filter (where ${company.lastActivityAt} is null or ${company.lastActivityAt} < ${staleThresholdSql})::int`,
    })
    .from(company)
    .leftJoin(companyStats, eq(companyStats.companyId, company.id))
    .where(baseOrgFilter);

  const rows = await tx
    .select({
      id: company.id,
      name: company.name,
      domain: company.domain,
      lifecycle: company.lifecycle,
      industry: company.industry,
      sizeBand: company.sizeBand,
      city: company.city,
      ownerId: company.ownerId,
      ownerName: user.fullName,
      contactCount,
      openDealsValuePence: openDealsValue,
      wonValueTotalPence: wonTotal,
      lastActivityAt: company.lastActivityAt,
      createdAt: company.createdAt,
    })
    .from(company)
    .innerJoin(user, eq(company.ownerId, user.id))
    .leftJoin(companyStats, eq(companyStats.companyId, company.id))
    .where(and(...filters))
    .orderBy(...order)
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const cursorValue =
    last == null
      ? null
      : sort === 'name'
        ? last.name
        : sort === 'created'
          ? last.createdAt.toISOString()
          : sort === 'activity'
            ? last.lastActivityAt?.toISOString() ?? ''
            : sort === 'deals'
              ? last.openDealsValuePence ?? 0
              : sort === 'won'
                ? last.wonValueTotalPence ?? 0
                : sort === 'contacts'
                  ? last.contactCount ?? 0
                  : last.name;

  const next = rows.length > limit && last && cursorValue != null ? encodeCursor(cursorValue, last.id) : null;

  const mapped: CompanyListRow[] = page.map((row) => {
    const ownerDisplay = row.ownerName?.trim() || 'User';
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      lifecycle: row.lifecycle,
      industry: row.industry,
      sizeBand: row.sizeBand,
      city: row.city,
      contactCount: row.contactCount ?? 0,
      openDealsValuePence: row.openDealsValuePence ?? 0,
      wonValueTotalPence: row.wonValueTotalPence ?? 0,
      topOpenDealStage: null,
      owner: {
        id: row.ownerId,
        fullName: ownerDisplay,
        initials: initials(ownerDisplay),
      },
      lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
      contactInitials: [],
    };
  });

  const total = summaryRow?.total ?? mapped.length;

  return {
    rows: mapped,
    nextCursor: next,
    total,
    customerCount: summaryRow?.customerCount ?? 0,
    listCounts: {
      all: total,
      mine: summaryRow?.mineCount ?? 0,
      customers: summaryRow?.customerCount ?? 0,
      open_deals: summaryRow?.openDealsCount ?? 0,
      stale: summaryRow?.staleCount ?? 0,
    },
  };
}
