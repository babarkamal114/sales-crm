import type { EmailThreadHeaders, EmailThreadMatch } from '@/domain/conversations/types';

function normaliseMessageId(value: string): string {
  return value.replace(/^<|>$/g, '').trim();
}

/** Match inbound mail: reply token first, then threading headers, then sender. */
export function emailThreadKey(headers: EmailThreadHeaders): EmailThreadMatch {
  if (headers.replyToken?.trim()) {
    return { kind: 'reply_token', token: headers.replyToken.trim().toLowerCase() };
  }
  if (headers.inReplyTo?.trim()) {
    return {
      kind: 'in_reply_to',
      messageId: normaliseMessageId(headers.inReplyTo),
    };
  }
  const refs = headers.references ?? [];
  for (let i = refs.length - 1; i >= 0; i -= 1) {
    const ref = refs[i]?.trim();
    if (ref) {
      return { kind: 'references', messageId: normaliseMessageId(ref) };
    }
  }
  const from = headers.fromAddress?.trim().toLowerCase();
  if (from) {
    return { kind: 'from_address', address: from };
  }
  return { kind: 'none' };
}
