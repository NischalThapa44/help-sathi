# Help Sathi Push Notification Functions

This folder contains Firebase Functions that send Expo push notifications when:

- a new document is created in `alerts`
- a new document is created in `chatMessages`

## Setup

1. Install the dependencies in this folder:
   `cd firebase-functions && npm install`
2. Log in to Firebase CLI:
   `firebase login`
3. Initialize functions in your Firebase project if needed:
   `firebase init functions`
4. Build:
   `npm run build`
5. Deploy:
   `npm run deploy`

## Behavior

- SOS alerts notify users whose profile role is `volunteer` or `counselor`
- chat messages notify all other users with a stored `expoPushToken`
