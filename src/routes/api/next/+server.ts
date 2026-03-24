import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const rows = await sql`
		SELECT value FROM app_state WHERE key = 'next_number'
	`;
	const next = rows.length > 0 ? parseInt(rows[0].value, 10) : 0;
	return json({ next });
};

export const POST: RequestHandler = async () => {
	const rows = await sql`
		UPDATE app_state
		SET value = ((CAST(value AS INTEGER) + 1) % 1000)::TEXT
		WHERE key = 'next_number'
		RETURNING value
	`;
	const next = parseInt(rows[0].value, 10);
	return json({ next });
};
