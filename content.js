(function () {
    let progressBar = null;
    let controlsBar = null;
    let isPlaying = false;
    let lastSelectedText = '';

    // Create controls as soon as content script loads
    createControls();

    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
    }

    function togglePlayPause() {
        const textToRead = getTextToRead();
        if (!textToRead) {
            console.log('No text to read.');
            return;
        }

        if (document.hidden) {
            console.warn('The page is not active. Cannot toggle play/pause.');
            return;
        }

        try {
            if (!('speechSynthesis' in window)) {
                console.error('Speech synthesis not supported');
                return;
            }

            if (isPlaying) {
                speechSynthesis.pause();
                chrome.runtime.sendMessage({ action: 'pause' });
            } else {
                speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(textToRead);
                speechSynthesis.speak(utterance);
                chrome.runtime.sendMessage({ action: 'resume' });
            }

            isPlaying = !isPlaying;
            updatePlayPauseButton();
        } catch (error) {
            if (!error.message.includes('Extension context invalidated')) {
                console.error('Error in togglePlayPause:', error);
            }
        }
    }

    function createControls() {
        if (!controlsBar) {
            controlsBar = document.createElement('div');
            controlsBar.className = 'text-reader-controls';

            const controlsHTML = `
                <button class="reader-control-btn play-pause-btn" title="Play/Pause">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path class="play-icon" d="M5 3l14 9-14 9V3z" />
                        <g class="pause-icon" style="display:none;">
                            <line x1="6" y1="4" x2="6" y2="20" />
                            <line x1="18" y1="4" x2="18" y2="20" />
                        </g>
                    </svg>
                </button>
                <button class="reader-control-btn stop-btn" title="Stop">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="4" y="4" width="16" height="16" />
                    </svg>
                </button>
            `;

            controlsBar.innerHTML = controlsHTML;
            document.body.appendChild(controlsBar);

            // Add event listeners
            const playPauseBtn = controlsBar.querySelector('.play-pause-btn');
            const stopBtn = controlsBar.querySelector('.stop-btn');

            playPauseBtn.addEventListener('click', () => {
                console.log('Play/Pause clicked');
                // togglePlayPause();
            });

            stopBtn.addEventListener('click', () => {
                console.log('Stop clicked');
                stopReading();
            });
        }
        return controlsBar;
    }



    function stopReading() {
        // Cancel any ongoing speech synthesis
        speechSynthesis.cancel();
        isPlaying = false; // Reset the playing state
        updatePlayPauseButton(); // Update the UI to reflect the stopped state
        hideControls(); // Hide the controls
    }

    function updatePlayPauseButton() {
        if (!controlsBar) return;

        const playIcon = controlsBar.querySelector('.play-icon');
        const pauseIcon = controlsBar.querySelector('.pause-icon');

        if (playIcon && pauseIcon) {
            if (isPlaying) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
            } else {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            }
        }
    }

    function showControls(x, y) {
        if (!controlsBar) createControls();

        controlsBar.style.display = 'flex';
        controlsBar.style.top = `${y}px`;
        controlsBar.style.left = `${x}px`;

        console.log('Controls shown at:', x, y);
    }

    function hideControls() {
        if (controlsBar) {
            controlsBar.style.display = 'none';
        }
    }

    function getTextToRead() {
        return lastSelectedText; // Assuming you want to read the last selected text
    }

    // Selection handler
    document.addEventListener('mouseup', (e) => {
        const selectedText = window.getSelection().toString().trim();
        console.log('Selected text:', selectedText ? 'Yes' : 'No');

        if (selectedText) {
            lastSelectedText = selectedText;
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            const posX = e.pageX || rect.left + window.scrollX;
            const posY = (rect.bottom + window.scrollY + 5);

            console.log('Showing controls at:', posX, posY);
            showControls(posX, posY);
            updatePlayPauseButton(); // Update button state based on selection
        } else if (!isPlaying) {
            hideControls();
        }
    });

    // Click outside handler
    document.addEventListener('mousedown', (e) => {
        if (controlsBar && !controlsBar.contains(e.target)) {
            const selectedText = window.getSelection().toString().trim();
            if (!selectedText && !isPlaying) {
                hideControls();
            }
        }
    });

    // Message handler
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
            console.log('Received message:', request);

            if (request.action === 'statusUpdate') {
                // Safely update playing state
                isPlaying = request.status === 'playing';
                console.log('Status updated:', isPlaying ? 'playing' : 'not playing');

                if (isPlaying) {
                    // Safely show controls
                    try {
                        showControls();
                    } catch (showError) {
                        console.error('Error showing controls:', showError);
                    }
                }

                // Safely update play/pause button
                try {
                    updatePlayPauseButton();
                } catch (updateError) {
                    console.error('Error updating play/pause button:', updateError);
                }
            }

            sendResponse({ received: true });
        } catch (error) {
            console.error('Error in message listener:', error);
            sendResponse({ error: error.message });
        }

        return true; // Indicate that the response will be sent asynchronously
    });

    // Add this event listener to handle page unload
    window.addEventListener('beforeunload', () => {
        speechSynthesis.cancel(); // Stop any ongoing speech
        hideControls(); // Hide controls if they are visible
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden, cancel speech and reset state
            speechSynthesis.cancel();
            isPlaying = false;
            updatePlayPauseButton();
            hideControls();
        }
    });
})();