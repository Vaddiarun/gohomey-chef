/**
 * Thin fetch helpers shared by the auth flow.
 *
 * The backend signals auth problems with a machine-readable `code` in the JSON
 * body of a 401 response:
 *
 *   - "TOKEN_EXPIRED"  the token was valid but has aged out  -> re-verify by OTP
 *   - "UNAUTHORIZED"   no / malformed / unknown token         -> treat as logged out
 *
 * `ApiError` carries that code through so callers (and AuthContext) can branch
 * on it instead of string-matching messages.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export type ApiErrorCode = 'TOKEN_EXPIRED' | 'UNAUTHORIZED' | string;

export class ApiError extends Error {
  status: number;
  code?: ApiErrorCode;
  data: any;

  constructor(message: string, status: number, code?: ApiErrorCode, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }

  /**
   * True when the session is gone and the user must re-authenticate — either
   * expired (401) or a token without chef access, e.g. a leftover registration
   * token (403 "Insufficient permissions").
   */
  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }
}

/**
 * Parses a fetch Response as JSON and throws an `ApiError` for non-2xx.
 * `code` is lifted from the body so 401s can be told apart.
 */
export const parseJson = async (response: Response): Promise<any> => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Request failed (${response.status})`,
      response.status,
      data?.code,
      data,
    );
  }

  return data;
};

/**
 * Exchanges the current token for a fresh one.
 *
 * Used in two places:
 *   - app launch/resume, to upgrade a short-lived registration token (or a
 *     still-valid session token) into a fresh session token
 *   - as a fallback if a register step response is missing `token`
 *
 * Returns the raw payload: { token, user?, isNewUser?, registrationStep? }.
 * Throws `ApiError` (with `.code`) on 401.
 */
export const refreshSession = async (token: string): Promise<any> => {
  const response = await fetch(`${API_URL}auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  });

  return parseJson(response);
};

/** Normalises the assorted casings the backend uses across endpoints. */
export const readAuthPayload = (data: any) => ({
  token: data?.token,
  user: data?.user ?? null,
  isNewUser: data?.isNewUser ?? data?.is_new_user ?? false,
  isChef: data?.isChef ?? data?.is_chef ?? false,
  registrationStep: data?.registrationStep ?? data?.registration_step,
  applicationStatus: data?.applicationStatus ?? data?.application_status,
});

/**
 * An "established chef" can enter the app. Anyone else who verifies on the chef
 * app — a brand-new number, or an existing role:USER account, or a chef with an
 * unfinished draft — belongs in the registration flow, not the dashboard.
 */
export const isEstablishedChef = (p: ReturnType<typeof readAuthPayload>) =>
  p.isChef && !!p.applicationStatus && p.applicationStatus !== 'DRAFT';
