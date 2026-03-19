import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  BackendUser,
  ChatMessage,
  HelpAlert,
  HelpSathiProfile,
} from "@/services/help-sathi-backend";

type DemoUserRecord = {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  role: string;
  expoPushToken?: string;
  liveLocation?: HelpSathiProfile["liveLocation"];
};

type DemoStore = {
  users: DemoUserRecord[];
  alerts: HelpAlert[];
  chatMessages: ChatMessage[];
  currentUserId: string | null;
};

const STORAGE_KEY = "@helpsathi/demo-store";

const defaultStore: DemoStore = {
  users: [],
  alerts: [],
  chatMessages: [
    {
      id: "welcome-message",
      text: "Welcome to Help Sathi. This is the local demo chat backend.",
      senderId: "system",
      senderName: "Help Sathi",
      createdAt: new Date(),
    },
  ],
  currentUserId: null,
};

const chatSubscribers = new Set<(messages: ChatMessage[]) => void>();
const alertSubscribers = new Map<string, Set<(alerts: HelpAlert[]) => void>>();

async function readStore() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultStore));
    return defaultStore;
  }

  const parsed = JSON.parse(raw) as DemoStore;

  return {
    ...parsed,
    alerts: parsed.alerts.map((alert) => ({
      ...alert,
      createdAt: alert.createdAt ? new Date(alert.createdAt) : null,
    })),
    chatMessages: parsed.chatMessages.map((message) => ({
      ...message,
      createdAt: message.createdAt ? new Date(message.createdAt) : null,
    })),
  } satisfies DemoStore;
}

async function writeStore(store: DemoStore) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function toProfile(user: DemoUserRecord): HelpSathiProfile {
  return {
    id: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    expoPushToken: user.expoPushToken,
    liveLocation: user.liveLocation,
  };
}

function toBackendUser(user: DemoUserRecord): BackendUser {
  return {
    uid: user.uid,
    email: user.email,
  };
}

async function notifyAlerts(uid: string) {
  const store = await readStore();
  const listeners = alertSubscribers.get(uid);

  if (!listeners) {
    return;
  }

  const alerts = store.alerts
    .filter((alert) => alert.userId === uid)
    .sort((left, right) => {
      const leftTime = left.createdAt?.getTime() ?? 0;
      const rightTime = right.createdAt?.getTime() ?? 0;
      return rightTime - leftTime;
    });

  listeners.forEach((listener) => listener(alerts));
}

async function notifyChat() {
  const store = await readStore();
  const messages = [...store.chatMessages].sort((left, right) => {
    const leftTime = left.createdAt?.getTime() ?? 0;
    const rightTime = right.createdAt?.getTime() ?? 0;
    return leftTime - rightTime;
  });

  chatSubscribers.forEach((listener) => listener(messages));
}

export async function demoRegister(
  email: string,
  password: string,
  displayName: string
) {
  const store = await readStore();
  const normalizedEmail = email.trim().toLowerCase();

  if (store.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error("This email is already registered.");
  }

  const newUser: DemoUserRecord = {
    uid: `demo-${Date.now()}`,
    email: normalizedEmail,
    password,
    displayName: displayName.trim() || "Help Sathi user",
    role: "help-seeker",
  };

  const nextStore = {
    ...store,
    users: [...store.users, newUser],
    currentUserId: newUser.uid,
  };

  await writeStore(nextStore);

  return {
    user: toBackendUser(newUser),
    profile: toProfile(newUser),
  };
}

export async function demoSignIn(email: string, password: string) {
  const store = await readStore();
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = store.users.find(
    (user) =>
      user.email.toLowerCase() === normalizedEmail && user.password === password
  );

  if (!existingUser) {
    throw new Error("Invalid email or password.");
  }

  await writeStore({
    ...store,
    currentUserId: existingUser.uid,
  });

  return {
    user: toBackendUser(existingUser),
    profile: toProfile(existingUser),
  };
}

export async function demoLogout() {
  const store = await readStore();
  await writeStore({
    ...store,
    currentUserId: null,
  });
}

export async function demoRestoreSession() {
  const store = await readStore();

  if (!store.currentUserId) {
    return {
      user: null,
      profile: null,
    };
  }

  const currentUser = store.users.find((user) => user.uid === store.currentUserId);

  if (!currentUser) {
    return {
      user: null,
      profile: null,
    };
  }

  return {
    user: toBackendUser(currentUser),
    profile: toProfile(currentUser),
  };
}

export async function demoGetProfile(uid: string) {
  const store = await readStore();
  const user = store.users.find((entry) => entry.uid === uid);
  return user ? toProfile(user) : null;
}

export async function demoSaveProfileDetails(
  uid: string,
  data: Pick<HelpSathiProfile, "displayName" | "role">
) {
  const store = await readStore();
  const users = store.users.map((user) =>
    user.uid === uid
      ? {
          ...user,
          displayName: data.displayName,
          role: data.role,
        }
      : user
  );

  await writeStore({
    ...store,
    users,
  });
}

export async function demoSaveExpoPushToken(uid: string, expoPushToken: string) {
  const store = await readStore();
  const users = store.users.map((user) =>
    user.uid === uid
      ? {
          ...user,
          expoPushToken,
        }
      : user
  );

  await writeStore({
    ...store,
    users,
  });
}

export async function demoSaveLiveLocation(
  uid: string,
  coords: { latitude: number; longitude: number }
) {
  const store = await readStore();
  const users = store.users.map((user) =>
    user.uid === uid
      ? {
          ...user,
          liveLocation: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            updatedAt: new Date(),
          },
        }
      : user
  );

  await writeStore({
    ...store,
    users,
  });
}

export async function demoCreateSosAlert(
  user: BackendUser,
  coords: { latitude: number; longitude: number },
  note: string
) {
  const store = await readStore();
  const alert: HelpAlert = {
    id: `alert-${Date.now()}`,
    userId: user.uid,
    type: "sos",
    status: "active",
    note,
    latitude: coords.latitude,
    longitude: coords.longitude,
    createdAt: new Date(),
  };

  await writeStore({
    ...store,
    alerts: [alert, ...store.alerts],
  });

  await notifyAlerts(user.uid);
}

export function demoSubscribeUserAlerts(
  uid: string,
  callback: (alerts: HelpAlert[]) => void
) {
  const listeners = alertSubscribers.get(uid) ?? new Set();
  listeners.add(callback);
  alertSubscribers.set(uid, listeners);

  void notifyAlerts(uid);

  return () => {
    const nextListeners = alertSubscribers.get(uid);
    nextListeners?.delete(callback);
  };
}

export async function demoSendChatMessage(
  user: BackendUser,
  senderName: string,
  text: string
) {
  const store = await readStore();
  const message: ChatMessage = {
    id: `message-${Date.now()}`,
    text,
    senderId: user.uid,
    senderName,
    createdAt: new Date(),
  };

  await writeStore({
    ...store,
    chatMessages: [...store.chatMessages, message],
  });

  await notifyChat();
}

export function demoSubscribeChatMessages(
  callback: (messages: ChatMessage[]) => void
) {
  chatSubscribers.add(callback);
  void notifyChat();

  return () => {
    chatSubscribers.delete(callback);
  };
}
