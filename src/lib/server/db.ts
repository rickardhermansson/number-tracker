import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '$env/static/private';

const sql = neon(DATABASE_URL);

export async function initDb() {
	await sql`
		CREATE TABLE IF NOT EXISTS number_locations (
			id SERIAL PRIMARY KEY,
			number INTEGER NOT NULL CHECK (number >= 0 AND number <= 999),
			latitude DOUBLE PRECISION NOT NULL,
			longitude DOUBLE PRECISION NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS app_state (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)
	`;
	await sql`
		INSERT INTO app_state (key, value)
		VALUES ('next_number', '0')
		ON CONFLICT (key) DO NOTHING
	`;
}

export { sql };
