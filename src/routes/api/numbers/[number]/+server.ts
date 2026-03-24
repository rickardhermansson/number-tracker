import { json, error } from '@sveltejs/kit';
import { sql as getDb } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const sql = getDb();
	const num = parseInt(params.number, 10);

	if (isNaN(num) || num < 0 || num > 999) {
		throw error(400, 'number must be between 0 and 999');
	}

	const rows = await sql`
		SELECT latitude, longitude, created_at
		FROM number_locations
		WHERE number = ${num}
		ORDER BY created_at DESC
	`;

	return json({ locations: rows });
};
