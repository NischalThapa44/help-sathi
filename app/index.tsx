import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function HomeScreen() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const primary = useThemeColor({}, "primary");
  const secondary = useThemeColor({}, "secondary");
  const accent = useThemeColor({}, "accent");
  const light = useThemeColor({}, "light");
  const background = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");

  const handleLogin = async () => {
    if (!login || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);

    // Simulate login process
    setTimeout(() => {
      setIsLoading(false);
      // Navigate to main app after successful login
      router.replace("/(tabs)");
    }, 2000);
  };

  const handleRegister = () => {
    // Navigate to register page or show register modal
    Alert.alert("Register", "Registration page coming soon!");
  };

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Welcome Title */}
      <Text style={[styles.welcomeTitle, { color: text }]}>
        Welcome to Help Sathi
      </Text>

      {/* Logo with HS */}
      <View style={[styles.logoContainer, { borderColor: primary }]}>
        <Text style={[styles.logoText, { color: primary }]}>HS</Text>
      </View>

      {/* Login Form */}
      <View style={styles.formContainer}>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: accent,
              backgroundColor: light,
              color: "#000000",
            },
          ]}
          placeholder="login"
          placeholderTextColor="#999"
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
        />

        <TextInput
          style={[
            styles.input,
            {
              borderColor: accent,
              backgroundColor: light,
              color: "#000000",
            },
          ]}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Forgot Password */}
        <TouchableOpacity style={styles.forgotPasswordContainer}>
          <Text style={[styles.forgotPasswordText, { color: secondary }]}>
            forgot password?
          </Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: primary }]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Register Section */}
      <View style={styles.registerContainer}>
        <Text style={[styles.registerText, { color: text }]}>
          Need an account?
        </Text>
        <TouchableOpacity onPress={handleRegister}>
          <Text style={[styles.registerLink, { color: primary }]}>
            Register now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 50,
  },
  logoText: {
    fontSize: 36,
    fontWeight: "bold",
  },
  formContainer: {
    marginBottom: 30,
  },
  input: {
    height: 55,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: 25,
  },
  forgotPasswordText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  loginButton: {
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    fontSize: 14,
    marginRight: 5,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});
