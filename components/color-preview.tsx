import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function ColorPreview() {
  const primary = useThemeColor({}, "primary");
  const secondary = useThemeColor({}, "secondary");
  const accent = useThemeColor({}, "accent");
  const light = useThemeColor({}, "light");
  const background = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <Text style={[styles.title, { color: text }]}>Your Color Palette</Text>

      <View style={styles.colorRow}>
        <View style={[styles.colorBox, { backgroundColor: primary }]}>
          <Text style={styles.colorText}>Primary</Text>
          <Text style={styles.colorCode}>#EF4444</Text>
        </View>

        <View style={[styles.colorBox, { backgroundColor: secondary }]}>
          <Text style={styles.colorText}>Secondary</Text>
          <Text style={styles.colorCode}>#8B5CF6</Text>
        </View>
      </View>

      <View style={styles.colorRow}>
        <View style={[styles.colorBox, { backgroundColor: accent }]}>
          <Text style={styles.colorText}>Accent</Text>
          <Text style={styles.colorCode}>#EC4899</Text>
        </View>

        <View style={[styles.colorBox, { backgroundColor: light }]}>
          <Text style={[styles.colorText, { color: "#333" }]}>Light</Text>
          <Text style={[styles.colorCode, { color: "#333" }]}>#FEF3C7</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
  },
  colorRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  colorBox: {
    width: 120,
    height: 120,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  colorText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  colorCode: {
    color: "white",
    fontSize: 12,
    opacity: 0.9,
  },
});
