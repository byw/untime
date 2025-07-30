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

	// Handle long press to show settings
	function handleMouseDown() {
		longPressTimer = setTimeout(() => {
			showSettings = true;
			// Pause timer when settings are shown
			if (isRunning) {
				isRunning = false;
				if (intervalId) {
					clearInterval(intervalId);
					intervalId = null;
				}
			}
		}, 500); // 500ms long press
	}

	function handleMouseUp() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	// Handle click to toggle timer (only when settings not shown)
	function toggleTimer() {
		if (showSettings) return; // Don't toggle if settings are shown
		
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

	function closeSettings() {
		showSettings = false;
		// Resume timer if it was running before
		if (!isRunning && timeLeft > 0) {
			toggleTimer();
		}
	}

	// Action to select all text in input
	function selectAll(node: HTMLInputElement) {
		node.focus();
		node.select();
	}
</script>

{#if totalDots > 0}
	<div 
		class="dots-grid"
		style="grid-template-columns: repeat({gridCols}, 1fr);"
		on:click={toggleTimer}
		on:mousedown={handleMouseDown}
		on:mouseup={handleMouseUp}
		on:mouseleave={handleMouseUp}
		role="button"
		tabindex="0"
		on:keydown={(e) => e.key === ' ' && toggleTimer()}
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
	<div class="settings-overlay" on:click={closeSettings}>
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
</style>
