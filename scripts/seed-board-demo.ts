/**
 * Seeds demo opportunities on the org default pipeline for local board testing.
 * Usage: pnpm exec tsx --conditions=react-server scripts/seed-board-demo.ts
 */
import { config } from 'dotenv';
import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '../src/server/db/client';
import {
  contact,
  membership,
  opportunity,
  pipeline,
  pipelineStage,
} from '../src/server/db/schema';

config({ path: '.env.local' });
config({ path: '.env' });

const DEMO_DEALS = [
  { contact: 'Oakfield Care Group', deal: '2026 shirt sponsorship', value: 25_000_000, stage: 0 },
  { contact: 'Harbour View FC', deal: 'Stadium naming rights', value: 120_000_000, stage: 1 },
  { contact: 'Meadowbank RFC', deal: 'Training kit partner', value: 8_500_000, stage: 2 },
  { contact: 'Riverside Academy', deal: 'Community programme', value: 4_000_000, stage: 3 },
  { contact: 'Northgate Logistics', deal: 'Matchday hospitality', value: 12_000_000, stage: 4 },
] as const;

async function main() {
  const db = getDb();
  const [member] = await db.select().from(membership).limit(1);
  if (!member) {
    console.error('No membership row found. Sign up first.');
    process.exit(1);
  }

  const session = {
    orgId: member.orgId,
    userId: member.userId,
    role: member.role,
  };

  const [defaultPipeline] = await db
    .select()
    .from(pipeline)
    .where(and(eq(pipeline.orgId, session.orgId), eq(pipeline.isDefault, true)))
    .limit(1);

  if (!defaultPipeline) {
    console.error('No default pipeline. Complete onboarding pipeline step.');
    process.exit(1);
  }

  const stages = await db
    .select()
    .from(pipelineStage)
    .where(eq(pipelineStage.pipelineId, defaultPipeline.id))
    .orderBy(asc(pipelineStage.position));

  const openStages = stages.filter((s) => s.kind === 'open');
  if (openStages.length === 0) {
    console.error('Pipeline has no open stages.');
    process.exit(1);
  }

  let created = 0;
  for (const [index, row] of DEMO_DEALS.entries()) {
    const stage = openStages[Math.min(row.stage, openStages.length - 1)]!;
    const now = new Date();

    const [existingContact] = await db
      .select()
      .from(contact)
      .where(and(eq(contact.orgId, session.orgId), eq(contact.displayName, row.contact)))
      .limit(1);

    const contactId =
      existingContact?.id ??
      (
        await db
          .insert(contact)
          .values({
            orgId: session.orgId,
            displayName: row.contact,
            firstName: row.contact.split(/\s+/)[0] ?? row.contact,
            lastName: row.contact.split(/\s+/).slice(1).join(' '),
            email: `${row.contact.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            emailNormalised: `${row.contact.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            ownerId: session.userId,
            marketingConsent: false,
            source: 'Seed',
            lastActivityAt: now,
            createdBy: session.userId,
            updatedBy: session.userId,
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: contact.id })
      )[0]!.id;

    const [exists] = await db
      .select({ id: opportunity.id })
      .from(opportunity)
      .where(and(eq(opportunity.orgId, session.orgId), eq(opportunity.name, row.deal)))
      .limit(1);

    if (exists) continue;

    const position = String.fromCharCode(97 + index);

    await db.insert(opportunity).values({
      orgId: session.orgId,
      contactId,
      pipelineId: defaultPipeline.id,
      stageId: stage.id,
      name: row.deal,
      status: 'open',
      valuePence: row.value,
      currency: 'GBP',
      ownerId: session.userId,
      source: index % 2 === 0 ? 'Outbound' : 'Referral',
      position,
      stageEnteredAt: now,
      lastActivityAt: now,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    });
    created += 1;
  }

  console.log(`Seeded ${created} demo opportunities on "${defaultPipeline.name}".`);
  process.exit(0);
}

void main();
