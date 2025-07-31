<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	// State management
	let timeLeft = $state(60); // Time remaining in seconds
	let initialTime = $state(60); // Initial time for percentage calculation
	let isRunning = $state(false); // Track if timer is running
	let intervalId = $state<number | null>(null);
	let hasRestoredFromStorage = $state(false); // Track if we've restored from localStorage
	let isRefreshing = $state(false); // Track refresh state
	let isNavigating = $state(false); // Track navigation state for visual feedback
	let buttonsDisabled = $state(true); // Disable buttons initially to prevent accidental clicks

	// Restore from localStorage on initial load
	$effect(() => {
		if (typeof window !== 'undefined' && !hasRestoredFromStorage) {
			const savedTimeLeft = localStorage.getItem('timer_timeLeft');
			const savedInitialTime = localStorage.getItem('timer_initialTime');
			
			if (savedTimeLeft && savedInitialTime) {
				timeLeft = parseFloat(savedTimeLeft);
				initialTime = parseFloat(savedInitialTime);
			}
			hasRestoredFromStorage = true;
		}
	});

	// Enable buttons after a delay to prevent accidental clicks from long-press release
	$effect(() => {
		if (typeof window !== 'undefined') {
			// Use a 300ms delay to ensure touch events have been processed
			const timeout = setTimeout(() => {
				buttonsDisabled = false;
			}, 300);
			
			return () => clearTimeout(timeout);
		}
	});

	// Persist timeLeft to localStorage whenever it changes (but not during initial restore)
	$effect(() => {
		if (typeof window !== 'undefined' && hasRestoredFromStorage) {
			localStorage.setItem('timer_timeLeft', timeLeft.toString());
			localStorage.setItem('timer_initialTime', initialTime.toString());
		}
	});



	// Handle settings form
	async function updateTime(newTime: number) {
		// Stop timer if it's running when time is changed
		if (isRunning) {
			isRunning = false;
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
		}
		
		// Update both time values
		timeLeft = newTime;
		initialTime = newTime;
	}

	async function resetTimer() {
		// Stop timer if it's running
		if (isRunning) {
			isRunning = false;
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
		}
		
		// Reset to the current initialTime (which may have been updated in settings)
		timeLeft = initialTime;
		// Set navigation state for visual feedback
		isNavigating = true;
		// Navigate back to main page after reset
		goto(`${base}/`, { replaceState: false });
	}

	function closeSettings() {
		// Navigate back to main page immediately
		goto(`${base}/`, { replaceState: false });
	}

	// Action to select all text in input
	function selectAll(node: HTMLInputElement) {
		node.focus();
		node.select();
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



<div class="settings-page">
	<div class="settings-form">
		<div class="form-group">
			<label for="timeInput">Total Time (seconds):</label>
			<input 
				id="timeInput" 
				type="number" 
				min="1" 
				max="3600" 
				value={initialTime}
				on:input={(e) => {
					const value = e.currentTarget.value;
					if (value === '') {
						// Allow empty input temporarily
						return;
					}
					const numValue = parseInt(value);
					if (!isNaN(numValue) && numValue >= 1) {
						updateTime(numValue);
					}
				}}
				on:blur={(e) => {
					const value = e.currentTarget.value;
					if (value === '' || parseInt(value) < 1) {
						// Set to minimum value if empty or invalid
						updateTime(1);
						e.currentTarget.value = '1';
					}
				}}
				autofocus
				use:selectAll
				inputmode="numeric"
			/>
		</div>
		
		<div class="form-actions">
			<button class="btn btn-reset" on:click={resetTimer} disabled={buttonsDisabled || isNavigating}>
				{isNavigating ? '⏳ Resetting...' : 'Reset Timer'}
			</button>
			<button class="btn btn-refresh" on:click={refreshPWA} disabled={buttonsDisabled || isRefreshing || isNavigating}>
				{isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh App'}
			</button>
			<button class="btn btn-close" on:click={closeSettings} disabled={buttonsDisabled || isNavigating}>
				{isNavigating ? '⏳ Closing...' : 'Close'}
			</button>
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #282a36;
		overflow: hidden;
	}

	.settings-page {
		width: 100vw;
		height: 100vh;
		background-color: #282a36;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.settings-form {
		background-color: #44475a;
		padding: 3rem 2rem;
		border-radius: 0;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		box-shadow: none;
		text-align: center;
	}

	.form-group {
		margin-bottom: 3rem;
		width: 100%;
		max-width: 400px;
	}

	.form-group label {
		display: block;
		color: #f8f8f2;
		margin-bottom: 1rem;
		font-weight: bold;
		text-align: center;
		font-size: 1.2rem;
	}

	.form-group input {
		width: 100%;
		padding: 1.5rem;
		border: 2px solid #6272a4;
		border-radius: 8px;
		background-color: #282a36;
		color: #f8f8f2;
		font-size: 1.5rem;
		box-sizing: border-box;
		text-align: center;
	}

	.form-group input:focus {
		outline: none;
		border-color: #8be9fd;
	}

	.form-actions {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		justify-content: center;
		width: 100%;
		max-width: 400px;
	}

	.btn {
		padding: 1.5rem 2rem;
		border: none;
		border-radius: 12px;
		font-size: 1.2rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s ease;
		width: 100%;
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

	.btn-refresh {
		background: linear-gradient(135deg, #50fa7b, #69ff94);
		color: #282a36;
		border: none;
		font-weight: bold;
	}

	.btn-refresh:hover:not(:disabled) {
		background: linear-gradient(135deg, #69ff94, #50fa7b);
		transform: translateY(-1px);
		box-shadow: 0 4px 15px rgba(80, 250, 123, 0.3);
	}

	.btn-refresh:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
		transition: opacity 0.2s ease;
	}




</style> 
