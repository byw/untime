import { base } from '$app/paths';
import { json } from '@sveltejs/kit';

export async function GET() {
	const manifest = {
		name: "Untime - Countdown Timer",
		short_name: "Untime",
		description: "Interactive countdown timer with visual dot grid",
		start_url: `${base}/`,
		display: "fullscreen",
		display_override: ["fullscreen", "standalone"],
		background_color: "#282a36",
		theme_color: "#8be9fd",
		orientation: "any",
		scope: `${base}/`,
		categories: ["productivity", "utilities"],
		icons: [
			{
				src: `${base}/icon-192x192.png`,
				sizes: "192x192",
				type: "image/png",
				purpose: "any"
			},
			{
				src: `${base}/icon-512x512.png`,
				sizes: "512x512",
				type: "image/png",
				purpose: "any"
			},
			{
				src: `${base}/icon-192x192-maskable.png`,
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable"
			},
			{
				src: `${base}/icon-512x512-maskable.png`,
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable"
			}
		]
	};

	return json(manifest);
} 