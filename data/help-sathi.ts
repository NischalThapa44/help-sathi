export const emergencyContacts = [
  { label: "Police", value: "100", note: "Immediate law enforcement support" },
  { label: "Ambulance", value: "102", note: "Medical emergency response" },
  { label: "Women Helpline", value: "1145", note: "Safety and crisis support" },
];

export const safetyActions = [
  {
    title: "Send SOS",
    description: "Alert your trusted circle with your live situation.",
    tone: "#B91C1C",
  },
  {
    title: "Share Location",
    description: "Let a family member or responder follow your route.",
    tone: "#1D4ED8",
  },
  {
    title: "Open Safe Route",
    description: "Show the nearest hospitals, police posts, and shelters.",
    tone: "#047857",
  },
];

export const supportRoles = [
  {
    title: "Help Seeker",
    subtitle: "Raise alerts and ask for immediate support",
    points: [
      "Create an SOS request in one tap",
      "Track who received your alert",
      "Get guidance while help is on the way",
    ],
  },
  {
    title: "Volunteer",
    subtitle: "Support nearby users during non-critical cases",
    points: [
      "Respond to low-risk community requests",
      "Share verified resources and directions",
      "Escalate to emergency services when needed",
    ],
  },
  {
    title: "Counselor",
    subtitle: "Offer emotional support and practical advice",
    points: [
      "Assist users through chat conversations",
      "Recommend next safe steps",
      "Refer urgent cases to professionals",
    ],
  },
];

export const chatMessages = [
  {
    from: "Help Sathi",
    tone: "system",
    text: "Hello. I can help you stay calm, contact support, and prepare your next safe step.",
  },
  {
    from: "You",
    tone: "user",
    text: "I want to know what to do before sending an emergency alert.",
  },
  {
    from: "Help Sathi",
    tone: "system",
    text: "Start by sharing your location, choosing a trusted contact, and keeping your phone reachable.",
  },
];

export const chatSuggestions = [
  "I need a safe route",
  "Call my emergency contact",
  "Show nearby help centers",
  "What should I do right now?",
];

export const settingsSections = [
  {
    title: "Safety preferences",
    items: [
      "Auto-share location during SOS",
      "Send alerts to 3 trusted contacts",
      "Enable loud alarm confirmation",
    ],
  },
  {
    title: "Account",
    items: [
      "Update profile and emergency details",
      "Manage password and recovery options",
      "Review your past alerts",
    ],
  },
  {
    title: "Accessibility",
    items: [
      "Nepali and English language support",
      "Large text mode",
      "High contrast emergency buttons",
    ],
  },
];
