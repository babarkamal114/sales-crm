import type { EntityRef } from '@/lib/entities/types';
import type {
  CreateCompanyPrefill,
  CreateContactPrefill,
  CreateOpportunityPrefill,
} from '@/lib/entities/create-prefill';

export type CreateEntityKind = 'contact' | 'company' | 'opportunity';

export type {
  CreateContactPrefill,
  CreateCompanyPrefill,
  CreateOpportunityPrefill,
};

export type CreateDialogOpenOpts = {
  onCreated?: (ref: EntityRef) => void;
};

export type CreateDialogContextValue = {
  openCreate: (
    kind: CreateEntityKind,
    prefill?: CreateContactPrefill | CreateCompanyPrefill | CreateOpportunityPrefill,
    opts?: CreateDialogOpenOpts,
  ) => void;
};

export type EntityDialogState<TPrefill> = {
  open: boolean;
  prefill: TPrefill;
  onCreated?: (ref: EntityRef) => void;
};
