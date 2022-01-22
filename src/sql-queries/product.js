const PRODUCTS = `
	SELECT
		p.product_id,
		p.product_size,
		p.product_size_details,
		p.product_summary,
		p.service_id,
		p.order_id,
		p.product_img,
		o.order_special,
		pp.product_price,
		to_char(p.product_created_at, 'YYYY-MM-DD HH24:MI:SS') product_created_at
	FROM products p
	NATURAL JOIN orders o
	NATURAL JOIN addresses a
	LEFT JOIN clients c ON c.client_id = o.client_id
	LEFT JOIN users u ON u.user_id = c.user_id
	LEFT JOIN states sta ON sta.state_id = a.state_id
	LEFT JOIN regions r ON r.region_id = a.region_id
	LEFT JOIN neighborhoods n ON n.neighborhood_id = a.neighborhood_id
	LEFT JOIN streets st ON st.street_id = a.street_id
	LEFT JOIN areas ar ON ar.area_id = a.area_id
	LEFT JOIN LATERAL (
		SELECT * FROM product_statuses WHERE product_id = p.product_id
		ORDER BY product_status_id DESC LIMIT 1
	) ps ON ps.product_id = p.product_id
	LEFT JOIN (
		SELECT
			p.product_id,
			s.service_name,
			CASE
				WHEN o.order_special = TRUE THEN s.service_price_special * p.product_size
				WHEN o.order_special = FALSE THEN s.service_price_simple * p.product_size
			ELSE NULL
			END AS product_price
		FROM products p
		NATURAL JOIN orders o
		NATURAL JOIN services s
	) pp ON pp.product_id = p.product_id
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
		WHEN $4 > 0 THEN p.product_id = $4
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($5::INT[], 1) > 0 THEN o.order_id = ANY($5::INT[])
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($6::INT[], 1) > 0 THEN o.client_id = ANY($6::INT[])
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($7::INT[], 1) > 0 THEN o.branch_id = ANY($7::INT[])
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($8::INT[], 1) > 0 THEN p.service_id = ANY($8::INT[])
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($9::INT[], 1) > 0 THEN ps.product_status_code = ANY($9::INT[])
		ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($10::INT[], 1) > 0 THEN pp.product_price BETWEEN ($10::INT[])[1] AND ($10::INT[])[2]
		ELSE TRUE
	END AND
	CASE 
		WHEN LENGTH($11) > 0 THEN o.order_special = CAST($11 AS BOOLEAN)
		ELSE TRUE
	END AND
	CASE
		WHEN LENGTH($12) >= 3 THEN (
			p.product_summary ILIKE CONCAT('%', $12::VARCHAR, '%') OR
			pp.service_name ILIKE CONCAT('%', $12::VARCHAR, '%') OR
			u.user_first_name ILIKE CONCAT('%', $12::VARCHAR, '%') OR
			u.user_last_name ILIKE CONCAT('%', $12::VARCHAR, '%') OR
	 		u.user_main_contact ILIKE CONCAT('%', $12::VARCHAR, '%') OR
	 		u.user_second_contact ILIKE CONCAT('%', $12::VARCHAR, '%')
		) WHEN LENGTH($12) > 0 THEN (
			p.product_id::VARCHAR = $12::VARCHAR
		) ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($13::TIMESTAMPTZ[], 1) = 2 THEN (
			o.order_bring_time BETWEEN ($13::TIMESTAMPTZ[])[1] AND (($13::TIMESTAMPTZ[])[2] + '1 day'::INTERVAL)
		) ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($14::TIMESTAMPTZ[], 1) = 2 THEN (
			o.order_brougth_time BETWEEN ($14::TIMESTAMPTZ[])[1] AND (($14::TIMESTAMPTZ[])[2] + '1 day'::INTERVAL)
		) ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($15::TIMESTAMPTZ[], 1) = 2 THEN (
			o.order_delivery_time BETWEEN ($15::TIMESTAMPTZ[])[1] AND (($15::TIMESTAMPTZ[])[2] + '1 day'::INTERVAL)
		) ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($16::TIMESTAMPTZ[], 1) = 2 THEN (
			o.order_delivered_time BETWEEN ($16::TIMESTAMPTZ[])[1] AND (($16::TIMESTAMPTZ[])[2] + '1 day'::INTERVAL)
		) ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($17::TIMESTAMPTZ[], 1) = 2 THEN (
			p.product_created_at BETWEEN ($17::TIMESTAMPTZ[])[1] AND (($17::TIMESTAMPTZ[])[2] + '1 day'::INTERVAL)
		) ELSE TRUE
	END AND
	CASE
		WHEN ARRAY_LENGTH($18::INT[], 1) > 0 THEN sta.state_id = ANY($18::INT[])
		ELSE TRUE
	END AND
	CASE 
		WHEN ARRAY_LENGTH($19::INT[], 1) > 0 THEN r.region_id = ANY($19::INT[])
		ELSE TRUE
	END AND
	CASE 
		WHEN ARRAY_LENGTH($20::INT[], 1) > 0 THEN n.neighborhood_id = ANY($20::INT[]) 
		ELSE TRUE
	END AND
	CASE 
		WHEN ARRAY_LENGTH($21::INT[], 1) > 0 THEN st.street_id = ANY($21::INT[]) 
		ELSE TRUE
	END AND
	CASE 
		WHEN ARRAY_LENGTH($22::INT[], 1) > 0 THEN ar.area_id = ANY($22::INT[]) 
		ELSE TRUE
	END
	ORDER BY
	(CASE WHEN $23 = 1 AND $24 = 2 THEN p.product_id END) ASC,
	(CASE WHEN $23 = 1 AND $24 = 1 THEN p.product_id END) DESC,
	(CASE WHEN $23 = 2 AND $24 = 2 THEN ps.product_status_code END) ASC,
	(CASE WHEN $23 = 2 AND $24 = 1 THEN ps.product_status_code END) DESC,
	(CASE WHEN $23 = 3 AND $24 = 2 THEN pp.product_price END) ASC,
	(CASE WHEN $23 = 3 AND $24 = 1 THEN pp.product_price END) DESC,
	(CASE WHEN $23 = 4 AND $24 = 2 AND n.neighborhood_distance IS NOT NULL THEN n.neighborhood_distance END) ASC,
	(CASE WHEN $23 = 4 AND $24 = 1 AND n.neighborhood_distance IS NOT NULL THEN n.neighborhood_distance END) DESC,
	(CASE WHEN $23 = 4 AND $24 = 2 AND st.street_distance IS NOT NULL THEN st.street_distance END) ASC,
	(CASE WHEN $23 = 4 AND $24 = 1 AND st.street_distance IS NOT NULL THEN st.street_distance END) DESC,
	(CASE WHEN $23 = 4 AND $24 = 2 AND ar.area_distance IS NOT NULL THEN ar.area_distance END) ASC,
	(CASE WHEN $23 = 4 AND $24 = 1 AND ar.area_distance IS NOT NULL THEN ar.area_distance END) DESC,
	(CASE WHEN $23 = 5 AND $24 = 2 THEN u.user_first_name END) ASC,
	(CASE WHEN $23 = 5 AND $24 = 1 THEN u.user_first_name END) DESC,
	(CASE WHEN $23 = 6 AND $24 = 2 THEN u.user_last_name END) ASC,
	(CASE WHEN $23 = 6 AND $24 = 1 THEN u.user_last_name END) DESC,
	(CASE WHEN $23 = 7 AND $24 = 2 THEN o.order_id END) ASC,
	(CASE WHEN $23 = 7 AND $24 = 1 THEN o.order_id END) DESC,
	(CASE WHEN $23 = 8 AND $24 = 2 THEN o.order_brougth_time END) ASC,
	(CASE WHEN $23 = 8 AND $24 = 1 THEN o.order_brougth_time END) DESC,
	(CASE WHEN $23 = 9 AND $24 = 2 THEN o.order_delivered_time END) ASC,
	(CASE WHEN $23 = 9 AND $24 = 1 THEN o.order_delivered_time END) DESC,
	(CASE WHEN $23 = 10 AND $24 = 2 THEN tm.bring_time_remaining END) ASC,
	(CASE WHEN $23 = 10 AND $24 = 1 THEN tm.bring_time_remaining END) DESC,
	(CASE WHEN $23 = 11 AND $24 = 2 THEN tm.delivery_time_remaining END) ASC,
	(CASE WHEN $23 = 11 AND $24 = 1 THEN tm.delivery_time_remaining END) DESC
	OFFSET $1 ROWS FETCH FIRST $2 ROW ONLY
`

const PRODUCT = `
	SELECT
		p.product_id,
		p.product_size,
		p.product_size_details,
		p.product_summary,
		p.service_id,
		p.order_id,
		p.product_img,
		o.order_special,
		pp.product_price,
		to_char(p.product_created_at, 'YYYY-MM-DD HH24:MI:SS') product_created_at
	FROM products p
	NATURAL JOIN orders o
	NATURAL JOIN addresses a
	LEFT JOIN clients c ON c.client_id = o.client_id
	LEFT JOIN users u ON u.user_id = c.user_id
	LEFT JOIN states sta ON sta.state_id = a.state_id
	LEFT JOIN regions r ON r.region_id = a.region_id
	LEFT JOIN neighborhoods n ON n.neighborhood_id = a.neighborhood_id
	LEFT JOIN streets st ON st.street_id = a.street_id
	LEFT JOIN areas ar ON ar.area_id = a.area_id
	LEFT JOIN LATERAL (
		SELECT * FROM product_statuses WHERE product_id = p.product_id
		ORDER BY product_status_id DESC LIMIT 1
	) ps ON ps.product_id = p.product_id
	LEFT JOIN (
		SELECT
			p.product_id,
			s.service_name,
			CASE
				WHEN o.order_special = TRUE THEN s.service_price_special * p.product_size
				WHEN o.order_special = FALSE THEN s.service_price_simple * p.product_size
			ELSE NULL
			END AS product_price
		FROM products p
		NATURAL JOIN orders o
		NATURAL JOIN services s
	) pp ON pp.product_id = p.product_id
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
		WHEN $2 > 0 THEN p.product_id = $2
		ELSE TRUE
	END AND
	CASE
		WHEN $3 > 0 THEN o.order_id = $3
		ELSE TRUE
	END AND
	CASE
		WHEN $4 > 0 THEN o.client_id = $4
		ELSE TRUE
	END AND
	CASE
		WHEN $5 > 0 THEN o.branch_id = $5
		ELSE TRUE
	END AND
	CASE
		WHEN $6 > 0 THEN p.service_id = $6
		ELSE TRUE
	END
`

const PRODUCT_STATUSES = `
	SELECT
		product_status_id,
		product_status_code AS status_code,
		staff_id,
		to_char(product_status_created_at, 'YYYY-MM-DD HH24:MI:SS') status_created_at
	FROM product_statuses
	WHERE product_id = $1
	ORDER BY product_status_id ASC
`

export default {
	PRODUCT_STATUSES,
	PRODUCTS,
	PRODUCT
}