export type EmailMergeContext = {
  firstName: string;
  lastName: string;
  fullName: string;
  company: string | null;
  senderName: string;
  orgName: string;
};

const TOKEN_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/gi;

function fallbackCompany(name: string | null): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'your organisation';
}

export function buildEmailMergeContext(input: {
  firstName: string;
  lastName: string;
  displayName: string;
  companyName: string | null;
  senderName: string;
  orgName: string;
}): EmailMergeContext {
  return {
    firstName: input.firstName.trim() || 'there',
    lastName: input.lastName.trim(),
    fullName: input.displayName.trim() || 'there',
    company: input.companyName,
    senderName: input.senderName.trim() || 'The team',
    orgName: input.orgName.trim() || 'CRM',
  };
}

function resolveToken(token: string, ctx: EmailMergeContext): string {
  switch (token.toLowerCase()) {
    case 'first_name':
      return ctx.firstName;
    case 'last_name':
      return ctx.lastName || '';
    case 'full_name':
      return ctx.fullName;
    case 'company':
      return fallbackCompany(ctx.company);
    case 'sender_name':
      return ctx.senderName;
    case 'org_name':
      return ctx.orgName;
    case 'next_week':
      return 'next week';
    default:
      return '';
  }
}

export function mergeEmailTemplate(text: string, ctx: EmailMergeContext): string {
  return text.replace(TOKEN_PATTERN, (_match, token: string) => resolveToken(token, ctx));
}

export function templateContainsMergeTokens(text: string): boolean {
  TOKEN_PATTERN.lastIndex = 0;
  return TOKEN_PATTERN.test(text);
}
