import 'server-only';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fallbackDraft(input: {
  contactFirstName: string;
  inboundPreview: string;
  senderName: string;
  orgName: string;
}): { subject: string; html: string } {
  const first = input.contactFirstName.trim() || 'there';
  const preview = input.inboundPreview.slice(0, 280);
  return {
    subject: 'Re: Your message',
    html: `<p>Hi ${first},</p>
<p>Thank you for your reply — I read your note${preview ? `: “${preview.replace(/"/g, '&quot;')}”` : ''}.</p>
<p>[Add your response here — pricing, next steps, or a meeting link.]</p>
<p>Best,<br>${input.senderName}<br>${input.orgName}</p>`,
  };
}

export async function generateContactEmailReplyDraft(input: {
  contactFirstName: string;
  contactFullName: string;
  orgName: string;
  senderName: string;
  inboundSubject: string;
  inboundPreview: string;
  lastOutboundSubject?: string | undefined;
  lastOutboundSnippet?: string | undefined;
}): Promise<{ subject: string; html: string; usedAi: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const draft = fallbackDraft({
      contactFirstName: input.contactFirstName,
      inboundPreview: input.inboundPreview,
      senderName: input.senderName,
      orgName: input.orgName,
    });
    const subject =
      input.inboundSubject.trim().toLowerCase().startsWith('re:')
        ? input.inboundSubject.trim()
        : `Re: ${input.inboundSubject.trim() || 'Your message'}`;
    return { subject, html: draft.html, usedAi: false };
  }

  const system = `You write concise, professional sales follow-up emails for a CRM user.
Return JSON only: {"subject":"...","html":"..."} where html is a short HTML body (p tags, no scripts).`;

  const userContent = [
    `Organisation: ${input.orgName}`,
    `Sender signing as: ${input.senderName}`,
    `Contact: ${input.contactFullName}`,
    `Inbound subject: ${input.inboundSubject}`,
    `Inbound snippet: ${input.inboundPreview}`,
    input.lastOutboundSubject
      ? `Our last outbound subject: ${input.lastOutboundSubject}`
      : null,
    input.lastOutboundSnippet
      ? `Our last outbound excerpt: ${stripHtml(input.lastOutboundSnippet).slice(0, 400)}`
      : null,
    'Write a warm reply that acknowledges their message and proposes a clear next step.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      throw new Error('OpenAI request failed');
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Empty AI response');

    const parsed = JSON.parse(raw) as { subject?: string; html?: string };
    const subject = parsed.subject?.trim() || `Re: ${input.inboundSubject || 'Your message'}`;
    const html = parsed.html?.trim();
    if (!html) throw new Error('Missing html');

    return { subject, html, usedAi: true };
  } catch {
    const draft = fallbackDraft({
      contactFirstName: input.contactFirstName,
      inboundPreview: input.inboundPreview,
      senderName: input.senderName,
      orgName: input.orgName,
    });
    const subject =
      input.inboundSubject.trim().toLowerCase().startsWith('re:')
        ? input.inboundSubject.trim()
        : `Re: ${input.inboundSubject.trim() || 'Your message'}`;
    return { subject, html: draft.html, usedAi: false };
  }
}
