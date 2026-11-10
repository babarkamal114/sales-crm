import type { RenderTemplateResult, TemplateVariableMap } from '@/domain/conversations/types';

const VAR_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function fill(template: string, vars: TemplateVariableMap): { text: string; missing: string[] } {
  const missing = new Set<string>();
  const text = template.replace(VAR_PATTERN, (_match, key: string) => {
    const value = vars[key]?.trim();
    if (!value) {
      missing.add(key);
      return '';
    }
    return value;
  });
  return { text, missing: [...missing] };
}

export function renderTemplate(input: {
  body: string;
  subject?: string | null;
  vars: TemplateVariableMap;
}): RenderTemplateResult {
  const bodyFill = fill(input.body, input.vars);
  const missing = new Set(bodyFill.missing);
  let subject: string | undefined;
  if (input.subject) {
    const subjectFill = fill(input.subject, input.vars);
    subjectFill.missing.forEach((m) => missing.add(m));
    subject = subjectFill.text;
  }
  if (missing.size > 0) {
    return { ok: false, missing: [...missing].sort() };
  }
  return {
    ok: true,
    body: bodyFill.text,
    ...(subject !== undefined ? { subject } : {}),
  };
}
