<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	// State management using Svelte 5 syntax
	
	// Screen and Layout
	let screenWidth = $state(0);
	let screenHeight = $state(0);
	let totalDots = $state(0); // Start with 0 to prevent flash
	let gridCols = $state(10); // Track number of columns for perfect grid
	let gridRows = $state(10); // Add rows tracking
	let canvas = $state<HTMLCanvasElement | null>(null); // Canvas element reference
	
	// Timer State
	let isRunning = $state(false); // Track if timer is running
	let timeLeft = $state(60); // Time remaining in seconds
	let initialTime = $state(60); // Initial time for percentage calculation
	let intervalId = $state<number | null>(null);
	
	// Storage and Persistence
	let hasRestoredFromStorage = $state(false); // Track if we've restored from localStorage
	
	// Touch/Gesture Handling
	// Remove long-press state variables
	
	// PWA (Progressive Web App) Features
	let deferredPrompt = $state<any>(null); // PWA install prompt
	let showInstallPrompt = $state(false); // Show install button
	let isAppInstalled = $state(false); // Track if app is installed
	let isRefreshing = $state(false); // Track refresh state
	
	// Audio and Device Features
	let chimeAudio = $state<HTMLAudioElement | null>(null); // Meditation chime audio
	let wakeLock = $state<WakeLockSentinel | null>(null); // Wake lock to prevent sleep

	// Canvas rendering constants
	const DOT_SIZE = 8;
	const GAP = 2;
	const PADDING = 16;
	const ACTIVE_COLOR = '#8be9fd';
	const DIMMED_COLOR = '#44475a';

	// Calculate responsive dot count based on screen size
	function calculateDotCount() {
		if (typeof window !== 'undefined') {
			screenWidth = window.innerWidth;
			screenHeight = window.innerHeight;
			
			// Calculate available space
			const availableWidth = screenWidth - (PADDING * 2);
			const availableHeight = screenHeight - (PADDING * 2);
			
			// Calculate how many dots fit in each dimension
			gridCols = Math.floor(availableWidth / (DOT_SIZE + GAP));
			gridRows = Math.floor(availableHeight / (DOT_SIZE + GAP));
			
			totalDots = gridCols * gridRows;
		}
	}

	// Draw dots on canvas
	function drawDots() {
		if (!canvas || typeof window === 'undefined') return;
		
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		
		// Set canvas size to match screen
		canvas.width = screenWidth;
		canvas.height = screenHeight;
		
		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		// Calculate which dots should be dimmed
		const elapsedPercentage = (initialTime - timeLeft) / initialTime;
		const dotsToDim = Math.floor(elapsedPercentage * totalDots);
		
		// Draw all dots
		let dotIndex = 0;
		for (let row = 0; row < gridRows; row++) {
			for (let col = 0; col < gridCols; col++) {
				const x = PADDING + col * (DOT_SIZE + GAP) + DOT_SIZE / 2;
				const y = PADDING + row * (DOT_SIZE + GAP) + DOT_SIZE / 2;
				
				// Set color based on timer progress
				ctx.fillStyle = dotIndex < dotsToDim ? DIMMED_COLOR : ACTIVE_COLOR;
				
				// Draw circle
				ctx.beginPath();
				ctx.arc(x, y, DOT_SIZE / 2, 0, Math.PI * 2);
				ctx.fill();
				
				dotIndex++;
			}
		}
	}

	// Restore from localStorage on initial load
	$effect(() => {
		if (typeof window !== 'undefined' && !hasRestoredFromStorage) {
			const savedTimeLeft = localStorage.getItem('timer_timeLeft');
			const savedInitialTime = localStorage.getItem('timer_initialTime');
			
			if (savedTimeLeft && savedInitialTime) {
				timeLeft = parseFloat(savedTimeLeft);
				initialTime = parseFloat(savedInitialTime);
				console.log('Restored from localStorage:', { timeLeft, initialTime });
			}
			hasRestoredFromStorage = true;
		}
	});

	// Persist timeLeft to localStorage whenever it changes (but not during initial restore)
	$effect(() => {
		if (typeof window !== 'undefined' && hasRestoredFromStorage) {
			localStorage.setItem('timer_timeLeft', timeLeft.toString());
			localStorage.setItem('timer_initialTime', initialTime.toString());
		}
	});

	// Use effect to handle grid calculation on mount and resize
	$effect(() => {
		if (typeof window !== 'undefined') {
			calculateDotCount();
			drawDots(); // Draw initial dots
			
			const handleResize = () => {
				calculateDotCount();
				drawDots();
			};
			window.addEventListener('resize', handleResize);
			
			return () => {
				window.removeEventListener('resize', handleResize);
			};
		}
	});

	// Redraw dots when timer state changes
	$effect(() => {
		drawDots();
	});



	// Initialize meditation chime audio
	$effect(() => {
		if (typeof window !== 'undefined') {
			// Create a simple meditation chime using Web Audio API
			const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			const oscillator = audioContext.createOscillator();
			const gainNode = audioContext.createGain();
			
			oscillator.connect(gainNode);
			gainNode.connect(audioContext.destination);
			
			// Configure for a soft meditation chime
			oscillator.type = 'sine';
			oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // A5 note
			oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1); // B5 note
			oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2); // D6 note
			
			gainNode.gain.setValueAtTime(0, audioContext.currentTime);
			gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
			gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);
			
			// Store the audio context for later use
			chimeAudio = { context: audioContext, oscillator, gainNode } as any;
		}
	});

	// Handle page visibility changes for wake lock
	$effect(() => {
		if (typeof window !== 'undefined') {
			const handleVisibilityChange = async () => {
				if (document.hidden && wakeLock) {
					// Release wake lock when page becomes hidden
					await releaseWakeLock();
				} else if (!document.hidden && isRunning && !wakeLock) {
					// Re-request wake lock when page becomes visible and timer is running
					await requestWakeLock();
				}
			};

			document.addEventListener('visibilitychange', handleVisibilityChange);

			return () => {
				document.removeEventListener('visibilitychange', handleVisibilityChange);
			};
		}
	});

	// PWA install prompt handling
	$effect(() => {
		if (typeof window !== 'undefined') {
			// Check if app is already installed (running in standalone mode)
			if (window.matchMedia('(display-mode: standalone)').matches || 
				(window.navigator as any).standalone === true) {
				isAppInstalled = true;
			}

			const handleBeforeInstallPrompt = (e: Event) => {
				e.preventDefault();
				deferredPrompt = e;
				showInstallPrompt = true;
			};

			const handleAppInstalled = () => {
				showInstallPrompt = false;
				deferredPrompt = null;
				isAppInstalled = true;
			};

			window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			window.addEventListener('appinstalled', handleAppInstalled);

			return () => {
				window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
				window.removeEventListener('appinstalled', handleAppInstalled);
			};
		}
	});

	// Simplify toggleTimer (remove longPressDetected check)
	async function toggleTimer(event: Event) {
		if (isRunning) {
			// Stop timer
			isRunning = false;
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
			// Release wake lock when timer stops
			await releaseWakeLock();
		} else {
			// Start timer
			isRunning = true;
			
			// Request wake lock when timer starts
			await requestWakeLock();
			
			// Calculate interval so one dot dims at a time
			const intervalMs = (initialTime * 1000) / totalDots;
			
			intervalId = setInterval(() => {
				if (timeLeft > 0) {
					timeLeft -= intervalMs / 1000; // Decrease by the interval amount
					if (timeLeft < 0) timeLeft = 0; // Don't go below 0
					drawDots(); // Redraw canvas on each update
				} else {
					// Timer finished
					isRunning = false;
					if (intervalId) {
						clearInterval(intervalId);
						intervalId = null;
					}
					// Release wake lock when timer completes
					releaseWakeLock();
					// Play meditation chime when timer completes
					playChime();
				}
			}, intervalMs);
		}
	}

	// Add goToSettings function
	function goToSettings() {
		goto(`${base}/settings`);
	}

	// Action to select all text in input
	function selectAll(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	// Request wake lock to prevent device sleep
	async function requestWakeLock() {
		if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
			try {
				wakeLock = await navigator.wakeLock.request('screen');
				console.log('Wake lock acquired');
			} catch (err) {
				console.log('Wake lock failed:', err);
			}
		}
	}

	// Release wake lock to allow device sleep
	async function releaseWakeLock() {
		if (wakeLock) {
			try {
				await wakeLock.release();
				wakeLock = null;
				console.log('Wake lock released');
			} catch (err) {
				console.log('Wake lock release failed:', err);
			}
		}
	}

	// Play meditation chime
	function playChime() {
		if (chimeAudio && typeof window !== 'undefined') {
			const { context, oscillator, gainNode } = chimeAudio as any;
			
			// Resume audio context if suspended (required for iOS)
			if (context.state === 'suspended') {
				context.resume();
			}
			
			// Create new oscillator for each chime (since they can only be used once)
			const newOscillator = context.createOscillator();
			const newGainNode = context.createGain();
			
			newOscillator.connect(newGainNode);
			newGainNode.connect(context.destination);
			
			// Configure the chime
			newOscillator.type = 'sine';
			newOscillator.frequency.setValueAtTime(800, context.currentTime);
			newOscillator.frequency.setValueAtTime(1000, context.currentTime + 0.1);
			newOscillator.frequency.setValueAtTime(1200, context.currentTime + 0.2);
			
			newGainNode.gain.setValueAtTime(0, context.currentTime);
			newGainNode.gain.linearRampToValueAtTime(0.2, context.currentTime + 0.1);
			newGainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 2);
			
			newOscillator.start(context.currentTime);
			newOscillator.stop(context.currentTime + 2);
		}
	}

	// PWA install function
	function installPWA() {
		if (deferredPrompt) {
			deferredPrompt.prompt();
			deferredPrompt.userChoice.then((choiceResult: any) => {
				if (choiceResult.outcome === 'accepted') {
					console.log('User accepted the install prompt');
				} else {
					console.log('User dismissed the install prompt');
				}
				deferredPrompt = null;
				showInstallPrompt = false;
			});
		}
	}

	// Refresh PWA from server
	async function refreshPWA() {
		if (typeof window !== 'undefined') {
			isRefreshing = true;
			
			try {
				// If service worker is available, unregister it
				if ('serviceWorker' in navigator) {
					const registrations = await navigator.serviceWorker.getRegistrations();
					for (const registration of registrations) {
						await registration.unregister();
					}
				}
				
				// Clear all caches if available
				if ('caches' in window) {
					const cacheNames = await caches.keys();
					await Promise.all(
						cacheNames.map(cacheName => caches.delete(cacheName))
					);
				}
				
				// Clear localStorage to ensure fresh state
				localStorage.clear();
				
				// Force reload from server (bypass cache)
				window.location.reload();
				
			} catch (error) {
				console.error('Failed to refresh PWA:', error);
				isRefreshing = false;
				
				// Fallback: try to reload anyway
				try {
					window.location.reload();
				} catch (fallbackError) {
					console.error('Fallback reload failed:', fallbackError);
					isRefreshing = false;
				}
			}
		}
	}
</script>

{#if showInstallPrompt}
	<div class="install-prompt">
		<button class="install-btn" onclick={installPWA}>
			📱 Install App
		</button>
	</div>
{/if}

<!-- Replace the dots grid with a canvas -->
<canvas
	bind:this={canvas}
	class="timer-canvas"
	onclick={toggleTimer}
	role="button"
	tabindex="0"
	onkeydown={(e) => e.key === ' ' && toggleTimer(e)}
></canvas>

<!-- Move settings button below the canvas, centered -->
<div class="settings-btn-container">
	<button class="settings-btn-flat" onclick={goToSettings} title="Settings" aria-label="Settings">
		<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 16 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.14.31.22.65.22 1v.09A1.65 1.65 0 0 0 21 12c0 .35-.08.69-.22 1z"/></svg>
	</button>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #282a36;
		overflow: hidden;
	}

	.timer-canvas {
		display: block;
		width: 100vw;
		height: calc(100vh - 60px); /* Reduced space for button */
		cursor: pointer;
		background-color: #282a36;
		touch-action: manipulation;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}

	/* Remove the old dots-grid and dot styles */

	.install-prompt {
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 1001;
	}

	.install-btn {
		background: linear-gradient(135deg, #8be9fd, #00ffff);
		color: #282a36;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 25px;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		box-shadow: 0 4px 15px rgba(139, 233, 253, 0.3);
		transition: all 0.3s ease;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.install-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(139, 233, 253, 0.4);
		background: linear-gradient(135deg, #00ffff, #8be9fd);
	}

	.install-btn:active {
		transform: translateY(0);
	}

	.settings-btn-container {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100vw;
		height: 60px; /* Reduced height for tighter spacing */
		position: relative;
		z-index: 1001;
    margin-top: -16px;
	}

	.settings-btn-flat {
		background: none;
		border: none;
		color: #8be9fd;
		font-size: 2rem;
		padding: 0.5rem;
		border-radius: 50%;
		cursor: pointer;
		transition: background 0.2s, color 0.2s, box-shadow 0.2s;
		outline: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.settings-btn-flat:hover, .settings-btn-flat:focus {
		background: rgba(139, 233, 253, 0.12);
		color: #50fa7b;
		box-shadow: 0 2px 8px rgba(139, 233, 253, 0.15);
	}

	/* Remove the old settings-btn styles if present */
	.settings-btn { display: none !important; }
</style>
