import { Expo } from "expo-server-sdk";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

initializeApp();

const expo = new Expo();
const db = getFirestore();

type ProfileRecord = {
  role?: string;
  expoPushToken?: string;
};

async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const messages = tokens
    .filter((token) => Expo.isExpoPushToken(token))
    .map((token) => ({
      to: token,
      sound: "default" as const,
      title,
      body,
      data,
    }));

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }
}

async function getRecipientTokens(
  excludeUserId: string,
  allowedRoles?: string[]
) {
  const snapshot = await db.collection("profiles").get();

  return snapshot.docs
    .map((document) => ({
      id: document.id,
      ...(document.data() as ProfileRecord),
    }))
    .filter((profile) => {
      if (profile.id === excludeUserId) {
        return false;
      }

      if (!profile.expoPushToken) {
        return false;
      }

      if (!allowedRoles?.length) {
        return true;
      }

      return allowedRoles.includes(profile.role ?? "");
    })
    .map((profile) => profile.expoPushToken as string);
}

export const onAlertCreated = onDocumentCreated("alerts/{alertId}", async (event) => {
  const alert = event.data?.data();

  if (!alert) {
    return;
  }

  const tokens = await getRecipientTokens(alert.userId, ["volunteer", "counselor"]);

  if (tokens.length === 0) {
    return;
  }

  await sendPushNotifications(
    tokens,
    "Help Sathi SOS Alert",
    "A new emergency alert needs attention.",
    {
      type: "sos",
      alertId: event.params.alertId,
      userId: alert.userId,
    }
  );
});

export const onChatMessageCreated = onDocumentCreated(
  "chatMessages/{messageId}",
  async (event) => {
    const message = event.data?.data();

    if (!message) {
      return;
    }

    const tokens = await getRecipientTokens(message.senderId);

    if (tokens.length === 0) {
      return;
    }

    await sendPushNotifications(
      tokens,
      `New message from ${message.senderName ?? "Help Sathi"}`,
      message.text ?? "Open Help Sathi to view the conversation.",
      {
        type: "chat",
        messageId: event.params.messageId,
        senderId: message.senderId,
      }
    );
  }
);
