import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { supportRoles } from "@/data/help-sathi";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function RolesScreen() {
  const text = useThemeColor({}, "text");
  const light = useThemeColor({}, "light");
  const primary = useThemeColor({}, "primary");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText type="title" style={styles.heading}>
        Support roles
      </ThemedText>
      <ThemedText style={styles.subheading}>
        Help Sathi can work for different kinds of users. Each role focuses on
        safety, trust, and quick response.
      </ThemedText>

      {supportRoles.map((role) => (
        <ThemedView
          key={role.title}
          style={[styles.card, { backgroundColor: light }]}
        >
          <View style={styles.roleHeader}>
            <View style={[styles.roleIcon, { backgroundColor: primary }]}>
              <Ionicons name="people" size={18} color="#fff" />
            </View>
            <View style={styles.roleTitleBlock}>
              <ThemedText type="subtitle">{role.title}</ThemedText>
              <ThemedText style={{ color: text }}>{role.subtitle}</ThemedText>
            </View>
          </View>

          {role.points.map((point) => (
            <View key={point} style={styles.pointRow}>
              <Ionicons name="checkmark-circle" size={18} color={primary} />
              <ThemedText style={styles.pointText}>{point}</ThemedText>
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
  card: {
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  roleHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  roleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTitleBlock: {
    flex: 1,
    gap: 2,
  },
  pointRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  pointText: {
    flex: 1,
  },
});
