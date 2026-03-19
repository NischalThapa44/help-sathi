import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/context/auth-context";
import { emergencyContacts, safetyActions } from "@/data/help-sathi";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  createSosAlert,
  saveLiveLocation,
  subscribeUserAlerts,
  type HelpAlert,
} from "@/services/help-sathi-backend";

export default function DashboardScreen() {
  const light = useThemeColor({}, "light");
  const primary = useThemeColor({}, "primary");
  const text = useThemeColor({}, "text");
  const secondary = useThemeColor({}, "secondary");
  const { firebaseConfigured, profile, user } = useAuth();
  const [isSendingSos, setIsSendingSos] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [alerts, setAlerts] = useState<HelpAlert[]>([]);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeUserAlerts(user.uid, setAlerts);
  }, [user]);

  useEffect(() => {
    return () => {
      watcherRef.current?.remove();
    };
  }, []);

  const handleSos = async () => {
    if (!user) {
      return;
    }

    setIsSendingSos(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        throw new Error("Location permission is required to send SOS.");
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await createSosAlert(
        user,
        currentLocation.coords,
        "Emergency alert triggered from Help Sathi."
      );

      await saveLiveLocation(user.uid, currentLocation.coords);
      Alert.alert("SOS sent", "Your alert and current location were saved.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send SOS.";
      Alert.alert("SOS failed", message);
    } finally {
      setIsSendingSos(false);
    }
  };

  const toggleLocationSharing = async () => {
    if (!user) {
      return;
    }

    if (isSharingLocation) {
      watcherRef.current?.remove();
      watcherRef.current = null;
      setIsSharingLocation(false);
      Alert.alert("Location sharing stopped", "Live tracking has been paused.");
      return;
    }

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        throw new Error("Location permission is required to share live updates.");
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,
          timeInterval: 10000,
        },
        async (position) => {
          try {
            await saveLiveLocation(user.uid, position.coords);
          } catch {
            // Keep the watcher alive even if a write fails temporarily.
          }
        }
      );

      watcherRef.current = subscription;
      setIsSharingLocation(true);
      Alert.alert("Location sharing started", "Live updates are now syncing.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start location sharing.";
      Alert.alert("Location sharing failed", message);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={[styles.heroCard, { backgroundColor: light }]}>
        <View style={styles.heroHeader}>
          <View>
            <ThemedText style={styles.heroEyebrow}>Active protection</ThemedText>
            <ThemedText type="title">Help Sathi</ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: primary }]}>
            <ThemedText style={styles.statusText}>Ready</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.heroBody}>
          Your emergency dashboard keeps the most important actions nearby:
          alerting help, sharing location, and connecting to trusted contacts.
        </ThemedText>

        <TouchableOpacity
          style={[styles.sosButton, { backgroundColor: primary }]}
          activeOpacity={0.85}
          onPress={handleSos}
        >
          {isSendingSos ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="warning" size={22} color="#fff" />
              <ThemedText style={styles.sosText}>Trigger SOS</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </ThemedView>

      <View style={styles.actionGrid}>
        {safetyActions.map((action) => (
          <TouchableOpacity
            key={action.title}
            style={[styles.actionCard, { backgroundColor: light }]}
            activeOpacity={0.9}
            onPress={
              action.title === "Share Location" ? toggleLocationSharing : undefined
            }
          >
            <View style={[styles.actionDot, { backgroundColor: action.tone }]} />
            <ThemedText type="subtitle">{action.title}</ThemedText>
            <ThemedText style={{ color: text }}>{action.description}</ThemedText>
            {action.title === "Share Location" ? (
              <ThemedText
                style={{ color: secondary, fontWeight: "700", marginTop: 4 }}
              >
                {isSharingLocation ? "Sharing live location" : "Tap to start"}
              </ThemedText>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>

      <ThemedView style={[styles.backendCard, { backgroundColor: light }]}>
        <ThemedText type="subtitle">Account status</ThemedText>
        <ThemedText>
          {firebaseConfigured
            ? `Signed in as ${profile?.displayName ?? user?.email ?? "user"}`
            : `Demo mode active for ${profile?.displayName ?? user?.email ?? "user"}`}
        </ThemedText>
        {profile?.liveLocation ? (
          <ThemedText>
            Latest location: {profile.liveLocation.latitude.toFixed(4)},{" "}
            {profile.liveLocation.longitude.toFixed(4)}
          </ThemedText>
        ) : null}
      </ThemedView>

      <ThemedText type="subtitle">Emergency contacts</ThemedText>
      {emergencyContacts.map((contact) => (
        <ThemedView
          key={contact.label}
          style={[styles.contactCard, { backgroundColor: light }]}
        >
          <View style={styles.contactInfo}>
            <ThemedText type="defaultSemiBold">{contact.label}</ThemedText>
            <ThemedText>{contact.note}</ThemedText>
          </View>
          <View style={styles.contactAction}>
            <ThemedText style={styles.contactNumber}>{contact.value}</ThemedText>
          </View>
        </ThemedView>
      ))}

      <ThemedText type="subtitle">Recent alerts</ThemedText>
      {alerts.length === 0 ? (
        <ThemedView style={[styles.backendCard, { backgroundColor: light }]}>
          <ThemedText>No alerts recorded yet.</ThemedText>
        </ThemedView>
      ) : (
        alerts.map((alertItem) => (
          <ThemedView
            key={alertItem.id}
            style={[styles.contactCard, { backgroundColor: light }]}
          >
            <View style={styles.contactInfo}>
              <ThemedText type="defaultSemiBold">
                {alertItem.type.toUpperCase()} • {alertItem.status}
              </ThemedText>
              <ThemedText>{alertItem.note}</ThemedText>
            </View>
            <View style={styles.contactAction}>
              <ThemedText style={styles.alertTime}>
                {alertItem.createdAt
                  ? alertItem.createdAt.toLocaleTimeString()
                  : "now"}
              </ThemedText>
            </View>
          </ThemedView>
        ))
      )}
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
  heroCard: {
    marginTop: 24,
    borderRadius: 28,
    padding: 20,
    gap: 18,
    borderWidth: 1,
    borderColor: "#F4D8E1",
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.7,
  },
  heroBody: {
    lineHeight: 24,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusText: {
    color: "#fff",
    fontWeight: "700",
  },
  sosButton: {
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  sosText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  actionGrid: {
    gap: 12,
  },
  actionCard: {
    borderRadius: 22,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "#F4D8E1",
  },
  backendCard: {
    borderRadius: 22,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: "#F4D8E1",
  },
  actionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  contactCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#F4D8E1",
  },
  contactInfo: {
    flex: 1,
    gap: 4,
  },
  contactAction: {
    minWidth: 64,
    alignItems: "flex-end",
  },
  contactNumber: {
    fontSize: 22,
    fontWeight: "700",
  },
  alertTime: {
    fontSize: 13,
    opacity: 0.8,
  },
});
