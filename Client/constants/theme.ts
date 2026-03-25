/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#C2466A";
const tintColorDark = "#F7D7E2";

export const Colors = {
  light: {
    text: "#1F0F26",
    background: "#FFFDFE",
    tint: tintColorLight,
    icon: "#6F5360",
    tabIconDefault: "#6F5360",
    tabIconSelected: tintColorLight,
    primary: "#D94F70",
    secondary: "#7E5CAD",
    accent: "#E68DA6",
    light: "#FFF5F8",
  },
  dark: {
    text: "#FFF8FA",
    background: "#1F1622",
    tint: tintColorDark,
    icon: "#E1C7D0",
    tabIconDefault: "#E1C7D0",
    tabIconSelected: tintColorDark,
    primary: "#F07C9B",
    secondary: "#C7A6FF",
    accent: "#F4B8C8",
    light: "#352535",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
