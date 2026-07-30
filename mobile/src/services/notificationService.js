// expo-notifications remote push is not supported in Expo Go (SDK 53+).
// Notification badges are handled in-app via socket events instead.

export const requestNotificationPermission = async () => false;

export const showMessageNotification = async () => {};
