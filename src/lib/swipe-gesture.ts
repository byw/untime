import { navigation } from './navigation.js';

export interface SwipeOptions {
	threshold?: number;
	velocity?: number;
	onSwipeLeft?: () => void;
	onSwipeRight?: () => void;
}

export function createSwipeHandler(options: SwipeOptions = {}) {
	const {
		threshold = 100,
		velocity = 0.3,
		onSwipeLeft,
		onSwipeRight
	} = options;

	let startX = 0;
	let startY = 0;
	let startTime = 0;
	let currentX = 0;
	let isSwiping = false;

	function handleTouchStart(event: TouchEvent) {
		startX = event.touches[0].clientX;
		startY = event.touches[0].clientY;
		startTime = Date.now();
		isSwiping = false;
	}

	function handleTouchMove(event: TouchEvent) {
		if (startX === 0) return;

		currentX = event.touches[0].clientX;
		const currentY = event.touches[0].clientY;
		const deltaX = Math.abs(currentX - startX);
		const deltaY = Math.abs(currentY - startY);

		// Only consider horizontal swipes
		if (deltaX > 20 && deltaX > deltaY) {
			isSwiping = true;
			event.preventDefault();
		}
	}

	function handleTouchEnd(event: TouchEvent) {
		if (startX === 0 || !isSwiping) return;

		const endX = event.changedTouches[0].clientX;
		const endTime = Date.now();
		const deltaX = endX - startX;
		const deltaTime = endTime - startTime;
		const velocity = Math.abs(deltaX) / deltaTime;

		// Check if swipe meets threshold and velocity requirements
		if (Math.abs(deltaX) > threshold && velocity > 0.3) {
			if (deltaX > 0) {
				// Swipe right
				onSwipeRight?.();
			} else {
				// Swipe left
				onSwipeLeft?.();
			}
		}

		// Reset
		startX = 0;
		startY = 0;
		startTime = 0;
		currentX = 0;
		isSwiping = false;
	}

	return {
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd
	};
} 