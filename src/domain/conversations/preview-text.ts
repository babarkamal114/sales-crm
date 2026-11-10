const MAX_PREVIEW = 140;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripQuotedReply(text: string): string {
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];
  for (const line of lines) {
    if (/^>/.test(line)) break;
    if (/^On .+ wrote:$/i.test(line.trim())) break;
    if (/^-{2,}\s*Original Message\s*-{2,}$/i.test(line.trim())) break;
    if (/^From:\s/i.test(line.trim()) && kept.length > 2) break;
    kept.push(line);
  }
  return kept.join('\n').trim();
}

function stripSignature(text: string): string {
  const parts = text.split(/\n--\s*\n/);
  return parts[0]?.trim() ?? text;
}

export function previewText(input: {
  bodyText?: string | null;
  bodyHtml?: string | null;
}): string {
  let text = input.bodyText?.trim() ?? '';
  if (!text && input.bodyHtml) {
    text = stripHtml(input.bodyHtml);
  }
  text = stripQuotedReply(text);
  text = stripSignature(text);
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length <= MAX_PREVIEW) return text;
  return `${text.slice(0, MAX_PREVIEW - 1)}…`;
}
