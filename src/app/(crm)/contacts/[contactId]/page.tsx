import { redirect } from 'next/navigation';

export default async function ContactProfileIndex({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  redirect(`/contacts/${contactId}/activity`);
}
