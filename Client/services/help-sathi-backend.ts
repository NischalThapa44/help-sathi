import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import { db, firebaseConfigured } from "@/lib/firebase";
import {
  demoCreateSosAlert,
  demoGetProfile,
  demoSaveExpoPushToken,
  demoSaveLiveLocation,
  demoSaveProfileDetails,
  demoSendChatMessage,
  demoSubscribeChatMessages,
  demoSubscribeUserAlerts,
} from "@/lib/local-demo-backend";

export type BackendUser = {
  uid: string;
  email: string | null;
};

export type HelpSathiProfile = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  expoPushToken?: string;
  liveLocation?: {
    latitude: number;
    longitude: number;
    updatedAt?: Date | null;
  };
};

export type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date | null;
};

export type HelpAlert = {
  id: string;
  userId: string;
  type: "sos" | "location-share";
  status: string;
  note: string;
  latitude: number;
  longitude: number;
  createdAt: Date | null;
};

function profileRef(uid: string) {
  return doc(db, "profiles", uid);
}

function asDate(value: Timestamp | null | undefined) {
  return value ? value.toDate() : null;
}

export async function createOrUpdateProfile(
  user: BackendUser,
  data?: Partial<HelpSathiProfile>
) {
  if (!firebaseConfigured) {
    return;
  }

  await setDoc(
    profileRef(user.uid),
    {
      email: data?.email ?? user.email ?? "",
      displayName: data?.displayName ?? user.email?.split("@")[0] ?? "User",
      role: data?.role ?? "help-seeker",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getProfile(uid: string) {
  if (!firebaseConfigured) {
    return demoGetProfile(uid);
  }

  const snapshot = await getDoc(profileRef(uid));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  return {
    id: snapshot.id,
    email: data.email ?? "",
    displayName: data.displayName ?? "User",
    role: data.role ?? "help-seeker",
    expoPushToken: data.expoPushToken ?? undefined,
    liveLocation: data.liveLocation
      ? {
          latitude: data.liveLocation.latitude,
          longitude: data.liveLocation.longitude,
          updatedAt: asDate(data.liveLocation.updatedAt),
        }
      : undefined,
  } satisfies HelpSathiProfile;
}

export async function saveProfileDetails(
  uid: string,
  data: Pick<HelpSathiProfile, "displayName" | "role">
) {
  if (!firebaseConfigured) {
    return demoSaveProfileDetails(uid, data);
  }

  await updateDoc(profileRef(uid), {
    displayName: data.displayName,
    role: data.role,
    updatedAt: serverTimestamp(),
  });
}

export async function saveExpoPushToken(uid: string, expoPushToken: string) {
  if (!firebaseConfigured) {
    return demoSaveExpoPushToken(uid, expoPushToken);
  }

  await updateDoc(profileRef(uid), {
    expoPushToken,
    updatedAt: serverTimestamp(),
  });
}

export async function saveLiveLocation(
  uid: string,
  coords: { latitude: number; longitude: number }
) {
  if (!firebaseConfigured) {
    return demoSaveLiveLocation(uid, coords);
  }

  await updateDoc(profileRef(uid), {
    liveLocation: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      updatedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
}

export async function createSosAlert(
  user: BackendUser,
  coords: { latitude: number; longitude: number },
  note: string
) {
  if (!firebaseConfigured) {
    return demoCreateSosAlert(user, coords, note);
  }

  return addDoc(collection(db, "alerts"), {
    userId: user.uid,
    email: user.email ?? "",
    type: "sos",
    status: "active",
    note,
    latitude: coords.latitude,
    longitude: coords.longitude,
    createdAt: serverTimestamp(),
  });
}

export function subscribeUserAlerts(
  uid: string,
  callback: (alerts: HelpAlert[]) => void
) {
  if (!firebaseConfigured) {
    return demoSubscribeUserAlerts(uid, callback);
  }

  const alertsQuery = query(
    collection(db, "alerts"),
    orderBy("createdAt", "desc"),
    limit(10)
  );

  return onSnapshot(alertsQuery, (snapshot) => {
    const alerts = snapshot.docs
      .map((document) => {
        const data = document.data();

        if (data.userId !== uid) {
          return null;
        }

        return {
          id: document.id,
          userId: data.userId,
          type: data.type,
          status: data.status,
          note: data.note,
          latitude: data.latitude,
          longitude: data.longitude,
          createdAt: asDate(data.createdAt),
        } satisfies HelpAlert;
      })
      .filter(Boolean) as HelpAlert[];

    callback(alerts);
  });
}

export async function sendChatMessage(
  user: BackendUser,
  senderName: string,
  text: string
) {
  if (!firebaseConfigured) {
    return demoSendChatMessage(user, senderName, text);
  }

  return addDoc(collection(db, "chatMessages"), {
    text,
    senderId: user.uid,
    senderName,
    createdAt: serverTimestamp(),
  });
}

export function subscribeChatMessages(
  callback: (messages: ChatMessage[]) => void
) {
  if (!firebaseConfigured) {
    return demoSubscribeChatMessages(callback);
  }

  const messagesQuery = query(
    collection(db, "chatMessages"),
    orderBy("createdAt", "asc"),
    limit(50)
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map((document) => {
      const data = document.data();

      return {
        id: document.id,
        text: data.text ?? "",
        senderId: data.senderId ?? "",
        senderName: data.senderName ?? "User",
        createdAt: asDate(data.createdAt),
      } satisfies ChatMessage;
    });

    callback(messages);
  });
}
