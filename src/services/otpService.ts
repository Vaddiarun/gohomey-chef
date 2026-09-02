/**
 * OTP service â abstracts the two phone-verification backends behind one API:
 *
 *   - Legacy (MSG91):   POST auth/send-otp  ->  POST auth/verify-otp
 *   - Firebase Phone:   auth().signInWithPhoneNumber  ->  confirmation.confirm
 *                       ->  POST auth/verify-firebase-token
 *
 * Which one is used is controlled by the EXPO_PUBLIC_USE_FIREBASE_OTP flag so we
 * can roll the Firebase flow out gradually and fall back to MSG91 if needed.
 * See FIREBASE_OTP_FRONTEND_PLAN.md.
 *
 * The Firebase SDK is required lazily (only when the flag is on) so the legacy
 * flow keeps working on builds that don't yet bundle the native Firebase module.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export const USE_FIREBASE_OTP =
  process.env.EXPO_PUBLIC_USE_FIREBASE_OTP === 'true';

// The pending Firebase confirmation result. It is not serialisable, so it can't
// be passed through navigation params â we hold it here between the "send" step
// (LoginScreen) and the "verify" step (VerificationScreen).
let firebaseConfirmation: any = null;

// @react-native-firebase v26 is modular-only (no default export). Lazy-required
// so the legacy MSG91 path still works on builds without the native module.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const loadFirebaseAuth = () => require('@react-native-firebase/auth');

/**
 * Sends the OTP to the given phone number (E.164, e.g. "+919876543210").
 * On the Firebase path this triggers the SMS entirely client-side; no backend
 * call is made here.
 */
export const sendOtp = async (phoneE164: string): Promise<void> => {
  console.log('[otp] sendOtp path:', USE_FIREBASE_OTP ? 'FIREBASE' : 'MSG91', phoneE164);
  if (USE_FIREBASE_OTP) {
    const { getAuth, signInWithPhoneNumber } = loadFirebaseAuth();
    firebaseConfirmation = await signInWithPhoneNumber(getAuth(), phoneE164);
    return;
  }

  const response = await fetch(`${API_URL}auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ phone: phoneE164 }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to send OTP');
  }
};

/**
 * Verifies the entered code and returns the backend auth payload.
 *
 * The returned shape is identical for both flows (isNewUser / isChef /
 * registrationStep / applicationStatus / token / user), so callers can branch
 * on it the same way regardless of which backend verified the code.
 */
export const verifyOtp = async (
  phoneE164: string,
  code: string,
): Promise<any> => {
  if (USE_FIREBASE_OTP) {
    if (!firebaseConfirmation) {
      throw new Error(
        'Verification session expired. Please request a new code.',
      );
    }

    const { getIdToken } = loadFirebaseAuth();
    const credential = await firebaseConfirmation.confirm(code);
    const idToken = await getIdToken(credential.user);

    const response = await fetch(`${API_URL}auth/verify-firebase-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Failed to verify OTP');
    }

    firebaseConfirmation = null;
    return data;
  }

  const response = await fetch(`${API_URL}auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ phone: phoneE164, otp: code }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Failed to verify OTP');
  }

  return data;
};

/**
 * Maps a thrown OTP error (Firebase SDK error codes, or a plain Error from the
 * fetch calls above) to a user-facing message.
 */
export const mapOtpError = (error: any): string => {
  switch (error?.code) {
    case 'auth/invalid-phone-number':
      return 'That phone number looks invalid. Please check and try again.';
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'Too many attempts. Please try again later.';
    case 'auth/invalid-verification-code':
      return 'Incorrect code. Please check and try again.';
    case 'auth/session-expired':
    case 'auth/code-expired':
      return 'That code has expired. Please request a new one.';
    case 'auth/missing-client-identifier':
    case 'auth/app-not-authorized':
      return 'Phone verification is unavailable on this device. Please try again later.';
    default:
      return error?.message || 'Something went wrong. Please try again.';
  }
};
