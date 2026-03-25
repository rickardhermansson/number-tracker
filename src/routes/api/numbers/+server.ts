import { json, error } from '@sveltejs/kit';
import { sql as getDb } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const sql = getDb();
	const rows = await sql`
		SELECT id, number, latitude, longitude, created_at
		FROM number_locations
		ORDER BY number ASC, created_at DESC
	`;
	return json({ entries: rows });
};

export const POST: RequestHandler = async ({ request }) => {
	const sql = getDb();
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

export const DELETE: RequestHandler = async ({ request }) => {
	const sql = getDb();
	const { id } = await request.json();

	if (typeof id !== 'number') {
		throw error(400, 'id must be a number');
	}

	await sql`DELETE FROM number_locations WHERE id = ${id}`;
	return json({ success: true });
};
