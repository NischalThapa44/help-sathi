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
import { chatSuggestions } from "@/data/help-sathi";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  subscribeChatMessages,
  sendChatMessage,
  type ChatMessage,
} from "@/services/help-sathi-backend";

export default function ChatScreen() {
  const text = useThemeColor({}, "text");
  const light = useThemeColor({}, "light");
  const primary = useThemeColor({}, "primary");
  const { firebaseConfigured, profile, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeChatMessages(setMessages);
  }, [user]);

  const handleSend = async () => {
    if (!user || !draft.trim()) {
      return;
    }

    try {
      await sendChatMessage(
        user,
        profile?.displayName ?? user.email ?? "Help Sathi user",
        draft.trim()
      );
      setDraft("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to send message.";
      Alert.alert("Chat send failed", message);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText type="title" style={styles.heading}>
        Safety chat
      </ThemedText>
      <ThemedText style={styles.subheading}>
        A guided chat space for asking questions, preparing an alert, or getting
        calm next-step instructions.
      </ThemedText>

      <ThemedView style={[styles.chatCard, { backgroundColor: light }]}>
        {!firebaseConfigured ? (
          <ThemedText>
            Demo chat is active locally until Firebase is connected.
          </ThemedText>
        ) : null}

        {messages.map((message) => {
          const isUser = message.senderId === user?.uid;

          return (
            <View
              key={message.id}
              style={[
                styles.messageWrap,
                isUser ? styles.messageWrapEnd : styles.messageWrapStart,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  {
                    backgroundColor: isUser ? primary : "#FFFFFF",
                    borderColor: isUser ? primary : "#F1D5DF",
                  },
                ]}
              >
                <TextWithTone
                  label={message.senderName}
                  labelColor={isUser ? "#FFFFFFCC" : primary}
                  text={message.text}
                  textColor={isUser ? "#FFFFFF" : text}
                />
              </View>
            </View>
          );
        })}
      </ThemedView>

      <View style={styles.composeRow}>
        <TextInput
          style={[
            styles.composeInput,
            {
              borderColor: primary,
              backgroundColor: "#FFFFFF",
              color: text,
            },
          ]}
          placeholder="Type a message..."
          placeholderTextColor="#7A5D69"
          value={draft}
          onChangeText={setDraft}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: primary }]}
          onPress={handleSend}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.suggestionGrid}>
        {chatSuggestions.map((suggestion) => (
          <TouchableOpacity
            key={suggestion}
            style={[styles.suggestionChip, { borderColor: primary }]}
            onPress={() => setDraft(suggestion)}
          >
            <Ionicons name="sparkles" size={16} color={primary} />
            <ThemedText style={styles.suggestionText}>{suggestion}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function TextWithTone({
  label,
  labelColor,
  text,
  textColor,
}: {
  label: string;
  labelColor: string;
  text: string;
  textColor: string;
}) {
  return (
    <View style={styles.messageContent}>
      <ThemedText style={[styles.messageLabel, { color: labelColor }]}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.messageText, { color: textColor }]}>
        {text}
      </ThemedText>
    </View>
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
  chatCard: {
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  messageWrap: {
    flexDirection: "row",
  },
  messageWrapStart: {
    justifyContent: "flex-start",
  },
  messageWrapEnd: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "88%",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  messageContent: {
    gap: 4,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  messageText: {
    lineHeight: 22,
  },
  suggestionGrid: {
    gap: 10,
  },
  composeRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  composeInput: {
    flex: 1,
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  sendButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  suggestionText: {
    flex: 1,
  },
});
