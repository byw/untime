<script lang="ts">
	import '../app.css';
	import { base } from '$app/paths';
	import { navigation } from '$lib/navigation.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { children } = $props();
	
	// Subscribe to navigation store
	let navState = $derived($navigation);
	let currentPage = $derived(navState.currentPage);
	let isTransitioning = $derived(navState.isTransitioning);
	let swipeDirection = $derived(navState.swipeDirection);
	let swipeProgress = $derived(navState.swipeProgress);
	
	// Handle navigation changes
	$effect(() => {
		if (currentPage === 'settings' && $page.url.pathname !== '/untime/settings') {
			goto('/untime/settings');
		} else if (currentPage === 'home' && $page.url.pathname !== '/untime/') {
			goto('/untime/');
		}
	});
	
	// Handle route changes to update navigation state
	$effect(() => {
		const pathname = $page.url.pathname;
		if (pathname === '/untime/settings' && currentPage !== 'settings') {
			navigation.navigate('settings');
		} else if (pathname === '/untime/' && currentPage !== 'home') {
			navigation.navigate('home');
		}
	});
</script>

<div class="navigation-container" class:transitioning={isTransitioning}>
	<div class="page-stack">
		{#if currentPage === 'home' || isTransitioning}
			<div 
				class="page home-page" 
				class:swipe-left={swipeDirection === 'left' && swipeProgress > 0}
				class:swipe-right={swipeDirection === 'right' && swipeProgress > 0}
				style={swipeDirection && swipeProgress > 0 ? 
					`transform: translateX(${swipeDirection === 'left' ? -swipeProgress : swipeProgress}px)` : 
					''}
			>
				{@render children()}
			</div>
		{/if}
		
		{#if currentPage === 'settings' || isTransitioning}
			<div 
				class="page settings-page" 
				class:swipe-left={swipeDirection === 'left' && swipeProgress > 0}
				class:swipe-right={swipeDirection === 'right' && swipeProgress > 0}
				style={swipeDirection && swipeProgress > 0 ? 
					`transform: translateX(${swipeDirection === 'left' ? -swipeProgress : swipeProgress}px)` : 
					''}
			>
				{@render children()}
			</div>
		{/if}
	</div>
</div>

<style>
	.navigation-container {
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		position: relative;
	}
	
	.page-stack {
		width: 100%;
		height: 100%;
		position: relative;
	}
	
	.page {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
	}
	
	.home-page {
		z-index: 1;
	}
	
	.settings-page {
		z-index: 2;
		transform: translateX(100%);
	}
	
	.settings-page.swipe-right {
		transform: translateX(0);
	}
	
	.home-page.swipe-left {
		transform: translateX(-100%);
	}
	
	.transitioning .page {
		transition: none;
	}
</style>


