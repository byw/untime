import { writable } from 'svelte/store';

export type Page = 'home' | 'settings';

interface NavigationState {
	currentPage: Page;
	isTransitioning: boolean;
	swipeDirection: 'left' | 'right' | null;
	swipeProgress: number;
}

function createNavigationStore() {
	const { subscribe, set, update } = writable<NavigationState>({
		currentPage: 'home',
		isTransitioning: false,
		swipeDirection: null,
		swipeProgress: 0
	});

	return {
		subscribe,
		navigate: (page: Page) => {
			update(state => ({ ...state, currentPage: page }));
		},
		startSwipe: (direction: 'left' | 'right') => {
			update(state => ({ 
				...state, 
				swipeDirection: direction, 
				isTransitioning: true,
				swipeProgress: 0
			}));
		},
		updateSwipeProgress: (progress: number) => {
			update(state => ({ ...state, swipeProgress: progress }));
		},
		completeSwipe: () => {
			update(state => ({ 
				...state, 
				isTransitioning: false, 
				swipeDirection: null,
				swipeProgress: 0
			}));
		},
		cancelSwipe: () => {
			update(state => ({ 
				...state, 
				isTransitioning: false, 
				swipeDirection: null,
				swipeProgress: 0
			}));
		}
	};
}

export const navigation = createNavigationStore(); 