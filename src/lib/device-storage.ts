import AsyncStorage from "expo-sqlite/kv-store"

/*
 * Durable key-value storage on the device (SQLite). Used for the query
 * cache and the offline outbox. Anything stored here stays on the device
 * after sign-out unless removed, so keys hold per-user data only when the
 * key includes the user, and sign-out clears the query cache.
 */
const deviceStorage = AsyncStorage

export { deviceStorage }
