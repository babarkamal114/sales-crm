'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OpportunityCreateContext } from '@/components/create-dialog/opportunity-create-context';
import {
  type CreateCompanyPrefill,
  type CreateContactPrefill,
  type CreateDialogContextValue,
  type CreateOpportunityPrefill,
  type EntityDialogState,
} from '@/components/create-dialog/create-dialog-types';
import { fetchPipelinesForCreate } from '@/components/create-dialog/create-dialog-pipelines';
import { useCreateEntityShortcut } from '@/components/create-dialog/use-create-entity-shortcut';
import { useOpportunityDialogMeta } from '@/components/create-dialog/use-opportunity-dialog-meta';
import { useOrgRealtime } from '@/features/realtime/use-org-realtime';
import { AddContactDialog } from '@/features/contacts/components/add-contact-dialog';
import { AddCompanyDialog } from '@/features/companies/components/add-company-dialog';
import { AddOpportunityDialog } from '@/features/opportunities/components/add-opportunity-dialog';
import { applyAffected } from '@/lib/entities/invalidate';
import { qk } from '@/lib/query-keys';

const CreateDialogContext = createContext<CreateDialogContextValue | null>(null);

const CreateDialogRegistrationContext = createContext<
  ((ctx: OpportunityCreateContext | null) => void) | null
>(null);

export function useCreateDialogRegistration() {
  const setter = useContext(CreateDialogRegistrationContext);
  if (!setter) {
    throw new Error('useCreateDialogRegistration must be used within CreateDialogProvider');
  }
  return setter;
}

const emptyContactPrefill = (): CreateContactPrefill => ({});
const emptyCompanyPrefill = (): CreateCompanyPrefill => ({});
const emptyOpportunityPrefill = (): CreateOpportunityPrefill => ({});

export function CreateDialogProvider({
  children,
  userId,
  role,
}: {
  children: ReactNode;
  userId: string;
  role: string;
}) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const opportunityCreateRef = useRef<OpportunityCreateContext | null>(null);
  const setOpportunityCreateContext = useCallback((ctx: OpportunityCreateContext | null) => {
    opportunityCreateRef.current = ctx;
  }, []);

  useOrgRealtime(userId);

  const openCreateRef = useRef<CreateDialogContextValue['openCreate']>(() => {});

  const [contactState, setContactState] = useState<EntityDialogState<CreateContactPrefill>>({
    open: false,
    prefill: emptyContactPrefill(),
  });

  const [companyState, setCompanyState] = useState<EntityDialogState<CreateCompanyPrefill>>({
    open: false,
    prefill: emptyCompanyPrefill(),
  });

  const [opportunityState, setOpportunityState] = useState<EntityDialogState<CreateOpportunityPrefill>>({
    open: false,
    prefill: emptyOpportunityPrefill(),
  });

  const { data: pipelineData } = useQuery({
    queryKey: qk.opportunities.pipelines(),
    queryFn: fetchPipelinesForCreate,
    staleTime: 60_000,
  });

  const pipelines = pipelineData?.pipelines ?? [];

  const openCreate = useCallback<CreateDialogContextValue['openCreate']>(
    (kind, prefill = {}, opts) => {
      const onCreated = opts?.onCreated;

      if (kind === 'contact') {
        setContactState({
          open: true,
          prefill: prefill as CreateContactPrefill,
          ...(onCreated ? { onCreated } : {}),
        });
        return;
      }
      if (kind === 'company') {
        setCompanyState({
          open: true,
          prefill: prefill as CreateCompanyPrefill,
          ...(onCreated ? { onCreated } : {}),
        });
        return;
      }
      setOpportunityState({
        open: true,
        prefill: prefill as CreateOpportunityPrefill,
        ...(onCreated ? { onCreated } : {}),
      });
    },
    [],
  );

  openCreateRef.current = openCreate;
  useCreateEntityShortcut(pathname, opportunityCreateRef, openCreateRef);

  const ctx = useMemo(() => ({ openCreate }), [openCreate]);

  const { pipelineId, stageId, contactOptions } = useOpportunityDialogMeta(
    opportunityState.open,
    opportunityState.prefill,
    pipelines,
  );

  const closeContact = useCallback(() => {
    setContactState({ open: false, prefill: emptyContactPrefill() });
  }, []);

  const closeCompany = useCallback(() => {
    setCompanyState({ open: false, prefill: emptyCompanyPrefill() });
  }, []);

  const closeOpportunity = useCallback(() => {
    setOpportunityState({ open: false, prefill: emptyOpportunityPrefill() });
  }, []);

  return (
    <CreateDialogRegistrationContext.Provider value={setOpportunityCreateContext}>
      <CreateDialogContext.Provider value={ctx}>
        {children}

        <AddContactDialog
          open={contactState.open}
          onOpenChange={(open) => setContactState((s) => ({ ...s, open }))}
          role={role}
          userId={userId}
          defaultCompanyId={contactState.prefill.companyId ?? null}
          defaultCompanyName={contactState.prefill.companyName ?? null}
          onCreated={(contactId) => {
            applyAffected(queryClient, [{ type: 'contact', id: contactId }]);
            contactState.onCreated?.({ type: 'contact', id: contactId });
            closeContact();
          }}
        />

        <AddCompanyDialog
          open={companyState.open}
          onOpenChange={(open) => setCompanyState((s) => ({ ...s, open }))}
          role={role}
          userId={userId}
          {...(companyState.prefill.name ? { defaultName: companyState.prefill.name } : {})}
          onCreated={(companyId) => {
            applyAffected(queryClient, [{ type: 'company', id: companyId }]);
            companyState.onCreated?.({ type: 'company', id: companyId });
            closeCompany();
          }}
        />

        {pipelineId && stageId ? (
          <AddOpportunityDialog
            open={opportunityState.open}
            onOpenChange={(open) => setOpportunityState((s) => ({ ...s, open }))}
            pipelines={pipelines}
            pipelineId={pipelineId}
            stageId={stageId}
            currentUserId={userId}
            role={role}
            defaultContactId={opportunityState.prefill.contactId ?? null}
            defaultCompanyId={opportunityState.prefill.companyId ?? null}
            contactOptions={contactOptions}
            onCreated={(opportunityId) => {
              opportunityState.onCreated?.({ type: 'opportunity', id: opportunityId });
              closeOpportunity();
            }}
          />
        ) : null}
      </CreateDialogContext.Provider>
    </CreateDialogRegistrationContext.Provider>
  );
}

export function useCreateDialog(): CreateDialogContextValue {
  const value = useContext(CreateDialogContext);
  if (!value) {
    throw new Error('useCreateDialog must be used within CreateDialogProvider');
  }
  return value;
}

export type { CreateEntityKind } from '@/components/create-dialog/create-dialog-types';
