import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { number, latitude, longitude } = body;

	if (typeof number !== 'number' || number < 0 || number > 999 || !Number.isInteger(number)) {
		throw error(400, 'number must be an integer between 0 and 999');
	}
	if (typeof latitude !== 'number' || typeof longitude !== 'number') {
		throw error(400, 'latitude and longitude must be numbers');
	}

	await sql`
		INSERT INTO number_locations (number, latitude, longitude)
		VALUES (${number}, ${latitude}, ${longitude})
	`;

	return json({ success: true });
};
