import type { ExtensionMessage, ExtensionMessageType } from '@/models/types';

/** Sends a message to the background service worker and awaits its response. */
export function sendToBackground<TResponse = unknown, TPayload = unknown>(
  type: ExtensionMessageType,
  payload?: TPayload,
): Promise<TResponse> {
  const message: ExtensionMessage<TPayload> = { type, payload };
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response as TResponse);
    });
  });
}

/** Sends a message to a specific tab's content script (used by background to push updates/commands). */
export function sendToTab<TResponse = unknown, TPayload = unknown>(
  tabId: number,
  type: ExtensionMessageType,
  payload?: TPayload,
): Promise<TResponse | undefined> {
  const message: ExtensionMessage<TPayload> = { type, payload };
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(undefined); // tab may not have a content script (non-swagger page) — safe to ignore
        return;
      }
      resolve(response as TResponse);
    });
  });
}

/** Subscribes to incoming runtime messages, filtering by type for ergonomics. */
export function onMessage<TPayload = unknown>(
  type: ExtensionMessageType,
  handler: (payload: TPayload, sender: chrome.runtime.MessageSender) => void,
): () => void {
  const listener = (message: ExtensionMessage<TPayload>, sender: chrome.runtime.MessageSender) => {
    if (message?.type === type) handler(message.payload as TPayload, sender);
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
