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
		count(*) OVER() as full_count,
		COALESCE( SUM(op.product_price) ,0) order_price,
		to_char(o.order_bring_time, 'YYYY-MM-DD HH24:MI:SS') order_bring_time,
		to_char(o.order_brougth_time, 'YYYY-MM-DD HH24:MI:SS') order_brougth_time,
		to_char(o.order_delivery_time, 'YYYY-MM-DD HH24:MI:SS') order_delivery_time,
		to_char(o.order_delivered_time, 'YYYY-MM-DD HH24:MI:SS') order_delivered_time,
		to_char(o.order_created_at, 'YYYY-MM-DD HH24:MI:SS') order_created_at,
		to_char(o.order_deleted_at, 'YYYY-MM-DD HH24:MI:SS') order_deleted_at,
		CASE
			WHEN ot.transaction_id IS NOT NULL THEN TRUE
			ELSE FALSE
		END as is_paid
	FROM orders o
	NATURAL JOIN clients c
	INNER JOIN users u ON u.user_id = c.user_id
	LEFT JOIN addresses a ON a.address_id = o.address_id
	LEFT JOIN states sta ON sta.state_id = a.state_id
	LEFT JOIN regions r ON r.region_id = a.region_id
	LEFT JOIN neighborhoods n ON n.neighborhood_id = a.neighborhood_id
	LEFT JOIN streets st ON st.street_id = a.street_id
	LEFT JOIN areas ar ON ar.area_id = a.area_id
	LEFT JOIN order_bindings ob ON o.order_id = ob.order_id AND order_binding_deleted_at IS NULL
	LEFT JOIN order_transactions ot ON ot.order_id = o.order_id AND ot.transaction_type = 'income'
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
	LEFT JOIN (
		SELECT
			p.order_id,
			p.product_id,
			s.service_name,
			CASE
				WHEN o.order_special = TRUE THEN s.service_price_special * p.product_size
				WHEN o.order_special = FALSE THEN s.service_price_simple * p.product_size
				ELSE 0
			END product_price
		FROM products p
		NATURAL JOIN orders o
		LEFT JOIN services s ON s.service_id = p.service_id
		WHERE p.product_deleted_at IS NULL
	) op ON op.order_id = o.order_id
	WHERE
	CASE 
		WHEN $3 = FALSE THEN o.order_deleted_at IS NULL
		WHEN $3 = TRUE THEN o.order_deleted_at IS NOT NULL
		ELSE TRUE
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
	END AND
	CASE 
		WHEN $20 > 0 THEN ob.transport_id = $20
		ELSE TRUE
	END AND
	CASE 
		WHEN $21 = FALSE THEN ot.transaction_id IS NULL
		WHEN $21 = TRUE THEN ot.transaction_id IS NOT NULL
		ELSE TRUE
	END
	GROUP BY o.order_id, tm.bring_time_remaining, tm.delivery_time_remaining, u.user_first_name, u.user_last_name, os.order_status_code,
		     n.neighborhood_distance, st.street_distance, ar.area_distance, ot.transaction_id
	ORDER BY
	(CASE WHEN $22 = 1 AND $23 = 2 THEN o.order_id END) ASC,
	(CASE WHEN $22 = 1 AND $23 = 1 THEN o.order_id END) DESC,
	(CASE WHEN $22 = 2 AND $23 = 2 THEN u.user_first_name END) ASC,
	(CASE WHEN $22 = 2 AND $23 = 1 THEN u.user_first_name END) DESC,
	(CASE WHEN $22 = 3 AND $23 = 2 THEN u.user_last_name END) ASC,
	(CASE WHEN $22 = 3 AND $23 = 1 THEN u.user_last_name END) DESC,
	(CASE WHEN $22 = 4 AND $23 = 2 THEN os.order_status_code END) ASC,
	(CASE WHEN $22 = 4 AND $23 = 1 THEN os.order_status_code END) DESC,
	(CASE WHEN $22 = 5 AND $23 = 2 THEN COALESCE( SUM(op.product_price) ,0) END) ASC,
	(CASE WHEN $22 = 5 AND $23 = 1 THEN COALESCE( SUM(op.product_price) ,0) END) DESC,
	(CASE WHEN $22 = 6 AND $23 = 2 THEN o.order_brougth_time END) ASC,
	(CASE WHEN $22 = 6 AND $23 = 1 THEN o.order_brougth_time END) DESC,
	(CASE WHEN $22 = 7 AND $23 = 2 THEN o.order_delivered_time END) ASC,
	(CASE WHEN $22 = 7 AND $23 = 1 THEN o.order_delivered_time END) DESC,
	(CASE WHEN $22 = 8 AND $23 = 2 THEN tm.bring_time_remaining END) ASC,
	(CASE WHEN $22 = 8 AND $23 = 1 THEN tm.bring_time_remaining END) DESC,
	(CASE WHEN $22 = 9 AND $23 = 2 THEN tm.delivery_time_remaining END) ASC,
	(CASE WHEN $22 = 9 AND $23 = 1 THEN tm.delivery_time_remaining END) DESC,
	(CASE WHEN $22 = 10 AND $23 = 2 AND n.neighborhood_distance IS NOT NULL THEN n.neighborhood_distance END) ASC,
	(CASE WHEN $22 = 10 AND $23 = 1 AND n.neighborhood_distance IS NOT NULL THEN n.neighborhood_distance END) DESC,
	(CASE WHEN $22 = 10 AND $23 = 2 AND st.street_distance IS NOT NULL THEN st.street_distance END) ASC,
	(CASE WHEN $22 = 10 AND $23 = 1 AND st.street_distance IS NOT NULL THEN st.street_distance END) DESC,
	(CASE WHEN $22 = 10 AND $23 = 2 AND ar.area_distance IS NOT NULL THEN ar.area_distance END) ASC,
	(CASE WHEN $22 = 10 AND $23 = 1 AND ar.area_distance IS NOT NULL THEN ar.area_distance END) DESC
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
		COALESCE( SUM(op.product_price) ,0) order_price,
		to_char(o.order_bring_time, 'YYYY-MM-DD HH24:MI:SS') order_bring_time,
		to_char(o.order_brougth_time, 'YYYY-MM-DD HH24:MI:SS') order_brougth_time,
		to_char(o.order_delivery_time, 'YYYY-MM-DD HH24:MI:SS') order_delivery_time,
		to_char(o.order_delivered_time, 'YYYY-MM-DD HH24:MI:SS') order_delivered_time,
		to_char(o.order_created_at, 'YYYY-MM-DD HH24:MI:SS') order_created_at,
		to_char(o.order_deleted_at, 'YYYY-MM-DD HH24:MI:SS') order_deleted_at,
		CASE
			WHEN ot.transaction_id IS NOT NULL THEN TRUE
			ELSE FALSE
		END as is_paid
	FROM orders o
	NATURAL JOIN clients c
	LEFT JOIN order_transactions ot ON ot.order_id = o.order_id AND ot.transaction_type = 'income'
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
	LEFT JOIN (
		SELECT
			p.order_id,
			p.product_id,
			s.service_name,
			CASE
				WHEN o.order_special = TRUE THEN s.service_price_special * p.product_size
				WHEN o.order_special = FALSE THEN s.service_price_simple * p.product_size
				ELSE 0
			END product_price
		FROM products p
		NATURAL JOIN orders o
		LEFT JOIN services s ON s.service_id = p.service_id
		WHERE p.product_deleted_at IS NULL
	) op ON op.order_id = o.order_id
	WHERE
	CASE 
		WHEN $1 = FALSE THEN o.order_deleted_at IS NULL
		WHEN $1 = TRUE THEN o.order_deleted_at IS NOT NULL
		ELSE TRUE
	END AND
	CASE
		WHEN $2 > 0 THEN o.order_id = $2
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($3::INT[], 1) > 0 THEN c.client_id = ANY($3::INT[])
		ELSE TRUE
	END
	GROUP BY o.order_id, tm.bring_time_remaining, tm.delivery_time_remaining, ot.transaction_id
`

const SEARCH_ORDERS = `
	SELECT 
		o.order_id,
		o.order_special,
		o.order_summary,
		o.client_id,
		o.branch_id,
		o.address_id,
		tm.bring_time_remaining,
		tm.delivery_time_remaining,
		count(*) OVER() as full_count,
		COALESCE( SUM(op.product_price) ,0) order_price,
		to_char(o.order_bring_time, 'YYYY-MM-DD HH24:MI:SS') order_bring_time,
		to_char(o.order_brougth_time, 'YYYY-MM-DD HH24:MI:SS') order_brougth_time,
		to_char(o.order_delivery_time, 'YYYY-MM-DD HH24:MI:SS') order_delivery_time,
		to_char(o.order_delivered_time, 'YYYY-MM-DD HH24:MI:SS') order_delivered_time,
		to_char(o.order_created_at, 'YYYY-MM-DD HH24:MI:SS') order_created_at,
		to_char(o.order_deleted_at, 'YYYY-MM-DD HH24:MI:SS') order_deleted_at,
		CASE
			WHEN ot.transaction_id IS NOT NULL THEN TRUE
			ELSE FALSE
		END as is_paid
	FROM orders o
	NATURAL JOIN clients c
	LEFT JOIN order_transactions ot ON ot.order_id = o.order_id AND ot.transaction_type = 'income'
	INNER JOIN users u ON u.user_id = c.user_id
	LEFT JOIN (
		SELECT
			order_id,
			EXTRACT( EPOCH FROM (order_bring_time::TIMESTAMPTZ - NOW()) ) AS bring_time_remaining,
			EXTRACT( EPOCH FROM (order_delivery_time::TIMESTAMPTZ - NOW()) ) AS delivery_time_remaining
		FROM orders
	) tm ON tm.order_id = o.order_id
	LEFT JOIN (
		SELECT
			p.order_id,
			p.product_id,
			s.service_name,
			CASE
				WHEN o.order_special = TRUE THEN s.service_price_special * p.product_size
				WHEN o.order_special = FALSE THEN s.service_price_simple * p.product_size
				ELSE 0
			END product_price
		FROM products p
		NATURAL JOIN orders o
		LEFT JOIN services s ON s.service_id = p.service_id
		WHERE p.product_deleted_at IS NULL
	) op ON op.order_id = o.order_id
	WHERE o.order_deleted_at IS NULL AND
	CASE
		WHEN ARRAY_LENGTH($2::INT[], 1) > 0 THEN o.branch_id = ANY($2::INT[])
		ELSE TRUE
	END AND
	CASE
		WHEN LENGTH($1) >= 3 THEN (
			o.order_summary ILIKE CONCAT('%', $1::VARCHAR, '%') OR
			c.client_summary ILIKE CONCAT('%', $1::VARCHAR, '%') OR
			u.user_first_name ILIKE CONCAT('%', $1::VARCHAR, '%') OR
			u.user_last_name ILIKE CONCAT('%', $1::VARCHAR, '%') OR
	 		u.user_main_contact ILIKE CONCAT('%', $1::VARCHAR, '%') OR
	 		u.user_second_contact ILIKE CONCAT('%', $1::VARCHAR, '%')
		) WHEN LENGTH($1) > 0 THEN o.order_id::VARCHAR = $1::VARCHAR
		ELSE TRUE
	END
	GROUP BY o.order_id, tm.bring_time_remaining, tm.delivery_time_remaining, ot.transaction_id
	LIMIT $3
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
		to_char(order_created_at, 'YYYY-MM-DD HH24:MI:SS') order_created_at,
		to_char(order_deleted_at, 'YYYY-MM-DD HH24:MI:SS') order_deleted_at
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

const CHANGE_ORDER = `
	WITH 
	address AS (
		UPDATE addresses a SET
			state_id = (
				CASE 
					WHEN $3 = FALSE THEN a.state_id
					WHEN $3 = TRUE AND $4 > 0 THEN $4
					ELSE NULL
				END
			), 
			region_id = (
				CASE 
					WHEN $3 = FALSE THEN a.region_id
					WHEN $3 = TRUE AND $5 > 0 THEN $5
					ELSE NULL
				END
			), 
			neighborhood_id = (
				CASE 
					WHEN $3 = FALSE THEN a.neighborhood_id
					WHEN $3 = TRUE AND $6 > 0 THEN $6
					ELSE NULL
				END
			), 
			street_id = (
				CASE 
					WHEN $3 = FALSE THEN a.street_id
					WHEN $3 = TRUE AND $7 > 0 THEN $7
					ELSE NULL
				END
			), 
			area_id = (
				CASE 
					WHEN $3 = FALSE THEN a.area_id
					WHEN $3 = TRUE AND $8 > 0 THEN $8
					ELSE NULL
				END
			), 
			address_home_number = (
				CASE 
					WHEN $3 = FALSE THEN a.address_home_number
					WHEN $3 = TRUE AND LENGTH($9) > 0 THEN $9
					ELSE NULL
				END
			), 
			address_target = (
				CASE 
					WHEN $3 = FALSE THEN a.address_target
					WHEN $3 = TRUE AND LENGTH($10) > 0 THEN $10
					ELSE NULL
				END
			)
		FROM (
			SELECT a.* FROM addresses a
			NATURAL JOIN orders o
			WHERE o.address_id = a.address_id AND o.order_id = $1 AND
			CASE
				WHEN $2 > 0 THEN o.client_id = $2
				ELSE TRUE
			END FOR UPDATE
		) oa, orders o
		WHERE o.order_deleted_at IS NULL AND
		o.address_id = a.address_id AND o.order_id = $1 AND
		CASE
			WHEN $2 > 0 THEN o.client_id = $2
			ELSE TRUE
		END
		RETURNING
		a.*,
		a.state_id as new_state_id,
		a.region_id as new_region_id,
		a.neighborhood_id as new_neighborhood_id,
		a.street_id as new_street_id,
		a.area_id as new_area_id,
		a.address_home_number as new_address_home_number,
		a.address_target as new_address_target,
		oa.state_id as old_state_id,
		oa.region_id as old_region_id,
		oa.neighborhood_id as old_neighborhood_id,
		oa.street_id as old_street_id,
		oa.area_id as old_area_id,
		oa.address_home_number as old_address_home_number,
		oa.address_target as old_address_target
	) UPDATE orders o SET
		order_bring_time = (
			CASE
				WHEN LENGTH($11) > 0 THEN $11::TIMESTAMPTZ
				ELSE o.order_bring_time
			END
		),
		order_special = (
			CASE
				WHEN LENGTH($12) > 0 THEN CAST($12 AS BOOLEAN)
				ELSE o.order_special
			END
		),
		order_summary = (
			CASE
				WHEN LENGTH($13) > 0 THEN $13
				ELSE o.order_summary
			END
		),
		branch_id = r.branch_id
	FROM (
		SELECT * FROM orders WHERE order_id = $1
	) oo, address a
	LEFT JOIN regions r ON r.region_id = a.region_id
	WHERE o.order_deleted_at IS NULL AND 
	o.address_id = a.address_id AND o.order_id = $1 AND
	CASE
		WHEN $2 > 0 THEN o.client_id = $2
		ELSE TRUE
	END
	RETURNING o.*, a.*,
	o.order_bring_time as new_bring_time,
	o.order_summary as new_summary,
	o.branch_id as new_branch_id,
	CASE 
		WHEN o.order_special = TRUE THEN 'tezkor'
		WHEN o.order_special = FALSE THEN 'oddiy' 
	END as new_plan,
	oo.order_bring_time as old_bring_time,
	oo.order_summary as old_summary,
	oo.branch_id as old_branch_id,
	CASE 
		WHEN oo.order_special = TRUE THEN 'tezkor' 
		WHEN oo.order_special = FALSE THEN 'oddiy' 
	END as old_plan,
	EXTRACT( EPOCH FROM (o.order_bring_time::TIMESTAMPTZ - NOW()) ) AS bring_time_remaining,
	to_char(o.order_bring_time, 'YYYY-MM-DD HH24:MI:SS') order_bring_time,
	to_char(o.order_created_at, 'YYYY-MM-DD HH24:MI:SS') order_created_at,
	to_char(o.order_deleted_at, 'YYYY-MM-DD HH24:MI:SS') order_deleted_at
`

const DELETE_ORDER = `
	WITH deleted_order AS (
		UPDATE orders SET
			order_deleted_at = current_timestamp
		WHERE order_deleted_at IS NULL AND order_id = $1 AND
		CASE
			WHEN $2 > 0 THEN client_id = $2
			ELSE TRUE
		END
		RETURNING *,
		to_char(order_bring_time, 'YYYY-MM-DD HH24:MI:SS') order_bring_time,
		to_char(order_brougth_time, 'YYYY-MM-DD HH24:MI:SS') order_brougth_time,
		to_char(order_delivery_time, 'YYYY-MM-DD HH24:MI:SS') order_delivery_time,
		to_char(order_delivered_time, 'YYYY-MM-DD HH24:MI:SS') order_delivered_time,
		to_char(order_created_at, 'YYYY-MM-DD HH24:MI:SS') order_created_at,
		to_char(order_deleted_at, 'YYYY-MM-DD HH24:MI:SS') order_deleted_at
	), deleted_product AS (
		UPDATE products p SET
			product_deleted_at = current_timestamp
		FROM deleted_order dor
		WHERE dor.order_id = p.order_id
		RETURNING dor.*
	) SELECT * FROM deleted_order
`

const RESTORE_ORDER = `
	WITH restored_order AS (
		UPDATE orders SET
			order_deleted_at = NULL
		WHERE order_deleted_at IS NOT NULL AND order_id = $1 AND
		CASE
			WHEN $2 > 0 THEN client_id = $2
			ELSE TRUE
		END
		RETURNING *,
		to_char(order_bring_time, 'YYYY-MM-DD HH24:MI:SS') order_bring_time,
		to_char(order_brougth_time, 'YYYY-MM-DD HH24:MI:SS') order_brougth_time,
		to_char(order_delivery_time, 'YYYY-MM-DD HH24:MI:SS') order_delivery_time,
		to_char(order_delivered_time, 'YYYY-MM-DD HH24:MI:SS') order_delivered_time,
		to_char(order_created_at, 'YYYY-MM-DD HH24:MI:SS') order_created_at,
		to_char(order_deleted_at, 'YYYY-MM-DD HH24:MI:SS') order_deleted_at
	), restored_product AS (
		UPDATE products p SET
			product_deleted_at = NULL
		FROM restored_order dor
		WHERE dor.order_id = p.order_id
		RETURNING dor.*
	) SELECT * FROM restored_order
`

const ORDER_STATUSES = `
	SELECT
		order_status_id,
		order_status_code AS status_code,
		staff_id,
		to_char(order_status_created_at, 'YYYY-MM-DD HH24:MI:SS') status_created_at
	FROM order_statuses os
	WHERE order_id = $1
	ORDER BY order_status_id ASC
`

const CHANGE_ORDER_STATUS = `
	WITH new_status AS (
		INSERT INTO order_statuses (
			order_id,
			order_status_code,
			staff_id
		) VALUES ($1, $2, $3)
		RETURNING *
	) SELECT 
		*,
		to_char(order_bring_time, 'YYYY-MM-DD HH24:MI:SS') order_bring_time,
		to_char(order_brougth_time, 'YYYY-MM-DD HH24:MI:SS') order_brougth_time,
		to_char(order_delivery_time, 'YYYY-MM-DD HH24:MI:SS') order_delivery_time,
		to_char(order_delivered_time, 'YYYY-MM-DD HH24:MI:SS') order_delivered_time,
		to_char(order_created_at, 'YYYY-MM-DD HH24:MI:SS') order_created_at,
		to_char(order_deleted_at, 'YYYY-MM-DD HH24:MI:SS') order_deleted_at
	FROM orders 
	WHERE order_id = $1
`

const ORDER_BINDINGS = `
	SELECT
		ob.order_binding_id,
		ob.order_binding_type,
		ob.transport_id,
		ob.order_id,
		ob.product_id,
		ob.finished,
		tr.staff_id,
		ob.order_binding_created_at,
		ob.order_binding_deleted_at
	FROM order_bindings ob
	LEFT JOIN LATERAL (
		SELECT *
		FROM transport_registration tr
		WHERE tr.transport_id = ob.transport_id
		ORDER BY tr.registration_id DESC
		LIMIT 1
	) tr ON tr.transport_id = ob.transport_id
	WHERE order_binding_deleted_at IS NULL AND
	CASE
		WHEN $1 > 0 THEN ob.order_id = $1
		ELSE TRUE
	END AND
	CASE
		WHEN $2 > 0 THEN ob.product_id = $2
		ELSE TRUE
	END
`

const ORDER_BINDING = `
	SELECT
		ob.order_binding_id,
		ob.order_binding_type,
		ob.transport_id,
		ob.order_id,
		ob.product_id,
		ob.finished,
		tr.staff_id,
		ob.order_binding_created_at,
		ob.order_binding_deleted_at
	FROM order_bindings ob
	LEFT JOIN LATERAL (
		SELECT *
		FROM transport_registration tr
		WHERE tr.transport_id = ob.transport_id
		ORDER BY tr.registration_id DESC
		LIMIT 1
	) tr ON tr.transport_id = ob.transport_id
	WHERE order_binding_deleted_at IS NULL AND
	CASE
		WHEN $1 > 0 THEN ob.order_id = $1
		ELSE TRUE
	END AND
	CASE
		WHEN $2 > 0 THEN ob.product_id = $2
		ELSE TRUE
	END AND
	CASE
		WHEN $3 > 0 THEN ob.transport_id = $3
		ELSE TRUE
	END AND
	CASE
		WHEN $4 > 0 THEN tr.staff_id = $4
		ELSE TRUE
	END
`

const CHANGE_ORDER_BINDING = `
	UPDATE order_bindings SET
		finished = $2
	WHERE order_id = $1 AND
	order_binding_deleted_at IS NULL
`

export default {
	CHANGE_ORDER_BINDING,
	CHANGE_ORDER_STATUS,
	ORDER_BINDING,
	ORDER_STATUSES,
	ORDER_BINDINGS,
	SEARCH_ORDERS,
	RESTORE_ORDER,
	DELETE_ORDER,
	CHANGE_ORDER,
	ADD_ORDER,
	ORDERS,
	ORDER
}
