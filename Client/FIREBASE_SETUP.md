# Help Sathi Firebase Setup

1. Create a Firebase project.
2. Enable `Authentication` with the Email/Password provider.
3. Create a Firestore database in production or test mode.
4. Copy `.env.example` to `.env` and paste your Firebase web config values, including `EXPO_PUBLIC_EAS_PROJECT_ID`.
5. Restart Expo after editing `.env`.
6. If you want remote push delivery, deploy the Firebase Functions inside [firebase-functions](/Users/nischalthapa/Desktop/HelpSathi/firebase-functions).

Recommended Firestore collections:

- `profiles/{uid}` for user details and live location
- `profiles/{uid}.expoPushToken` for Expo push delivery
- `alerts/{alertId}` for SOS events
- `chatMessages/{messageId}` for app chat

Recommended starter Firestore rules for development:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /alerts/{alertId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null;
      allow update: if request.auth != null;
    }

    match /chatMessages/{messageId} {
      allow read, create: if request.auth != null;
    }
  }
}
```
