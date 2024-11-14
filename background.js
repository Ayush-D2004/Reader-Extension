let currentText = '';
let isPlaying = false;

// Keep track of active tabs
let activeTabId = null;

chrome.tabs.onActivated.addListener((activeInfo) => {
  activeTabId = activeInfo.tabId;
});

chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings
  chrome.storage.sync.set({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    selectedVoice: '',
    autoDetectLanguage: true
  });

  chrome.contextMenus.create({
    id: "readSelectedText",
    title: "Read Selected Text",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readSelectedText") {
    playText(info.selectionText);
  }
});

// Helper function to safely send messages to content script
async function sendMessageToContent(message) {
  try {
    // Get current active tab if we don't have one
    if (!activeTabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        activeTabId = tab.id;
      }
    }
    
    if (activeTabId) {
      chrome.tabs.sendMessage(activeTabId, message).catch(() => {
        console.log('Content script not ready or connection failed');
      });
    }
  } catch (error) {
    console.log('Error sending message:', error);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch(request.action) {
    case 'play':
      playText(request.text);
      break;
    case 'pause':
      chrome.tts.pause();
      isPlaying = false;
      sendMessageToContent({ action: 'statusUpdate', status: 'paused' });
      break;
    case 'resume':
      chrome.tts.resume();
      isPlaying = true;
      sendMessageToContent({ action: 'statusUpdate', status: 'playing' });
      break;
    case 'stop':
      chrome.tts.stop();
      isPlaying = false;
      sendMessageToContent({ action: 'statusUpdate', status: 'stopped' });
      break;
  }
  sendResponse({ status: 'success' });
  return true;
});

function playText(text) {
  chrome.storage.sync.get(['rate', 'pitch', 'volume', 'selectedVoice'], (settings) => {
    chrome.tts.stop();
    chrome.tts.speak(text, {
      rate: settings.rate,
      pitch: settings.pitch,
      volume: settings.volume,
      voiceName: settings.selectedVoice,
      onEvent: function(event) {
        if (event.type === 'start') {
          isPlaying = true;
          sendMessageToContent({ action: 'statusUpdate', status: 'playing' });
        } else if (event.type === 'end' || event.type === 'interrupted' || event.type === 'error') {
          isPlaying = false;
          sendMessageToContent({ action: 'statusUpdate', status: 'stopped' });
        }
      }
    });
  });
}

// Listener for when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    // This code runs when the extension icon is clicked
    console.log('Extension icon clicked!');
    // You can also open a popup or perform other actions here
});

// Listener for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'speak') {
        const utterance = new SpeechSynthesisUtterance(request.text);
        speechSynthesis.speak(utterance);
    } else if (request.action === 'pause') {
        speechSynthesis.pause();
    } else if (request.action === 'resume') {
        speechSynthesis.resume();
    } else if (request.action === 'stop') {
        speechSynthesis.cancel();
    }
    sendResponse({ received: true });
});