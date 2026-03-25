import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/context/auth-context";
import { settingsSections } from "@/data/help-sathi";
import { useThemeColor } from "@/hooks/use-theme-color";
import { saveProfileDetails } from "@/services/help-sathi-backend";

export default function SettingsScreen() {
  const text = useThemeColor({}, "text");
  const light = useThemeColor({}, "light");
  const secondary = useThemeColor({}, "secondary");
  const primary = useThemeColor({}, "primary");
  const background = useThemeColor({}, "background");
  const { firebaseConfigured, logout, profile, refreshProfile, user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("help-seeker");

  useEffect(() => {
    setDisplayName(profile?.displayName ?? "");
    setRole(profile?.role ?? "help-seeker");
  }, [profile]);

  const handleSave = async () => {
    if (!user) {
      return;
    }

    try {
      await saveProfileDetails(user.uid, {
        displayName: displayName.trim() || "Help Sathi user",
        role,
      });
      await refreshProfile(user.uid);
      Alert.alert("Saved", "Your profile details were updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save profile.";
      Alert.alert("Save failed", message);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText type="title" style={styles.heading}>
        Settings
      </ThemedText>
      <ThemedText style={styles.subheading}>
        Configure the app the way you want before an emergency happens.
      </ThemedText>

      <ThemedView style={[styles.profileCard, { backgroundColor: light }]}>
        <View style={[styles.avatar, { backgroundColor: secondary }]}>
          <Ionicons name="person" size={26} color="#fff" />
        </View>
        <View style={styles.profileText}>
          <ThemedText type="subtitle">
            {profile?.displayName ?? "Help Sathi user"}
          </ThemedText>
          <ThemedText style={{ color: text }}>
            {user?.email ?? "No authenticated user"}
          </ThemedText>
          <ThemedText style={{ color: text }}>
            Push status: {profile?.expoPushToken ? "Connected" : "Not registered"}
          </ThemedText>
          <ThemedText style={{ color: text }}>
            Mode: {firebaseConfigured ? "Firebase live" : "Local demo"}
          </ThemedText>
        </View>
      </ThemedView>

      <ThemedView style={[styles.sectionCard, { backgroundColor: light }]}>
        <ThemedText type="subtitle">Profile backend</ThemedText>
        <TextInput
          style={[
            styles.input,
            { borderColor: secondary, backgroundColor: background, color: text },
          ]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          placeholderTextColor="#999"
        />
        <View style={styles.roleRow}>
          {["help-seeker", "volunteer", "counselor"].map((roleOption) => (
            <TouchableOpacity
              key={roleOption}
              style={[
                styles.roleChip,
                {
                  backgroundColor: role === roleOption ? primary : background,
                },
              ]}
              onPress={() => setRole(roleOption)}
            >
              <ThemedText
                style={{ color: role === roleOption ? "#fff" : text }}
              >
                {roleOption}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: primary }]}
          onPress={handleSave}
        >
          <ThemedText style={styles.primaryButtonText}>Save profile</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: secondary }]}
          onPress={logout}
        >
          <ThemedText style={{ color: secondary }}>Log out</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {settingsSections.map((section) => (
        <ThemedView
          key={section.title}
          style={[styles.sectionCard, { backgroundColor: light }]}
        >
          <ThemedText type="subtitle">{section.title}</ThemedText>
          {section.items.map((item) => (
            <View key={item} style={styles.settingRow}>
              <Ionicons name="chevron-forward" size={18} color={secondary} />
              <ThemedText style={styles.settingText}>{item}</ThemedText>
            </View>
          ))}
        </ThemedView>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  heading: {
    marginTop: 24,
  },
  subheading: {
    lineHeight: 24,
  },
  profileCard: {
    borderRadius: 24,
    padding: 18,
    gap: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: {
    flex: 1,
    gap: 4,
  },
  sectionCard: {
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  roleChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  settingText: {
    flex: 1,
  },
});
