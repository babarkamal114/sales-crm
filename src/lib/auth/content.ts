export type AuthMode = 'sign-in' | 'sign-up';

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  colour: string;
}

const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'] as const;
const strengthColours = ['#DE6A61', '#D6952F', '#818CF8', '#3BA971'] as const;

/** Pure password strength scoring for sign-up. */
export function scorePassword(value: string): PasswordStrength {
  if (!value) {
    return {
      score: 0,
      label: 'Use 12+ characters with a mix of letters, numbers and symbols.',
      colour: '',
    };
  }

  let score = 0;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  const index = Math.max(0, score - 1);

  return {
    score: score as 0 | 1 | 2 | 3 | 4,
    label: `${strengthLabels[index]} password`,
    colour: strengthColours[index] ?? '',
  };
}

export const organisationNamePlaceholder = 'Your company Ltd';
export const organisationNameHelp =
  'Use the trading name your sales team recognises.';

export const authCopy = {
  'sign-in': {
    title: 'Welcome back',
    subtitle: 'Sign in to your CRM workspace.',
    submitLabel: 'Sign in',
    togglePrompt: 'New to CRM?',
    toggleAction: 'Create an account',
  },
  'sign-up': {
    title: 'Create your workspace',
    subtitle: 'Set up your CRM organisation. The first user becomes Admin.',
    submitLabel: 'Create account',
    togglePrompt: 'Already have an account?',
    toggleAction: 'Sign in',
  },
} as const;
