<script lang="ts">
	// State management using Svelte 5 syntax
	let timeLeft = $state(60); // Default 60 seconds countdown
	let initialTime = $state(60); // Track the initial time for percentage calculation
	let isRunning = $state(false);
	let intervalId = $state<number | null>(null);
	let screenWidth = $state(0);
	let totalDots = $state(0); // Start with 0 to prevent flash
	let gridCols = $state(10); // Track number of columns for perfect grid

	// Initialize from localStorage on client side
	if (typeof window !== 'undefined') {
		timeLeft = parseInt(localStorage.getItem('timer_timeLeft') || '60');
		initialTime = timeLeft; // Set initial time to current timeLeft
	}

	// Persist timeLeft to localStorage whenever it changes
	$effect(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem('timer_timeLeft', timeLeft.toString());
		}
	});

	// Calculate responsive dot count based on screen size
	function calculateDotCount() {
		if (typeof window !== 'undefined') {
			screenWidth = window.innerWidth;
			// Base calculation: 1 dot per 20px of screen width, minimum 50, maximum 400
			const baseDots = Math.max(50, Math.min(400, Math.floor(screenWidth / 20)));
			
			// Calculate grid dimensions to ensure perfect rectangle
			const cols = Math.ceil(Math.sqrt(baseDots));
			const rows = Math.ceil(baseDots / cols);
			gridCols = cols; // Store the exact number of columns
			totalDots = cols * rows; // This ensures a perfect rectangle
		}
	}

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

	// Functions for timer control
	function startTimer() {
		if (!isRunning) {
			isRunning = true;
			intervalId = setInterval(() => {
				if (timeLeft > 0) {
					timeLeft--;
				} else {
					stopTimer();
				}
			}, 1000);
		}
	}

	function pauseTimer() {
		if (isRunning) {
			isRunning = false;
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
		}
	}

	function resetTimer() {
		pauseTimer();
		timeLeft = initialTime;
	}

	function stopTimer() {
		isRunning = false;
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	// Format time display
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<main class="container">
	<h1>Countdown Timer</h1>
	
	<div class="timer-display">
		<div class="time">{formatTime(timeLeft)}</div>
		<div class="status">
			{#if isRunning}
				<span class="running">Running</span>
			{:else if timeLeft === 0}
				<span class="finished">Finished!</span>
			{:else}
				<span class="paused">Paused</span>
			{/if}
		</div>
	</div>

	{#if totalDots > 0}
		<div 
			class="dots-grid"
			style="grid-template-columns: repeat({gridCols}, 1fr);"
		>
			{#each Array(totalDots) as _, i}
				{@const elapsedPercentage = (initialTime - timeLeft) / initialTime}
				{@const dotsToDim = Math.floor(elapsedPercentage * totalDots)}
				<div 
					class="dot" 
					class:dimmed={i < dotsToDim}
					style="opacity: {i >= dotsToDim ? 1 : 0.2}"
				></div>
			{/each}
		</div>
	{/if}

	<div class="controls">
		{#if !isRunning && timeLeft > 0}
			<button on:click={startTimer} class="btn btn-start">
				Start
			</button>
		{:else if isRunning}
			<button on:click={pauseTimer} class="btn btn-pause">
				Pause
			</button>
		{/if}
		
		<button on:click={resetTimer} class="btn btn-reset">
			Reset
		</button>
	</div>

	<div class="input-section">
		<label for="timeInput">Set time (seconds):</label>
		<input 
			id="timeInput" 
			type="number" 
			min="1" 
			max="3600" 
			value={timeLeft}
			on:input={(e) => {
				if (!isRunning) {
					const newTime = parseInt(e.currentTarget.value) || 60;
					timeLeft = newTime;
					initialTime = newTime;
				}
			}}
		/>
	</div>
</main>

<style>
	.container {
		max-width: 400px;
		margin: 0 auto;
		padding: 2rem;
		text-align: center;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	h1 {
		color: #333;
		margin-bottom: 2rem;
	}

	.timer-display {
		margin-bottom: 2rem;
	}

	.time {
		font-size: 4rem;
		font-weight: bold;
		color: #2563eb;
		margin-bottom: 0.5rem;
		font-family: 'Courier New', monospace;
	}

	.status {
		font-size: 1.2rem;
		margin-bottom: 1rem;
	}

	.running {
		color: #059669;
		font-weight: bold;
	}

	.paused {
		color: #d97706;
		font-weight: bold;
	}

	.finished {
		color: #dc2626;
		font-weight: bold;
	}

	.controls {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 2rem;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.btn-start {
		background-color: #059669;
		color: white;
	}

	.btn-start:hover {
		background-color: #047857;
	}

	.btn-pause {
		background-color: #d97706;
		color: white;
	}

	.btn-pause:hover {
		background-color: #b45309;
	}

	.btn-reset {
		background-color: #6b7280;
		color: white;
	}

	.btn-reset:hover {
		background-color: #4b5563;
	}

	.input-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.input-section label {
		font-weight: bold;
		color: #374151;
	}

	.input-section input {
		padding: 0.5rem;
		border: 2px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 1rem;
		width: 120px;
		text-align: center;
	}

	.input-section input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.dots-grid {
		display: grid;
		gap: 0.25rem;
		margin: 2rem 0;
		max-width: 90vw;
		margin-left: auto;
		margin-right: auto;
		padding: 0 1rem;
		justify-items: center;
	}

	.dot {
		width: clamp(6px, 1.5vw, 12px);
		height: clamp(6px, 1.5vw, 12px);
		border-radius: 50%;
		background-color: #2563eb;
		transition: opacity 0.3s ease;
	}

	.dot.dimmed {
		background-color: #9ca3af;
	}
</style>
