<script lang="ts">
	import { onMount } from 'svelte';
	import type L from 'leaflet';

	let nextNumber = $state(0);
	let inputValue = $state('');
	let status = $state('');
	let locations = $state<{ latitude: number; longitude: number; created_at: string }[]>([]);
	let mapContainer: HTMLDivElement;
	let map: L.Map | undefined;
	let markersLayer: L.LayerGroup | undefined;
	let leaflet: typeof L;

	onMount(async () => {
		leaflet = (await import('leaflet')).default;
		await fetchNext();
	});

	async function fetchNext() {
		const res = await fetch('/api/next');
		const data = await res.json();
		nextNumber = data.next;
		await fetchLocations(nextNumber);
	}

	async function fetchLocations(num: number) {
		const res = await fetch(`/api/numbers/${num}`);
		const data = await res.json();
		locations = data.locations;
		updateMap();
	}

	function updateMap() {
		if (!leaflet || !mapContainer) return;

		if (!map) {
			map = leaflet.map(mapContainer).setView([0, 0], 2);
			leaflet
				.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '&copy; OpenStreetMap contributors'
				})
				.addTo(map);
			markersLayer = leaflet.layerGroup().addTo(map);
		}

		markersLayer!.clearLayers();

		if (locations.length === 0) return;

		const bounds: [number, number][] = [];
		for (const loc of locations) {
			const marker = leaflet.marker([loc.latitude, loc.longitude]);
			marker.bindPopup(`${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`);
			markersLayer!.addLayer(marker);
			bounds.push([loc.latitude, loc.longitude]);
		}

		if (locations.length === 1) {
			map.setView([locations[0].latitude, locations[0].longitude], 14);
		} else {
			map.fitBounds(bounds, { padding: [40, 40] });
		}
	}

	async function handleFoundIt() {
		const res = await fetch('/api/next', { method: 'POST' });
		const data = await res.json();
		nextNumber = data.next;
		await fetchLocations(nextNumber);
	}

	async function handleUndo() {
		const res = await fetch('/api/next', { method: 'PATCH' });
		const data = await res.json();
		nextNumber = data.next;
		await fetchLocations(nextNumber);
	}

	async function handleSave() {
		const num = parseInt(inputValue, 10);
		if (isNaN(num) || num < 0 || num > 999) {
			status = 'Enter a valid number (000\u2013999)';
			return;
		}

		status = 'Getting location\u2026';

		try {
			const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					enableHighAccuracy: true,
					timeout: 10000
				});
			});

			const res = await fetch('/api/numbers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					number: num,
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude
				})
			});

			if (!res.ok) throw new Error('Server error');

			status = `Saved ${String(num).padStart(3, '0')} at ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
			inputValue = '';

			if (num === nextNumber) {
				await fetchLocations(nextNumber);
			}
	} catch (err: any) {
			if (err?.code === 1) {
				status = 'Location permission denied. On iOS: Settings → Privacy → Location Services → Safari → Allow.';
			} else if (err?.code === 2) {
				status = 'Location unavailable. Make sure Location Services is enabled in Settings.';
			} else if (err?.code === 3) {
				status = 'Location request timed out. Try again.';
			} else {
				status = `Error: ${err?.message ?? 'unknown'}`;
			}
		}
	}

	function pad3(n: number): string {
		return String(n).padStart(3, '0');
	}
</script>

<svelte:head>
	<link
		rel="stylesheet"
		href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
		crossorigin=""
	/>
	<title>Number Tracker</title>
</svelte:head>

<main>
	<h1>Number Tracker</h1>

	<section class="card">
		<h2>Log a Number</h2>
		<div class="row">
			<input
				type="text"
				inputmode="numeric"
				pattern="[0-9]*"
				maxlength="3"
				placeholder="000"
				bind:value={inputValue}
			/>
			<button onclick={handleSave}>Save</button>
		</div>
		{#if status}
			<p class="status">{status}</p>
		{/if}
	</section>

	<section class="card">
		<h2>Next</h2>
		<div class="row">
			<button class="undo" onclick={handleUndo}>←</button>
			<span class="big-number">{pad3(nextNumber)}</span>
			<button onclick={handleFoundIt}>Found it!</button>
		</div>
	</section>

	<section class="card">
		<h2>Locations for {pad3(nextNumber)}</h2>
		{#if locations.length === 0}
			<p>No locations found for this number.</p>
		{/if}
		<div class="map" bind:this={mapContainer}></div>
	</section>
</main>

<style>
	:global(body) {
		font-family: system-ui, -apple-system, sans-serif;
		margin: 0;
		padding: 1rem;
		background: #f5f5f5;
		color: #333;
	}

	main {
		max-width: 480px;
		margin: 0 auto;
	}

	h1 {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.card {
		background: white;
		border-radius: 12px;
		padding: 1.25rem;
		margin-bottom: 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.card h2 {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	input {
		font-size: 1.5rem;
		width: 5rem;
		text-align: center;
		padding: 0.4rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-family: monospace;
	}

	button {
		font-size: 1rem;
		padding: 0.5rem 1.25rem;
		border: none;
		border-radius: 8px;
		background: #4f46e5;
		color: white;
		cursor: pointer;
	}

	button:active {
		background: #3730a3;
	}

	.undo {
		background: #9ca3af;
		padding: 0.5rem 0.75rem;
		font-size: 1.2rem;
	}

	.undo:active {
		background: #6b7280;
	}

	.big-number {
		font-size: 2.5rem;
		font-family: monospace;
		font-weight: bold;
	}

	.status {
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: #666;
	}

	.map {
		height: 300px;
		border-radius: 8px;
		overflow: hidden;
	}
</style>
