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

	// Calculate responsive dot count based on screen size
	function calculateDotCount() {
		if (typeof window !== 'undefined') {
			screenWidth = window.innerWidth;
			screenHeight = window.innerHeight;
			
			// Calculate grid based on dot size and spacing
			const dotSize = 12; // dot width/height
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

	// Handle click to toggle timer
	function toggleTimer() {
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
</script>

{#if totalDots > 0}
	<div 
		class="dots-grid"
		style="grid-template-columns: repeat({gridCols}, 1fr);"
		on:click={toggleTimer}
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

<style>
	.dots-grid {
		display: grid;
		gap: 2px;
		width: 100vw;
		height: 100vh;
		padding: 1rem;
		box-sizing: border-box;
		cursor: pointer;
	}

	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background-color: #2563eb;
		justify-self: center;
		align-self: center;
	}

	.dot.dimmed {
		background-color: #9ca3af;
	}
</style>
