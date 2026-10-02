/**
 * Turns a backend error body into something safe to show a chef. Raw server
 * text (Prisma stack traces, SQL, file paths) is never surfaced.
 */
export type FriendlyError = {
  title: string;
  message: string;
  /** Form field the error is about, when known (e.g. a duplicate email). */
  field?: 'email' | 'phone';
};

const looksInternal = (msg: string) =>
  /prisma|invocation|constraint|\.js:\d+|stack|sql|exception|ECONN|undefined/i.test(msg);

export const friendlyApiError = (status: number, body: any, fallback = 'Something went wrong. Please try again.'): FriendlyError => {
  const raw = String(body?.message ?? body?.error ?? '');

  // Unique-constraint violations (backend currently answers 500 instead of 409).
  if (/unique constraint/i.test(raw) || status === 409) {
    if (/email/i.test(raw)) {
      return {
        title: 'Email already registered',
        message: 'This email is linked to another account. Please use a different email.',
        field: 'email',
      };
    }
    if (/phone|mobile/i.test(raw)) {
      return {
        title: 'Number already registered',
        message: 'This mobile number already has an account. Please log in instead.',
        field: 'phone',
      };
    }
    return { title: 'Already exists', message: 'Some of these details are already in use. Please check and try again.' };
  }

  if (status >= 500 || !raw || looksInternal(raw)) {
    return { title: 'Something went wrong', message: fallback };
  }

  return { title: 'Error', message: raw };
};

/** Message for a thrown fetch/JS error — "Network request failed" becomes plain words. */
export const errorText = (err: any, fallback: string) => {
  const msg = String(err?.message ?? '');
  if (/network request failed|failed to fetch|timeout|abort/i.test(msg)) return 'No internet connection.';
  return msg && !looksInternal(msg) ? msg : fallback;
};
