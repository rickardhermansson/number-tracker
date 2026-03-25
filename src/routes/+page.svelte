<script lang="ts">
	import { onMount } from 'svelte';
	import type L from 'leaflet';

	let nextNumber = $state(0);
	let inputValue = $state('');
	let status = $state('');
	let locations = $state<{ latitude: number; longitude: number; created_at: string }[]>([]);
	let allEntries = $state<{ id: number; number: number; latitude: number; longitude: number; created_at: string }[]>([]);
	let showManage = $state(false);
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
		status = 'Ange ett giltigt nummer (000\u2013999)';
			return;
		}

		status = 'Hämtar plats\u2026';

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

			status = `Sparade ${String(num).padStart(3, '0')} vid ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
			inputValue = '';

			if (num === nextNumber) {
				await fetchLocations(nextNumber);
			}
	} catch (err: any) {
			if (err?.code === 1) {
				status = 'Plats\u00e5tkomst nekad. P\u00e5 iOS: Inst\u00e4llningar \u2192 Integritet \u2192 Platstj\u00e4nster \u2192 Safari \u2192 Till\u00e5t.';
			} else if (err?.code === 2) {
				status = 'Plats ej tillg\u00e4nglig. Kontrollera att Platstj\u00e4nster \u00e4r aktiverade i Inst\u00e4llningar.';
			} else if (err?.code === 3) {
				status = 'Platsbeg\u00e4ran tog f\u00f6r l\u00e5ng tid. F\u00f6rs\u00f6k igen.';
			} else {
				status = `Fel: ${err?.message ?? 'ok\u00e4nt'}`;
			}
		}
	}

	async function toggleManage() {
		showManage = !showManage;
		if (showManage) {
			await fetchAllEntries();
		}
	}

	async function fetchAllEntries() {
		const res = await fetch('/api/numbers');
		const data = await res.json();
		allEntries = data.entries;
	}

	async function handleDelete(id: number) {
		const res = await fetch('/api/numbers', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id })
		});
		if (res.ok) {
			allEntries = allEntries.filter(e => e.id !== id);
			await fetchLocations(nextNumber);
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
	<title>Nummerjakten</title>
</svelte:head>

<main>
	<h1>Nummerjakten</h1>

	<section class="card centered">
		<h2>Logga ett nummer</h2>
		<div class="row centered">
			<input
				type="text"
				inputmode="numeric"
				pattern="[0-9]*"
				maxlength="3"
				placeholder="000"
				bind:value={inputValue}
			/>
			<button onclick={handleSave}>Spara</button>
		</div>
		{#if status}
			<p class="status">{status}</p>
		{/if}
	</section>

	<section class="card centered">
		<h2>Nästa</h2>
		<div class="row centered">
			<button class="stepper" onclick={handleUndo}>−</button>
			<span class="big-number">{pad3(nextNumber)}</span>
			<button class="stepper" onclick={handleFoundIt}>+</button>
		</div>
		<button class="found-btn" onclick={handleFoundIt}>Hittad!</button>
	</section>

	<section class="card">
		<h2>Du har sett {pad3(nextNumber)} på följande platser</h2>
		{#if locations.length === 0}
			<p>Inga platser hittade för detta nummer.</p>
		{/if}
		<div class="map" bind:this={mapContainer}></div>
	</section>

	<button class="toggle-manage" onclick={toggleManage}>
		Visa sparade nummer {showManage ? '▴' : '▾'}
	</button>

	{#if showManage}
		<section class="card manage">
			{#if allEntries.length === 0}
				<p>Inga sparade nummer.</p>
			{:else}
				<ul class="entry-list">
					{#each allEntries as entry (entry.id)}
						<li>
							<div class="entry-info">
								<strong>{pad3(entry.number)}</strong>
								<span class="entry-coords">{entry.latitude.toFixed(5)}, {entry.longitude.toFixed(5)}</span>
							</div>
							<button class="delete-btn" onclick={() => handleDelete(entry.id)}>✕</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</main>

<style>
	:global(body) {
		font-family: system-ui, -apple-system, sans-serif;
		margin: 0;
		padding: 1rem;
		background: #dc2626;
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

	.centered {
		text-align: center;
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

	.row.centered {
		justify-content: center;
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

	.stepper {
		background: #9ca3af;
		padding: 0.5rem 1rem;
		font-size: 1.5rem;
		line-height: 1;
		border-radius: 50%;
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.stepper:active {
		background: #6b7280;
	}

	.found-btn {
		margin-top: 1rem;
		width: 100%;
		padding: 0.75rem;
		font-size: 1.1rem;
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

	.toggle-manage {
		width: 100%;
		background: transparent;
		color: #666;
		font-size: 0.9rem;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
		border: 1px dashed #ccc;
		border-radius: 8px;
	}

	.toggle-manage:active {
		background: #eee;
	}

	.manage {
		max-height: 400px;
		overflow-y: auto;
	}

	.entry-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.entry-list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 0;
		border-bottom: 1px solid #eee;
	}

	.entry-list li:last-child {
		border-bottom: none;
	}

	.entry-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.entry-info strong {
		font-family: monospace;
		font-size: 1.1rem;
	}

	.entry-coords {
		font-size: 0.8rem;
		color: #888;
	}

	.delete-btn {
		background: #ef4444;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 0.35rem 0.6rem;
		font-size: 0.85rem;
		cursor: pointer;
		flex-shrink: 0;
	}

	.delete-btn:active {
		background: #dc2626;
	}
</style>
