import 'server-only';

import type { ContactsDevScenario } from '@/domain/contacts/dev-scenario';
import { contactsScenarioListPayload } from '@/features/contacts/fixtures/scenario-fixtures';

export function getContactsListFixture(scenario: ContactsDevScenario) {
  return contactsScenarioListPayload(scenario);
}
