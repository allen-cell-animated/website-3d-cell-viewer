import { useState, useEffect, useCallback } from "react";
import localForage from "localforage";

/** Key for local storage to read/write recently opened collections */
const RECENT_COLLECTIONS_STORAGE_KEY = "recentDatasets";
const MAX_RECENT_URLS = 100;

// Adapted from the `use-localforage` hook by zikwall.
// https://github.com/zikwall/use-localforage
export function useLocalForage<T>(
  key: string,
  initialValue: T,
  errorHandler?: (e?: Error) => void
): [T | null, (value: T) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T | null>(initialValue);

  const handleError = useCallback(
    (e?: Error) => {
      if (errorHandler) {
        errorHandler(e);
      } else {
        console.error(e);
      }
    },
    [errorHandler]
  );

  useEffect(() => {
    const tryGetValueFromStorage = async (): Promise<void> => {
      try {
        const value: T | null = await localForage.getItem(key);
        if (value !== null) {
          setStoredValue(value);
        }
      } catch (e) {
        handleError(e as Error);
      }
    };
    tryGetValueFromStorage();
  }, []);

  const setValue = useCallback(
    (value) => {
      const trySetValue = async (value: any): Promise<void> => {
        try {
          setStoredValue(value);
          await localForage.setItem(key, value);
        } catch (e) {
          handleError(e as Error);
        }
      };
      trySetValue(value);
    },
    [key, handleError]
  );

  const removeValue = useCallback(() => {
    const tryRemoveValue = async (): Promise<void> => {
      try {
        setStoredValue(null);
        await localForage.removeItem(key);
      } catch (e) {
        handleError(e as Error);
      }
    };
    tryRemoveValue();
  }, [key, handleError]);

  return [storedValue, setValue, removeValue] as const;
}

// Label and URL are stored separately, so if a user provides an input URL (the label) that is transformed into an absolute
// URL, we can check for duplicates using the absolute URL while still showing the user's input.
// This is more relevant in nucmorph, where we're resolving filepaths to absolute URLs, but it's useful functionality to bake in
// for future use.

export type RecentDataUrl = {
  /** The absolute URL path, post any transformation or remapping. Stored for comparison between urls. */
  url: string;
  /** The user input that was used to load the data. */
  label: string;
};

/**
 * Wrapper around locally-stored recent urls.
 * @returns an array containing the list of recent data urls and a function to add a new url to the list.
 */
export const useRecentDataUrls = (
  initialDataUrls?: RecentDataUrl[]
): [RecentDataUrl[], (newEntry: RecentDataUrl) => void] => {
  const [recentEntries, setRecentEntries] = useLocalForage<RecentDataUrl[]>(
    RECENT_COLLECTIONS_STORAGE_KEY,
    initialDataUrls || []
  );

  /** Adds a new URL entry (url + label) to the list of recent datasets. */
  const addRecentEntry = (newEntry: RecentDataUrl): void => {
    if (recentEntries === null) {
      setRecentEntries([newEntry]);
      return;
    }

    // Find matches by absolute URL and move to front of the list if a match exists.
    const datasetIndex = recentEntries.findIndex(({ url }) => url === newEntry.url);
    if (datasetIndex === -1) {
      // New entry, add to front while maintaining max length
      setRecentEntries([newEntry as RecentDataUrl, ...recentEntries.slice(0, MAX_RECENT_URLS - 1)]);
    } else {
      // Move to front; this also updates the label if it changed.
      setRecentEntries([
        newEntry as RecentDataUrl,
        ...recentEntries.slice(0, datasetIndex),
        ...recentEntries.slice(datasetIndex + 1),
      ]);
    }
  };

  return [recentEntries || [], addRecentEntry];
};
