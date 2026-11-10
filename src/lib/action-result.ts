import type { EntityRef } from '@/lib/entities/types';

export type ActionResult<T> =
  | { ok: true; data: T; affected?: EntityRef[] }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        field?: string;
      };
    };

export function actionSuccess<T>(data: T, affected?: EntityRef[]): ActionResult<T> {
  return affected?.length ? { ok: true, data, affected } : { ok: true, data };
}

export function actionFailure(
  code: string,
  message: string,
  field?: string,
): ActionResult<never> {
  return {
    ok: false,
    error: field === undefined ? { code, message } : { code, message, field },
  };
}
