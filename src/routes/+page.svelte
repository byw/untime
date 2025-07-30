<script lang="ts">
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
	let showSettings = $state(false); // Show settings form
	let longPressTimer = $state<number | null>(null); // Long press timer
	let deferredPrompt = $state<any>(null); // PWA install prompt
	let showInstallPrompt = $state(false); // Show install button

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

	// PWA install prompt handling
	$effect(() => {
		if (typeof window !== 'undefined') {
			const handleBeforeInstallPrompt = (e: Event) => {
				e.preventDefault();
				deferredPrompt = e;
				showInstallPrompt = true;
			};

			const handleAppInstalled = () => {
				showInstallPrompt = false;
				deferredPrompt = null;
			};

			window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			window.addEventListener('appinstalled', handleAppInstalled);

			return () => {
				window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
				window.removeEventListener('appinstalled', handleAppInstalled);
			};
		}
	});

	// Handle touch events for iOS compatibility
	function handleTouchStart() {
		if (showSettings) return; // Don't start long press if settings are shown
		
		longPressTimer = setTimeout(() => {
			showSettings = true;
			longPressTriggered = true; // Mark that long press was triggered
			// Pause timer when settings are shown
			if (isRunning) {
				isRunning = false;
				if (intervalId) {
					clearInterval(intervalId);
					intervalId = null;
				}
			}
		}, 800); // 800ms for touch devices
	}

	function handleTouchEnd(event: TouchEvent) {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		
		// If settings are shown and this touch ended outside the form, prevent default
		if (showSettings) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	function handleTouchMove() {
		// Cancel long press if user moves finger
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	// Track if long press was triggered to prevent click after long press
	let longPressTriggered = $state(false);

	// Handle click to toggle timer (only when settings not shown)
	function toggleTimer(event: Event) {
		// Prevent toggle if settings are shown or if this was a long press
		if (showSettings || longPressTriggered) {
			longPressTriggered = false; // Reset for next interaction
			return;
		}
		
		if (isRunning) {
			// Stop timer
			isRunning = false;
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
		} else {
			// Start timer
			isRunning = true;
			
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
				}
			}, intervalMs);
		}
	}

	// Handle settings form
	function updateTime(newTime: number) {
		timeLeft = newTime;
		initialTime = newTime;
	}

	function resetTimer() {
		timeLeft = initialTime;
		showSettings = false; // Hide settings after reset
	}

	function closeSettings(event?: Event) {
		showSettings = false;
		longPressTriggered = false; // Reset the flag when closing settings
		// Don't automatically resume timer - let user click to start/stop
	}

	// Action to select all text in input
	function selectAll(node: HTMLInputElement) {
		node.focus();
		node.select();
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
		on:touchstart={handleTouchStart}
		on:touchend={handleTouchEnd}
		on:touchmove={handleTouchMove}
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

{#if showSettings}
	<div class="settings-overlay" on:click={closeSettings} on:touchend|stopPropagation>
		<div class="settings-form" on:click|stopPropagation>
			<div class="form-group">
				<label for="timeInput">Total Time (seconds):</label>
				<input 
					id="timeInput" 
					type="number" 
					min="1" 
					max="3600" 
					value={initialTime}
					on:input={(e) => updateTime(parseInt(e.currentTarget.value) || 60)}
					autofocus
					use:selectAll
				/>
			</div>
			
			<div class="form-actions">
				<button class="btn btn-reset" on:click={resetTimer}>
					Reset Timer
				</button>
				<button class="btn btn-close" on:click={closeSettings}>
					Close
				</button>
			</div>
		</div>
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

	.settings-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-color: rgba(40, 42, 54, 0.9);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.settings-form {
		background-color: #44475a;
		padding: 2rem;
		border-radius: 8px;
		min-width: 300px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
		text-align: center;
	}

	.settings-form h2 {
		color: #f8f8f2;
		margin: 0 0 1.5rem 0;
		text-align: center;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		color: #f8f8f2;
		margin-bottom: 0.5rem;
		font-weight: bold;
		text-align: center;
	}

	.form-group input {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #6272a4;
		border-radius: 4px;
		background-color: #282a36;
		color: #f8f8f2;
		font-size: 1rem;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: #8be9fd;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-reset {
		background-color: #ff5555;
		color: white;
	}

	.btn-reset:hover {
		background-color: #ff3333;
	}

	.btn-close {
		background-color: #6272a4;
		color: white;
	}

	.btn-close:hover {
		background-color: #7c8db8;
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
