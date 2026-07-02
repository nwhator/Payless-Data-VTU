/**
 * LocalStorage utility helpers with full TypeScript safety.
 * These handle saving, retrieving, and removing data (like tokens, users, etc.)
 */

export const saveItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
};

export const getItem = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch (error) {
    console.error(`Error parsing ${key} from storage:`, error);
    return null;
  }
};

export const removeItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing ${key} from storage:`, error);
  }
};

/**
 * Optional helpers for common app data
 * (useful if you want consistent storage keys)
 */

export const saveToken = (token: string): void => saveItem("auth_token", token);
export const getToken = (): string | null => getItem<string>("auth_token");
export const removeToken = (): void => removeItem("auth_token");

export const saveUser = (user: object): void => saveItem("user", user);
export const getUser = <T>(): T | null => getItem<T>("user");
export const removeUser = (): void => removeItem("user");
