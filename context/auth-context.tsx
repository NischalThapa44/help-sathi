import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { auth, firebaseConfigured } from "@/lib/firebase";
import {
  demoLogout,
  demoRegister,
  demoRestoreSession,
  demoSignIn,
} from "@/lib/local-demo-backend";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import {
  type BackendUser,
  createOrUpdateProfile,
  getProfile,
  type HelpSathiProfile,
  saveExpoPushToken,
} from "@/services/help-sathi-backend";

type AuthContextValue = {
  user: BackendUser | null;
  profile: HelpSathiProfile | null;
  loading: boolean;
  firebaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: (uid: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [profile, setProfile] = useState<HelpSathiProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured) {
      void demoRestoreSession().then(({ user: demoUser, profile: demoProfile }) => {
        setUser(demoUser);
        setProfile(demoProfile);
        setLoading(false);
      });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      await createOrUpdateProfile(nextUser, {
        email: nextUser.email ?? "",
      });

      try {
        const expoPushToken = await registerForPushNotificationsAsync();
        await saveExpoPushToken(nextUser.uid, expoPushToken);
      } catch {
        // The app should still work even if push registration is unavailable.
      }

      const nextProfile = await getProfile(nextUser.uid);
      setProfile(nextProfile);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      firebaseConfigured,
      async signIn(email, password) {
        if (!firebaseConfigured) {
          const nextState = await demoSignIn(email, password);
          setUser(nextState.user);
          setProfile(nextState.profile);
          return;
        }

        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      async register(email, password, displayName) {
        if (!firebaseConfigured) {
          const nextState = await demoRegister(email, password, displayName);
          setUser(nextState.user);
          setProfile(nextState.profile);
          return;
        }

        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        await createOrUpdateProfile(credential.user, {
          email: credential.user.email ?? email.trim(),
          displayName: displayName.trim() || "Help Sathi user",
        });
      },
      async logout() {
        if (!firebaseConfigured) {
          await demoLogout();
          setUser(null);
          setProfile(null);
          return;
        }

        await signOut(auth);
      },
      async refreshProfile(uid) {
        const nextProfile = await getProfile(uid);
        setProfile(nextProfile);
      },
    }),
    [loading, profile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
