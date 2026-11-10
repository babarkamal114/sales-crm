import type { ReactNode } from 'react';
import { CrmAuthLayout } from '@/app/(crm)/crm-auth-layout';

export default function CrmLayout({ children }: { children: ReactNode }) {
  return <CrmAuthLayout>{children}</CrmAuthLayout>;
}
