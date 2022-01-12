const ORDERS = `
	SELECT
		o.order_id,
		o.order_special,
		o.order_summary,
		o.client_id,
		o.branch_id,
		o.address_id,
		tm.bring_time_remaining,
		tm.delivery_time_remaining,
		to_char(o.order_bring_time, 'YYYY-MM-DD HH24:MI:SS') order_bring_time,
		to_char(o.order_brougth_time, 'YYYY-MM-DD HH24:MI:SS') order_brougth_time,
		to_char(o.order_delivery_time, 'YYYY-MM-DD HH24:MI:SS') order_delivery_time,
		to_char(o.order_delivered_time, 'YYYY-MM-DD HH24:MI:SS') order_delivered_time,
		to_char(o.order_created_at, 'YYYY-MM-DD HH24:MI:SS') order_created_at
	FROM orders o
	NATURAL JOIN clients c
	INNER JOIN users u ON u.user_id = c.user_id
	LEFT JOIN addresses a ON a.address_id = o.address_id
	LEFT JOIN states sta ON sta.state_id = a.state_id
	LEFT JOIN regions r ON r.region_id = a.region_id
	LEFT JOIN neighborhoods n ON n.neighborhood_id = a.neighborhood_id
	LEFT JOIN streets st ON st.street_id = a.street_id
	LEFT JOIN areas ar ON ar.area_id = a.area_id
	LEFT JOIN LATERAL (
		SELECT * FROM order_statuses WHERE order_id = o.order_id
		ORDER BY order_status_id DESC LIMIT 1
	) os ON os.order_id = o.order_id
	LEFT JOIN (
		SELECT
			order_id,
			EXTRACT( EPOCH FROM (order_bring_time::TIMESTAMPTZ - NOW()) ) AS bring_time_remaining,
			EXTRACT( EPOCH FROM (order_delivery_time::TIMESTAMPTZ - NOW()) ) AS delivery_time_remaining
		FROM orders
	) tm ON tm.order_id = o.order_id
	WHERE
	CASE 
		WHEN $3 = FALSE THEN o.order_deleted_at IS NULL
		WHEN $3 = TRUE THEN o.order_deleted_at IS NOT NULL
	END AND
	CASE
		WHEN $4 > 0 THEN o.order_id = $4
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($5::INT[], 1) > 0 THEN c.client_id = ANY($5::INT[])
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($6::INT[], 1) > 0 THEN o.branch_id = ANY($6::INT[])
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($7::INT[], 1) > 0 THEN os.order_status_code = ANY($7::INT[])
		ELSE TRUE
	END AND
	CASE 
		WHEN LENGTH($8) > 0 THEN o.order_special = CAST($8 AS BOOLEAN)
		ELSE TRUE
	END AND
	CASE
		WHEN LENGTH($9) >= 3 THEN (
			o.order_summary ILIKE CONCAT('%', $9::VARCHAR, '%') OR
			u.user_first_name ILIKE CONCAT('%', $9::VARCHAR, '%') OR
			u.user_last_name ILIKE CONCAT('%', $9::VARCHAR, '%') OR
	 		u.user_main_contact ILIKE CONCAT('%', $9::VARCHAR, '%') OR
	 		u.user_second_contact ILIKE CONCAT('%', $9::VARCHAR, '%')
		) WHEN LENGTH($9) > 0 THEN (
			o.order_id::VARCHAR = $9::VARCHAR
		) ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($10::TIMESTAMPTZ[], 1) = 2 THEN (
			o.order_bring_time BETWEEN ($10::TIMESTAMPTZ[])[1] AND (($10::TIMESTAMPTZ[])[2] + '1 day'::INTERVAL)
		) ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($11::TIMESTAMPTZ[], 1) = 2 THEN (
			o.order_brougth_time BETWEEN ($11::TIMESTAMPTZ[])[1] AND (($11::TIMESTAMPTZ[])[2] + '1 day'::INTERVAL)
		) ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($12::TIMESTAMPTZ[], 1) = 2 THEN (
			o.order_delivery_time BETWEEN ($12::TIMESTAMPTZ[])[1] AND (($12::TIMESTAMPTZ[])[2] + '1 day'::INTERVAL)
		) ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($13::TIMESTAMPTZ[], 1) = 2 THEN (
			o.order_delivered_time BETWEEN ($13::TIMESTAMPTZ[])[1] AND (($13::TIMESTAMPTZ[])[2] + '1 day'::INTERVAL)
		) ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($14::TIMESTAMPTZ[], 1) = 2 THEN (
			o.order_created_at BETWEEN ($14::TIMESTAMPTZ[])[1] AND (($14::TIMESTAMPTZ[])[2] + '1 day'::INTERVAL)
		) ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($15::INT[], 1) > 0 THEN sta.state_id = ANY($15::INT[])
		ELSE TRUE
	END AND
	CASE 
		WHEN ARRAY_LENGTH($16::INT[], 1) > 0 THEN r.region_id = ANY($16::INT[])
		ELSE TRUE
	END AND
	CASE 
		WHEN ARRAY_LENGTH($17::INT[], 1) > 0 THEN n.neighborhood_id = ANY($17::INT[]) 
		ELSE TRUE
	END AND
	CASE 
		WHEN ARRAY_LENGTH($18::INT[], 1) > 0 THEN st.street_id = ANY($18::INT[]) 
		ELSE TRUE
	END AND
	CASE 
		WHEN ARRAY_LENGTH($19::INT[], 1) > 0 THEN ar.area_id = ANY($19::INT[]) 
		ELSE TRUE
	END
	ORDER BY
	(CASE WHEN $20 = 1 AND $21 = 2 THEN o.order_id END) ASC,
	(CASE WHEN $20 = 1 AND $21 = 1 THEN o.order_id END) DESC,
	(CASE WHEN $20 = 2 AND $21 = 2 THEN u.user_first_name END) ASC,
	(CASE WHEN $20 = 2 AND $21 = 1 THEN u.user_first_name END) DESC,
	(CASE WHEN $20 = 3 AND $21 = 2 THEN u.user_last_name END) ASC,
	(CASE WHEN $20 = 3 AND $21 = 1 THEN u.user_last_name END) DESC,
	(CASE WHEN $20 = 4 AND $21 = 2 THEN os.order_status_code END) ASC,
	(CASE WHEN $20 = 4 AND $21 = 1 THEN os.order_status_code END) DESC,
	(CASE WHEN $20 = 5 AND $21 = 2 THEN o.order_brougth_time END) ASC,
	(CASE WHEN $20 = 5 AND $21 = 1 THEN o.order_brougth_time END) DESC,
	(CASE WHEN $20 = 6 AND $21 = 2 THEN o.order_delivered_time END) ASC,
	(CASE WHEN $20 = 6 AND $21 = 1 THEN o.order_delivered_time END) DESC,
	(CASE WHEN $20 = 7 AND $21 = 2 THEN tm.bring_time_remaining END) ASC,
	(CASE WHEN $20 = 7 AND $21 = 1 THEN tm.bring_time_remaining END) DESC,
	(CASE WHEN $20 = 8 AND $21 = 2 THEN tm.delivery_time_remaining END) ASC,
	(CASE WHEN $20 = 8 AND $21 = 1 THEN tm.delivery_time_remaining END) DESC
	OFFSET $1 ROWS FETCH FIRST $2 ROW ONLY
`

const ORDER = `
	SELECT
		o.order_id,
		o.order_special,
		o.order_summary,
		o.client_id,
		o.branch_id,
		o.address_id,
		tm.bring_time_remaining,
		tm.delivery_time_remaining,
		to_char(o.order_bring_time, 'YYYY-MM-DD HH24:MI:SS') order_bring_time,
		to_char(o.order_brougth_time, 'YYYY-MM-DD HH24:MI:SS') order_brougth_time,
		to_char(o.order_delivery_time, 'YYYY-MM-DD HH24:MI:SS') order_delivery_time,
		to_char(o.order_delivered_time, 'YYYY-MM-DD HH24:MI:SS') order_delivered_time,
		to_char(o.order_created_at, 'YYYY-MM-DD HH24:MI:SS') order_created_at
	FROM orders o
	NATURAL JOIN clients c
	LEFT JOIN LATERAL (
		SELECT * FROM order_statuses WHERE order_id = o.order_id
		ORDER BY order_status_id DESC LIMIT 1
	) os ON os.order_id = o.order_id
	LEFT JOIN (
		SELECT
			order_id,
			EXTRACT( EPOCH FROM (order_bring_time::TIMESTAMPTZ - NOW()) ) AS bring_time_remaining,
			EXTRACT( EPOCH FROM (order_delivery_time::TIMESTAMPTZ - NOW()) ) AS delivery_time_remaining
		FROM orders
	) tm ON tm.order_id = o.order_id
	WHERE
	CASE 
		WHEN $1 = FALSE THEN o.order_deleted_at IS NULL
		WHEN $1 = TRUE THEN o.order_deleted_at IS NOT NULL
	END AND
	CASE
		WHEN $2 > 0 THEN o.order_id = $2
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($3::INT[], 1) > 0 THEN c.client_id = ANY($3::INT[])
		ELSE TRUE
	END
`

const ADD_ORDER = `
	WITH 
	address AS (
		INSERT INTO addresses (
			state_id, region_id, neighborhood_id, street_id, 
			area_id, address_home_number, address_target
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING address_id, region_id
	),
	new_order AS (
		INSERT INTO orders (
			client_id,
			order_special,
			order_summary,
			order_bring_time,
			branch_id,
			address_id
		) SELECT $8, $10, $11, $12, r.branch_id, a.address_id
		FROM address a
		LEFT JOIN regions r ON a.region_id = r.region_id
		RETURNING *,
		EXTRACT( EPOCH FROM (order_bring_time::TIMESTAMPTZ - NOW()) ) AS bring_time_remaining,
		to_char(order_bring_time, 'YYYY-MM-DD HH24:MI:SS') order_bring_time,
		to_char(order_created_at, 'YYYY-MM-DD HH24:MI:SS') order_created_at
	),
	new_order_status AS (
		INSERT INTO order_statuses (
			order_id,
			staff_id,
			order_status_code
		) SELECT no.order_id, $9::INT, 
			CASE
				WHEN $9 > 0 THEN 2
				ELSE 1
			END
		FROM new_order no
		WHERE no.order_id IS NOT NULL
		RETURNING *
	) SELECT * FROM new_order WHERE order_id IS NOT NULL
`

const ORDER_STATUSES = `
	SELECT
		order_status_code,
		staff_id,
		to_char(order_status_created_at, 'YYYY-MM-DD HH24:MI:SS') order_status_created_at
	FROM order_statuses os
	WHERE order_id = $1
	ORDER BY order_status_id ASC
`


export default {
	ORDER_STATUSES,
	ADD_ORDER,
	ORDERS,
	ORDER
}