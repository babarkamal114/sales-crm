export function ContactComingSoonTab({ moduleName }: { moduleName: string }) {
  return (
    <div className="py-16 text-center">
      <h2 className="text-[17px] font-extrabold text-ink-900">{moduleName}</h2>
      <p className="mt-2 text-[13px] font-medium text-ink-500">
        This module is not connected in CRM yet. It will appear here when conversations, tasks, or
        documents are wired to contacts.
      </p>
    </div>
  );
}
