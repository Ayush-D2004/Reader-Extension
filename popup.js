document.addEventListener('DOMContentLoaded', () => {
  let voices = []; // Store voices globally for reuse

  // Load available voices
  function loadVoices() {
    voices = speechSynthesis.getVoices();
    const voiceSelect = document.getElementById('voiceSelect');
    
    if (voiceSelect) {
      voiceSelect.innerHTML = ''; // Clear existing options
      Object.keys(languageMap).forEach((lang) => {
        const option = document.createElement('option');
        option.value = lang; // Set the value to the language key
        option.textContent = lang; // Display the language name
        voiceSelect.appendChild(option);
      });
    }
  }

  // Handle voices loading
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices(); // Initial load

  // Retrieve settings from storage
  chrome.storage.sync.get(['speed', 'pitch', 'volume', 'selectedVoice'], (settings) => {
    const speedElement = document.getElementById('speed');
    const pitchElement = document.getElementById('pitch');
    const volumeElement = document.getElementById('volume');
    const voiceSelectElement = document.getElementById('voiceSelect');

    if (speedElement && pitchElement && volumeElement && voiceSelectElement) {
      // Set the values from storage or default values
      speedElement.value = settings.speed || 1; // Changed 'rate' to 'speed' for consistency
      pitchElement.value = settings.pitch || 1;
      volumeElement.value = settings.volume || 1;
      voiceSelectElement.value = settings.selectedVoice || '';

      // Update display values
      const speedValueElement = document.getElementById('speed-value');
      const pitchValueElement = document.getElementById('pitch-value');
      const volumeValueElement = document.getElementById('volume-value');

      if (speedValueElement) {
        speedValueElement.textContent = speedElement.value;
      }
      if (pitchValueElement) {
        pitchValueElement.textContent = pitchElement.value;
      }
      if (volumeValueElement) {
        volumeValueElement.textContent = volumeElement.value;
      }
    }
  });

  // Save settings when changed
  ['speed', 'pitch', 'volume'].forEach(setting => {
    const element = document.getElementById(setting);
    if (element) {
      element.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById(`${setting}-value`).textContent = value;
        chrome.storage.sync.set({ [setting]: value });
      });
    }
  });

  // Populate voice list based on selected language
  const voiceSelectElement = document.getElementById('voiceSelect');
  if (voiceSelectElement) {
    voiceSelectElement.addEventListener('change', (e) => {
      const selectedLang = e.target.value;
      const availableVoices = languageMap[selectedLang] || [];
      updateVoiceOptions(availableVoices);
    });
  }

  // Function to update voice options based on selected language
  function updateVoiceOptions(availableVoices) {
    const voiceOptions = document.getElementById('voiceOptions');
    if (voiceOptions) {
      voiceOptions.innerHTML = '';
      availableVoices.forEach((voice) => {
        const option = document.createElement('option');
        option.value = voice; // Set the value to the voice name
        option.textContent = voice; // Display the voice name
        voiceOptions.appendChild(option);
      });
    }
  }

  // Button click handlers
  const playButton = document.getElementById('playButton');
  const stopButton = document.getElementById('stopButton');

  if (playButton) {
    playButton.addEventListener('click', debounce(async () => {
      try {
        // Get selected text from the active tab
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        chrome.scripting.executeScript({
          target: {tabId: tab.id},
          function: () => window.getSelection().toString()
        }, (result) => {
          const selectedText = result[0].result;
          if (selectedText) {
            const selectedVoice = document.getElementById('voiceOptions')?.value;
            speak(selectedText, selectedVoice);
          } else {
            console.log('No text selected');
          }
        });
      } catch (error) {
        console.error('Error getting selected text:', error);
      }
    }, 300));
  }

  if (stopButton) {
    stopButton.addEventListener('click', debounce(() => {
      speechSynthesis.cancel();
    }, 300));
  }
});

function speak(text, selectedVoice) {
  const utterance = new SpeechSynthesisUtterance(text);
  const speedElement = document.getElementById('speed');
  const pitchElement = document.getElementById('pitch');
  const volumeElement = document.getElementById('volume');

  if (speedElement && pitchElement && volumeElement) {
    utterance.rate = parseFloat(speedElement.value) || 1;
    utterance.pitch = parseFloat(pitchElement.value) || 1;
    utterance.volume = parseFloat(volumeElement.value) || 1;
  }

  // Set the selected voice
  if (selectedVoice) {
    const voice = speechSynthesis.getVoices().find(v => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }
  }

  speechSynthesis.speak(utterance);
}

// Debounce function (unchanged)
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// Language mapping (unchanged)
const languageMap = {
  'English-US': [
    'Microsoft David - English (United States) (en-US)',
    'Microsoft Mark - English (United States) (en-US)',
    'Microsoft Zira - English (United States) (en-US)',
    'Google US English (en-US)'],
  'English-UK': ['Google UK English Female (en-GB)', 'Google UK English Male (en-GB)'],
  'Hindi': ['Google हिंदी (hi-IN)', 'Google हिंदी (hi-IN)'],
  'German': ['Google Deutsch (de-DE)'],
  'Spanish-Sp': ['Google español (es-ES)'],
  'Spanish-US': ['Google español de Estados Unidos (es-US)'],
  'French': ['Google français (fr-FR)'],
  'Indonesian': ['Google Bahasa Indonesia (id-ID)'],
  'Italian': ['Google italiano (it-IT)'],
  'Japanese': ['Google 日本語 (ja-JP)'],
  'Korean': ['Google 한국어 (ko-KR)'],
  'Dutch': ['Google Nederlands (nl-NL)'],
  'Polish': ['Google polski (pl-PL)'],
  'Portuguese': ['Google português do Brasil (pt-BR)'],
  'Russian': ['Google русский (ru-RU)'],
  'Mandarin-Ch': ['Google 普通话 (中国大陆) (zh-CN)'],
  'Mandarin-Tw': ['Google 國語 (臺灣) (zh-TW)'],
  'Cantonese-HK': ['Google 廣東話 (香港) (zh-HK)']
};

