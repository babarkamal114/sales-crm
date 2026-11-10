import type { MentionUser } from '@/domain/conversations/types';

/** `@handle` mentions; returns matched user IDs (case-insensitive handle). */
export function parseMentions(body: string, users: MentionUser[]): string[] {
  const handles = new Map(users.map((u) => [u.handle.toLowerCase(), u.id]));
  const found = new Set<string>();
  const pattern = /@([a-zA-Z0-9_.-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const id = handles.get(match[1]!.toLowerCase());
    if (id) found.add(id);
  }
  return [...found];
}
