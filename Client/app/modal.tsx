import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function ModalScreen() {
  const light = useThemeColor({}, "light");

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Emergency quick guide</ThemedText>
      <ThemedText style={styles.body}>
        If you feel unsafe, move to a public place, call a trusted contact, and
        trigger the SOS button from the dashboard.
      </ThemedText>

      <View style={[styles.tipCard, { backgroundColor: light }]}>
        <ThemedText type="defaultSemiBold">Prepare in advance</ThemedText>
        <ThemedText style={styles.tipText}>
          Add emergency contacts, enable location sharing, and keep your phone
          charged before you travel.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 16,
  },
  body: {
    lineHeight: 24,
  },
  tipCard: {
    borderRadius: 22,
    padding: 18,
    gap: 8,
  },
  tipText: {
    lineHeight: 22,
  },
});
