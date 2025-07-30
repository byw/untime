<script lang="ts">
	import { goto } from '$app/navigation';

	// State management using Svelte 5 syntax
	let screenWidth = $state(0);
	let screenHeight = $state(0);
	let totalDots = $state(0); // Start with 0 to prevent flash
	let gridCols = $state(10); // Track number of columns for perfect grid
	let isRunning = $state(false); // Track if timer is running
	let timeLeft = $state(60); // Time remaining in seconds
	let initialTime = $state(60); // Initial time for percentage calculation
	let intervalId = $state<number | null>(null);
	let hasRestoredFromStorage = $state(false); // Track if we've restored from localStorage
	let longPressTimer = $state<number | null>(null); // Long press timer
	let deferredPrompt = $state<any>(null); // PWA install prompt
	let showInstallPrompt = $state(false); // Show install button
	let chimeAudio = $state<HTMLAudioElement | null>(null); // Meditation chime audio
	let wakeLock = $state<WakeLockSentinel | null>(null); // Wake lock to prevent sleep
	let isAppInstalled = $state(false); // Track if app is installed
	let isRefreshing = $state(false); // Track refresh state

	// Calculate responsive dot count based on screen size
	function calculateDotCount() {
		if (typeof window !== 'undefined') {
			screenWidth = window.innerWidth;
			screenHeight = window.innerHeight;
			
			// Calculate grid based on dot size and spacing
			const dotSize = 8; // dot width/height
			const gap = 2; // gap between dots
			const padding = 16; // padding from edges (1rem = 16px)
			
			// Calculate available space
			const availableWidth = screenWidth - (padding * 2);
			const availableHeight = screenHeight - (padding * 2);
			
			// Calculate how many dots fit in each dimension
			const cols = Math.floor(availableWidth / (dotSize + gap));
			const rows = Math.floor(availableHeight / (dotSize + gap));
			
			gridCols = cols;
			totalDots = cols * rows;
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
			
			const handleResize = () => calculateDotCount();
			window.addEventListener('resize', handleResize);
			
			return () => {
				window.removeEventListener('resize', handleResize);
			};
		}
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

	// Handle swipe navigation with pointer events (works with touch, mouse, pen)
	let pointerStartX = $state(0);
	let pointerStartY = $state(0);
	let pointerEndX = $state(0);
	let pointerEndY = $state(0);
	let isSwiping = $state(false);

	function handlePointerDown(event: PointerEvent) {
		// Only handle primary pointer (left mouse button, first touch)
		if (event.isPrimary) {
			pointerStartX = event.clientX;
			pointerStartY = event.clientY;
			isSwiping = false;
		}
	}

	function handlePointerMove(event: PointerEvent) {
		if (pointerStartX === 0 || !event.isPrimary) return; // No pointer start recorded
		
		const currentX = event.clientX;
		const currentY = event.clientY;
		const deltaX = Math.abs(currentX - pointerStartX);
		const deltaY = Math.abs(currentY - pointerStartY);
		
		// If horizontal movement is significant, mark as swiping
		if (deltaX > 50 && deltaX > deltaY) {
			isSwiping = true;
		}
	}

	function handlePointerUp(event: PointerEvent) {
		if (pointerStartX === 0 || !event.isPrimary) return; // No pointer start recorded
		
		pointerEndX = event.clientX;
		pointerEndY = event.clientY;
		
		const deltaX = pointerEndX - pointerStartX;
		const deltaY = Math.abs(pointerEndY - pointerStartY);
		const minSwipeDistance = 100;
		
		// Check if it's a horizontal swipe with sufficient distance
		if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > deltaY) {
			if (deltaX > 0) {
				// Swipe right - go to settings
				goto('/untime/settings');
			} else {
				// Swipe left - already on home, do nothing
			}
		}
		
		// Reset pointer state
		pointerStartX = 0;
		pointerStartY = 0;
		pointerEndX = 0;
		pointerEndY = 0;
		isSwiping = false;
	}

	// Handle click to toggle timer
	async function toggleTimer(event: Event) {
		// Prevent toggle if swiping
		if (isSwiping) {
			return;
		}
		
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
		<button class="install-btn" on:click={installPWA}>
			📱 Install App
		</button>
	</div>
{/if}

{#if totalDots > 0}
	<div 
		class="dots-grid"
		style="grid-template-columns: repeat({gridCols}, 1fr);"
		on:click={toggleTimer}
		on:pointerdown={handlePointerDown}
		on:pointerup={handlePointerUp}
		on:pointermove={handlePointerMove}
		role="button"
		tabindex="0"
		on:keydown={(e) => e.key === ' ' && toggleTimer(e)}
	>
		{#each Array(totalDots) as _, i}
			{@const elapsedPercentage = (initialTime - timeLeft) / initialTime}
			{@const dotsToDim = Math.floor(elapsedPercentage * totalDots)}
			<div 
				class="dot" 
				class:dimmed={i < dotsToDim}
			></div>
		{/each}
	</div>
{/if}



<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #282a36;
		overflow: hidden;
	}

	.dots-grid {
		display: grid;
		gap: 2px;
		width: 100vw;
		height: 100vh;
		padding: 1rem;
		box-sizing: border-box;
		cursor: pointer;
		background-color: #282a36;
		touch-action: manipulation;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: #8be9fd;
		justify-self: center;
		align-self: center;
	}

	.dot.dimmed {
		background-color: #44475a;
	}



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
</style>
