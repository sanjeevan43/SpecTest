import type { SwaggerPageInfo, ExtensionMessage, BackgroundStateResponse } from '../types';

// In-memory store of tab detection states
const activeSwaggerTabs = new Map<number, SwaggerPageInfo>();

// Log start
console.log('[Swagger API Auto Tester] Background worker initialized.');

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  activeSwaggerTabs.delete(tabId);
});

// Listener for messages
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    if (message.type === 'SWAGGER_DETECTED') {
      if (tabId !== undefined) {
        activeSwaggerTabs.set(tabId, message.payload);
        console.log(`[Swagger API Auto Tester] Swagger detected on tab ${tabId}:`, message.payload);
      }
      sendResponse({ ok: true });
    } else if (message.type === 'GET_STATE') {
      // Find the active tab in current window to return state
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab?.id) {
          sendResponse({ ok: false, detected: false, pageInfo: null } as BackgroundStateResponse);
          return;
        }

        const info = activeSwaggerTabs.get(activeTab.id) || null;
        sendResponse({
          ok: true,
          detected: !!info,
          pageInfo: info,
        } as BackgroundStateResponse);
      });
      return true; // keeps the message channel open for async response
    }
  }
);
