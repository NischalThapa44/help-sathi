import * as Notifications from "expo-notifications";
import { useEffect } from "react";

export function useNotificationObservers() {
  useEffect(() => {
    const receivedSubscription =
      Notifications.addNotificationReceivedListener(() => {
        // Foreground notifications are already displayed by the handler.
      });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(() => {
        // This is where deep-link navigation can be added later.
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);
}
