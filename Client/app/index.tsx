import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/context/auth-context";

function getFriendlyAuthError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";

  if (code === "auth/configuration-not-found") {
    return "Firebase Email/Password sign-in is not enabled yet. Open Firebase Console > Authentication > Sign-in method > enable Email/Password, then try again.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to continue";
}

export default function HomeScreen() {
  const [displayName, setDisplayName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [statusMessage, setStatusMessage] = useState("");
  const primary = useThemeColor({}, "primary");
  const secondary = useThemeColor({}, "secondary");
  const accent = useThemeColor({}, "accent");
  const background = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const { enterDemo, loading, register, signIn, user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 980;

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: background }]}>
        <ActivityIndicator size="large" color={primary} />
      </SafeAreaView>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  const handleLogin = async () => {
    if (!login || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (mode === "register" && !displayName.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    setIsLoading(true);
    setStatusMessage("");

    try {
      if (mode === "login") {
        await signIn(login, password);
        setStatusMessage("Signed in successfully.");
      } else {
        await register(login, password, displayName);
        setStatusMessage("Account created successfully.");
      }

      router.replace("/(tabs)");
    } catch (error) {
      const message = getFriendlyAuthError(error);
      setStatusMessage(message);
      Alert.alert("Authentication error", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterDemo = async () => {
    setIsLoading(true);
    setStatusMessage("");

    try {
      await enterDemo();
      router.replace("/(tabs)");
    } catch (error) {
      const message = getFriendlyAuthError(error);
      setStatusMessage(message);
      Alert.alert("Unable to open demo", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    setMode("register");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.shell,
            isWide ? styles.shellWide : styles.shellStack,
          ]}
        >
          <View style={styles.heroPanel}>
            <View style={[styles.heroGlow, { backgroundColor: "#FFD7E4" }]} />
            <View style={[styles.logoShell, { backgroundColor: "#FFF5F8" }]}>
              <View style={[styles.logoContainer, { borderColor: primary }]}>
                <Text style={[styles.logoText, { color: primary }]}>HS</Text>
              </View>
            </View>
            <Text style={[styles.welcomeEyebrow, { color: secondary }]}>
              Your safety, your people, your space
            </Text>
            <Text style={[styles.welcomeTitle, { color: text }]}>
              Help Sathi keeps support close when life turns uncertain.
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: text }]}>
              Sign in to enter your private safety dashboard, connect with help,
              and manage alerts only after you are inside the app.
            </Text>

            <View style={styles.promiseList}>
              <View style={[styles.promiseCard, { backgroundColor: "#FFF0F4" }]}>
                <Ionicons name="shield-checkmark" size={20} color={primary} />
                <Text style={[styles.promiseText, { color: text }]}>
                  Private tools stay behind login
                </Text>
              </View>
              <View style={[styles.promiseCard, { backgroundColor: "#F7EEFF" }]}>
                <Ionicons name="heart" size={20} color={secondary} />
                <Text style={[styles.promiseText, { color: text }]}>
                  Built for calm, fast support
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.formCard, { backgroundColor: "#FFFFFF" }]}>
            <Text style={[styles.formTitle, { color: "#1F0F26" }]}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </Text>
            <Text style={[styles.formHint, { color: "#513747" }]}>
              {mode === "login"
                ? "Sign in to open your personal Help Sathi workspace."
                : "Create an account to start using the app right away."}
            </Text>

            <View style={[styles.modeSwitch, { backgroundColor: "#F6E5EC" }]}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                { backgroundColor: mode === "login" ? primary : "transparent" },
              ]}
              onPress={() => setMode("login")}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  { color: mode === "login" ? "#fff" : "#3E2939" },
                ]}
              >
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                { backgroundColor: mode === "register" ? primary : "transparent" },
              ]}
              onPress={() => setMode("register")}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  { color: mode === "register" ? "#fff" : "#3E2939" },
                ]}
              >
                Register
              </Text>
            </TouchableOpacity>
            </View>

            {mode === "register" ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: accent,
                    backgroundColor: "#FFFFFF",
                    color: "#1F0F26",
                  },
                ]}
                placeholder="Full name"
                placeholderTextColor="#866B7A"
                value={displayName}
                onChangeText={setDisplayName}
              />
            ) : null}

            <TextInput
              style={[
                styles.input,
              {
                borderColor: accent,
                backgroundColor: "#FFFFFF",
                color: "#1F0F26",
              },
            ]}
            placeholder="Email or username"
            placeholderTextColor="#866B7A"
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            />

            <TextInput
              style={[
                styles.input,
              {
                borderColor: accent,
                backgroundColor: "#FFFFFF",
                color: "#1F0F26",
              },
            ]}
            placeholder="Password"
            placeholderTextColor="#866B7A"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            />

            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={[styles.forgotPasswordText, { color: secondary }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: primary }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                  <Text style={styles.loginButtonText}>
                    {mode === "login" ? "Enter app" : "Create account"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoButton, { borderColor: secondary }]}
              onPress={handleEnterDemo}
              disabled={isLoading}
            >
              <Text style={[styles.demoButtonText, { color: secondary }]}>
                Continue in demo mode
              </Text>
            </TouchableOpacity>

            {statusMessage ? (
              <View style={[styles.statusPill, { backgroundColor: "#FFF0F4" }]}>
                <Ionicons name="information-circle" size={16} color={primary} />
                <Text style={[styles.statusText, { color: "#4B1730" }]}>
                  {statusMessage}
                </Text>
              </View>
            ) : null}

            <View style={styles.registerContainer}>
              <Text style={[styles.registerText, { color: "#513747" }]}>
                Need an account?
              </Text>
              <TouchableOpacity onPress={handleRegister}>
                <Text style={[styles.registerLink, { color: primary }]}>
                  Register now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingVertical: 22,
    minHeight: "100%",
  },
  shell: {
    flex: 1,
    gap: 24,
    justifyContent: "center",
  },
  shellWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  shellStack: {
    flexDirection: "column",
  },
  heroPanel: {
    flex: 1,
    borderRadius: 32,
    padding: 28,
    backgroundColor: "#FFE8F0",
    overflow: "hidden",
    justifyContent: "center",
    minHeight: 360,
  },
  heroGlow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    right: -80,
    top: -70,
    opacity: 0.3,
  },
  logoShell: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  welcomeEyebrow: {
    fontSize: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 38,
    fontWeight: "bold",
    lineHeight: 44,
    maxWidth: 560,
  },
  welcomeSubtitle: {
    fontSize: 17,
    lineHeight: 28,
    maxWidth: 520,
    marginTop: 12,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 0,
  },
  logoText: {
    fontSize: 36,
    fontWeight: "bold",
  },
  promiseList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 24,
  },
  promiseCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  promiseText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#241121",
  },
  formCard: {
    flex: 1,
    borderRadius: 28,
    padding: 24,
    gap: 16,
    justifyContent: "center",
    minHeight: 360,
    borderWidth: 1,
    borderColor: "#F2D6E0",
    shadowColor: "#D94F70",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  formTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  formHint: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  modeSwitch: {
    flexDirection: "row",
    gap: 10,
    padding: 6,
    borderRadius: 16,
  },
  modeButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    height: 55,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  loginButton: {
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  demoButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  demoButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  registerText: {
    fontSize: 14,
    marginRight: 5,
    fontWeight: "500",
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  statusPill: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
