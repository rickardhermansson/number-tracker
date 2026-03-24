import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

let sql: NeonQueryFunction<false, false>;

function getDb() {
	if (!sql) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
		sql = neon(env.DATABASE_URL);
	}
	return sql;
}

export async function initDb() {
	const sql = getDb();
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

export { getDb as sql };
