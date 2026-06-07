export type Ok<T> = { ok: true; data: T };
export type Err<E = string> = { ok: false; error: E };
export type Result<T, E = string> = Ok<T> | Err<E>;

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

export function err<E = string>(error: E): Err<E> {
  return { ok: false, error };
}
