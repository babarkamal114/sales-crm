export type E2EAuthFixture = {
  email: string;
  password: string;
};

export function loadE2EAuthFixture(): E2EAuthFixture {
  const email = process.env.E2E_ADMIN_EMAIL?.trim();
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in the environment (see .env.example).',
    );
  }

  return { email, password };
}

export const e2eConfigured = Boolean(
  process.env.E2E_ADMIN_EMAIL?.trim() && process.env.E2E_ADMIN_PASSWORD,
);
