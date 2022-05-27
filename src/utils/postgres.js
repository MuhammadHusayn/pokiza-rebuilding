import { InternalServerError } from '#errors'
import { PG } from '#config'
import pg from 'pg'

const pool = new pg.Pool(PG)

const fetch = async (SQL, ...params) => {
	const client = await pool.connect()
	try {
		const { rows: [row] } = await client.query(SQL, params.length ? params : null)
		return row
	} catch (error) {
		throw new InternalServerError(error.message || error.detail || error)
	}
	finally {
		client.release()
	}
}

const fetchAll = async (SQL, ...params) => {
	const client = await pool.connect()
	try {
		const { rows } = await client.query(SQL, params.length ? params : null)
		return rows
	}catch (error) {
		throw new InternalServerError(error.message || error.detail || error)
	}finally {
		client.release()
	}
}

export {
	fetch,
	fetchAll
}