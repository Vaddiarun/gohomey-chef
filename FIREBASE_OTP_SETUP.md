# Firebase Phone Auth â frontend setup (chef app)

The OTP flow now goes through a single service, [`src/services/otpService.ts`](src/services/otpService.ts),
which switches between the **legacy MSG91** flow and the **Firebase Phone Auth**
flow based on one env flag:

```
EXPO_PUBLIC_USE_FIREBASE_OTP=false   # legacy MSG91 (default)
EXPO_PUBLIC_USE_FIREBASE_OTP=true    # Firebase Phone Auth
```

Both flows return the same backend payload shape, so
[`LoginScreen`](src/screens/LoginScreen.tsx) and
[`VerificationScreen`](src/screens/VerificationScreen.tsx) branch on it
identically either way. Nothing else in the app changed.

| Flag off (`false`) | Flag on (`true`) |
|---|---|
| `POST auth/send-otp` | `auth().signInWithPhoneNumber()` (client-side, no backend call) |
| `POST auth/verify-otp` `{ phone, otp }` | `confirmation.confirm(code)` â `getIdToken()` â `POST auth/verify-firebase-token` `{ idToken }` |

## What's already done in the code

- `@react-native-firebase/app` + `@react-native-firebase/auth` (26.3.2) installed
- `otpService.ts` created; both screens call it instead of `fetch` directly
- Firebase error codes mapped to user messages (`mapOtpError`)
- `EXPO_PUBLIC_USE_FIREBASE_OTP=false` added to `.env`
- `app.json`: firebase config plugins, `android.googleServicesFile`,
  `ios.bundleIdentifier = com.gohomeyy.cookandearn`
- `android/build.gradle`: `com.google.gms:google-services:4.4.2` classpath added
- `android/app/build.gradle`: `com.google.gms.google-services` plugin applied
- `google-services.json` (project `gohomeyy-ced8f`) placed at repo root **and**
  `android/app/` â verified with `./gradlew :app:processDebugGoogleServices`

## SHA fingerprints (sent to backend for the Firebase registration)

| Key | SHA-1 | SHA-256 |
|---|---|---|
| Debug (`android/app/debug.keystore`) | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` | `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C` |
| Upload (`gohomeychef-upload-key.keystore`) | `BB:6A:E5:58:C8:E9:92:92:0B:24:07:5F:99:76:37:7B:E9:46:10:77` | `D1:BF:3A:90:F4:B6:28:3B:67:34:F1:C1:EC:FD:B7:52:9F:56:80:A6:1E:77:1A:0B:A2:B4:C4:93:51:5E:16:81` |
| Play App Signing | `9D:1F:5D:95:1F:87:C5:53:CC:5E:51:42:E8:27:FB:3E:4F:98:23:B1` | `F2:BF:F9:A6:F8:F3:AB:67:16:98:CC:E8:29:21:B6:45:A1:7C:03:A2:51:2B:4D:26:DF:B4:A8:2C:0F:3F:E7:A8` |

## What you still have to do before flipping the flag to `true`

### 1. Firebase console (project `gohomeyy-ced8f`) â backend/console owner
- [x] Android app `com.gohomeyy.cookandearn` registered; `google-services.json` received
- [ ] Authentication â Sign-in method â enable **Phone**
- [ ] Add the three keys' **SHA-1 + SHA-256** from the table above (debug, upload,
      Play App Signing). Re-share `google-services.json` afterwards if it changes.
- [ ] Authentication â Sign-in method â Phone â add **test phone numbers**
      (fixed number + fixed code) for QA / store review

> `google-services.json` is **not committed** (`/android` is gitignored and the
> root copy holds a Firebase API key). Keep it next to the local keystores.

### 2. Rebuild the native app
The Firebase native module is not in any existing build, so an OTA update will
**not** work â you must ship a new binary:

```
cd android
./gradlew clean
./gradlew assembleRelease   # or assembleDebug
```

Autolinking picks up `@react-native-firebase/*` automatically; the only manual
gradle edits were the two `google-services` lines noted above.

### 3. Test with the flag on
- Set `EXPO_PUBLIC_USE_FIREBASE_OTP=true` in `.env`, rebuild
- Sign in with a **test phone number** from step 1 (no real SMS, works on emulator)
- Confirm the app reaches `auth/verify-firebase-token` and navigation is unchanged

## Rollout

Keep `false` in production until Firebase is proven. The MSG91 path stays fully
in the codebase; flip the flag (ideally via a staged/remote mechanism) once
you're confident, then remove the legacy branch later.

## iOS (when added)

No `ios/` folder exists yet. When you add one you'll also need:
`GoogleService-Info.plist`, an APNs auth key uploaded to Firebase, Push
Notifications + Background Modes capabilities, and
`expo-build-properties` with `ios.useFrameworks: "static"` in `app.json`.
