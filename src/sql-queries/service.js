const SERVICES = `
	SELECT
		s.service_id,
		s.service_name,
		s.service_unit,
		s.service_unit_keys,
		s.service_price_special,
		s.service_price_simple,
		s.branch_id,
		to_char(s.service_created_at, 'YYYY-MM-DD HH24:MI:SS') service_created_at,
		to_char(s.service_deleted_at, 'YYYY-MM-DD HH24:MI:SS') service_deleted_at
	FROM services s
	INNER JOIN branches b ON b.branch_id = s.branch_id AND b.branch_deleted_at IS NULL 
	WHERE s.service_deleted_at IS NULL AND
	CASE
		WHEN $1 = FALSE THEN s.service_active = TRUE
		WHEN $1 = TRUE THEN s.service_active = FALSE
		ELSE TRUE
	END AND
	CASE
		WHEN $2 > 0 THEN s.service_id = $2
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($3::INT[], 1) > 0 THEN s.branch_id = ANY($3::INT[])
		ELSE TRUE
	END
`

const ADD_SERVICE = `
	INSERT INTO SERVICES (
		branch_id,
		service_name,
		service_unit,
		service_unit_keys,
		service_price_special,
		service_price_simple
	) VALUES ($1, $2, $3, $4::VARCHAR[], $5, $6)
	RETURNING *,
	to_char(service_created_at, 'YYYY-MM-DD HH24:MI:SS') service_created_at,
	to_char(service_deleted_at, 'YYYY-MM-DD HH24:MI:SS') service_deleted_at
`

const CHANGE_SERVICE = `
	WITH
	old_service AS (
		SELECT * FROM services
		WHERE service_deleted_at IS NULL AND
		service_id = $1
	),
	new_service AS (
		INSERT INTO services (
			branch_id,
			service_name,
			service_unit,
			service_unit_keys,
			service_price_special,
			service_price_simple
		) SELECT
			CASE
				WHEN $2 > 0 THEN $2 ELSE os.branch_id
			END as branch_id,
			CASE
				WHEN LENGTH($3) > 0 THEN $3 ELSE os.service_name
			END as service_name,
			CASE
				WHEN LENGTH($4) > 0 THEN $4 ELSE os.service_unit
			END as service_unit,
			CASE
				WHEN ARRAY_LENGTH($5::CHARACTER VARYING[], 1) > 0 THEN $5::CHARACTER VARYING[] ELSE os.service_unit_keys
			END as service_unit_keys,
			CASE
				WHEN $6 > 0 THEN $6 ELSE os.service_price_special
			END as service_price_special,
			CASE
				WHEN $7 > 0 THEN $7 ELSE os.service_price_simple
			END as service_price_simple
		FROM old_service os
		WHERE os.service_id IS NOT NULL AND (
			(NOT($2 > 0) OR $2 <> os.branch_id) OR
			(NOT(LENGTH($3) > 0) OR $3 <> os.service_name) OR
			(NOT(LENGTH($4) > 0) OR $4 <> os.service_unit) OR
			(NOT(ARRAY_LENGTH($5::CHARACTER VARYING[], 1) > 0) OR $5 <> os.service_unit_keys) OR
			(NOT($6 > 0) OR $6 <> os.service_price_special) OR
			(NOT($7 > 0) OR $7 <> os.service_price_simple)
		) RETURNING *,
		to_char(service_created_at, 'YYYY-MM-DD HH24:MI:SS') service_created_at,
		to_char(service_deleted_at, 'YYYY-MM-DD HH24:MI:SS') service_deleted_at
	) UPDATE services s SET
		service_deleted_at = current_timestamp
	FROM new_service ns, old_service os
	WHERE ns.service_id IS NOT NULL AND s.service_id = $1
	RETURNING ns.*,
	ns.branch_id as new_branch_id,
	ns.service_name as new_name,
	ns.service_unit as new_unit,
	ns.service_unit_keys as new_unit_keys,
	ns.service_price_special as new_price_special,
	ns.service_price_simple as new_price_simple,
	os.branch_id as old_branch_id,
	os.service_name as old_name,
	os.service_unit as old_unit,
	os.service_unit_keys as old_unit_keys,
	os.service_price_special as old_price_special,
	os.service_price_simple as old_price_simple
`

const DISABLE_SERVICE = `
	UPDATE services SET
		service_active = $2
	WHERE service_id = ANY($1::INT[]) AND service_active <> $2
	RETURNING *,
	to_char(service_created_at, 'YYYY-MM-DD HH24:MI:SS') service_created_at,
	to_char(service_deleted_at, 'YYYY-MM-DD HH24:MI:SS') service_deleted_at
`

const DELIVERY_HOURS = `
	SELECT
		delivery_hour_id,
		delivery_hour_special,
		delivery_hour_simple,
		branch_id,
		to_char(delivery_hour_created_at, 'YYYY-MM-DD HH24:MI:SS') delivery_hour_created_at
	FROM delivery_hours
	WHERE
	CASE
		WHEN ARRAY_LENGTH($1::INT[], 1) > 0 THEN branch_id = ANY($1::INT[])
		ELSE TRUE
	END
`

const CHANGE_DELIVERY_HOUR = `
	UPDATE delivery_hours dh SET
		delivery_hour_special = (
			CASE 
				WHEN $2 > 0 THEN $2 ELSE dh.delivery_hour_special 
			END
		),
		delivery_hour_simple = (
			CASE 
				WHEN $3 > 0 THEN $3 ELSE dh.delivery_hour_simple 
			END
		)
	FROM (
		SELECT * FROM delivery_hours WHERE delivery_hour_id = $1
	) oh
	WHERE dh.delivery_hour_id = $1
	RETURNING dh.*,
	dh.delivery_hour_special as new_hour_special,
	dh.delivery_hour_simple as new_hour_simple,
	oh.delivery_hour_special as old_hour_special,
	oh.delivery_hour_simple as old_hour_simple,
	to_char(dh.delivery_hour_created_at, 'YYYY-MM-DD HH24:MI:SS') delivery_hour_created_at
`


export default {
	CHANGE_DELIVERY_HOUR,
	DISABLE_SERVICE,
	DELIVERY_HOURS,
	CHANGE_SERVICE,
	ADD_SERVICE,
	SERVICES
}