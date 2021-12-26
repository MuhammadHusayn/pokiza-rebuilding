const CLIENTS = `
	SELECT 
		c.client_id,
		c.client_status,
		c.client_summary,
		c.social_set_id,
		c.user_id,
		count(*) OVER() as full_count,
		to_char(c.client_created_at, 'YYYY-MM-DD HH24:MI:SS') client_created_at
	FROM clients c
	NATURAL JOIN users u
	LEFT JOIN addresses a ON a.address_id = u.address_id
	LEFT JOIN states s ON s.state_id = a.state_id
	LEFT JOIN regions r ON r.region_id = a.region_id
	LEFT JOIN neighborhoods n ON n.neighborhood_id = a.neighborhood_id
	LEFT JOIN streets st ON st.street_id = a.street_id
	LEFT JOIN areas ar ON ar.area_id = a.area_id
	WHERE c.client_deleted_at IS NULL AND
	CASE
		WHEN $3 > 0 THEN c.client_id = $3
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($4::INT[], 1) > 0 THEN c.client_status = ANY($4::INT[])
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($5::INT[], 1) > 0 THEN c.social_set_id = ANY($5::INT[])
		ELSE TRUE
	END AND
	CASE
		WHEN $6::INT[] <> ARRAY[0, 0] THEN (
			EXTRACT(
				YEAR FROM AGE(CURRENT_DATE, u.user_birth_date)
			)::INT BETWEEN ($6::INT[])[1] AND ($6::INT[])[2]
		)
		ELSE TRUE
	END AND
	CASE
		WHEN $7 = ANY(ARRAY[1, 2]) THEN u.user_gender = $7
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($8::INT[], 1) > 0 THEN u.branch_id = ANY($8::INT[])
		ELSE TRUE
	END AND
	CASE
		WHEN LENGTH($9) > 0 THEN (
			u.user_first_name ILIKE CONCAT('%', $9, '%') OR
			u.user_last_name ILIKE CONCAT('%', $9, '%') OR
			u.user_main_contact ILIKE CONCAT('%', $9, '%') OR
			u.user_second_contact ILIKE CONCAT('%', $9, '%') OR
			CAST(u.user_birth_date AS VARCHAR) ILIKE CONCAT('%', $9, '%') OR
			c.client_summary ILIKE CONCAT('%', $9, '%')
		) ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($10::INT[], 1) > 0 THEN s.state_id = ANY($10::INT[])
		ELSE TRUE
	END AND
	CASE 
		WHEN ARRAY_LENGTH($11::INT[], 1) > 0 THEN r.region_id = ANY($11::INT[])
		ELSE TRUE
	END AND
	CASE 
		WHEN ARRAY_LENGTH($12::INT[], 1) > 0 THEN n.neighborhood_id = ANY($12::INT[]) 
		ELSE TRUE
	END AND
	CASE 
		WHEN ARRAY_LENGTH($13::INT[], 1) > 0 THEN st.street_id = ANY($13::INT[]) 
		ELSE TRUE
	END AND
	CASE 
		WHEN ARRAY_LENGTH($14::INT[], 1) > 0 THEN ar.area_id = ANY($14::INT[]) 
		ELSE TRUE
	END
	ORDER BY 
	(CASE WHEN $15 = 1 AND $16 = 1 THEN u.user_first_name END) DESC,
	(CASE WHEN $15 = 2 AND $16 = 1 THEN u.user_last_name END) DESC,
	(CASE WHEN $15 = 3 AND $16 = 1 THEN u.user_birth_date END) ASC,
	(CASE WHEN $15 = 4 AND $16 = 1 THEN u.user_created_at END) ASC,
	(CASE WHEN $15 = 5 AND $16 = 1 THEN c.client_id END) DESC,
	(CASE WHEN $15 = 6 AND $16 = 1 THEN c.client_status END) DESC,
	(CASE WHEN $15 = 7 AND $16 = 1 THEN c.client_created_at END) DESC,
	(CASE WHEN $15 = 1 AND $16 = 2 THEN u.user_first_name END) ASC,
	(CASE WHEN $15 = 2 AND $16 = 2 THEN u.user_last_name END) ASC,
	(CASE WHEN $15 = 3 AND $16 = 2 THEN u.user_birth_date END) DESC,
	(CASE WHEN $15 = 4 AND $16 = 2 THEN u.user_created_at END) DESC,
	(CASE WHEN $15 = 5 AND $16 = 2 THEN c.client_id END) ASC,
	(CASE WHEN $15 = 6 AND $16 = 2 THEN c.client_status END) ASC,
	(CASE WHEN $15 = 7 AND $16 = 2 THEN c.client_created_at END) ASC
	OFFSET $1 ROWS FETCH FIRST $2 ROW ONLY
`

const ADD_CLIENT = `
	WITH 
	address AS (
		INSERT INTO addresses (
			state_id, region_id, neighborhood_id, street_id, 
			area_id, address_home_number, address_target
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING address_id
	),
	new_user AS (
		INSERT INTO users (
			user_main_contact, user_second_contact, user_first_name, 
			user_last_name, user_birth_date, user_gender, 
			branch_id, address_id
		) SELECT $8, $9, $10, $11, $12, $13, r.branch_id, a.address_id
		FROM address a
		LEFT JOIN regions r ON r.region_id = $2
		RETURNING user_id
	)
	INSERT INTO clients (
		social_set_id, client_status, client_summary, user_id
	) SELECT $14, $15, $16, u.user_id FROM new_user u
	RETURNING *,
	to_char(client_created_at, 'YYYY-MM-DD HH24:MI:SS') client_created_at
`

export default {
	ADD_CLIENT,
	CLIENTS,
}