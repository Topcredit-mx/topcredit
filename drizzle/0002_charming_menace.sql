--> statement-breakpoint
-- Deduplicate global `terms` rows (same duration_type + duration) without breaking FKs or
-- term_offerings (company_id, term_id) uniqueness.
WITH term_canonical AS (
	SELECT
		id AS term_id,
		MIN(id) OVER (PARTITION BY duration_type, duration) AS canonical_term_id
	FROM terms
),
dup_terms AS (
	SELECT term_id AS dup_term_id, canonical_term_id
	FROM term_canonical
	WHERE term_id <> canonical_term_id
),
-- Same company already has an offering for the canonical term: merge dup offerings into keeper.
conflicting_offerings AS (
	SELECT
		o_dup.id AS dup_offering_id,
		o_keep.id AS keeper_offering_id
	FROM term_offerings AS o_dup
	INNER JOIN dup_terms AS d ON o_dup.term_id = d.dup_term_id
	INNER JOIN term_offerings AS o_keep
		ON o_keep.company_id = o_dup.company_id
		AND o_keep.term_id = d.canonical_term_id
)
UPDATE applications AS a
SET term_offering_id = co.keeper_offering_id
FROM conflicting_offerings AS co
WHERE a.term_offering_id = co.dup_offering_id;
--> statement-breakpoint
WITH term_canonical AS (
	SELECT
		id AS term_id,
		MIN(id) OVER (PARTITION BY duration_type, duration) AS canonical_term_id
	FROM terms
),
dup_terms AS (
	SELECT term_id AS dup_term_id, canonical_term_id
	FROM term_canonical
	WHERE term_id <> canonical_term_id
),
conflicting_offerings AS (
	SELECT
		o_dup.id AS dup_offering_id,
		o_keep.id AS keeper_offering_id
	FROM term_offerings AS o_dup
	INNER JOIN dup_terms AS d ON o_dup.term_id = d.dup_term_id
	INNER JOIN term_offerings AS o_keep
		ON o_keep.company_id = o_dup.company_id
		AND o_keep.term_id = d.canonical_term_id
)
DELETE FROM term_offerings AS o
USING conflicting_offerings AS co
WHERE o.id = co.dup_offering_id;
--> statement-breakpoint
WITH term_canonical AS (
	SELECT
		id AS term_id,
		MIN(id) OVER (PARTITION BY duration_type, duration) AS canonical_term_id
	FROM terms
),
dup_terms AS (
	SELECT term_id AS dup_term_id, canonical_term_id
	FROM term_canonical
	WHERE term_id <> canonical_term_id
)
UPDATE term_offerings AS o
SET term_id = d.canonical_term_id
FROM dup_terms AS d
WHERE o.term_id = d.dup_term_id;
--> statement-breakpoint
DELETE FROM terms AS t
WHERE EXISTS (
	SELECT 1
	FROM terms AS t2
	WHERE
		t2.duration_type = t.duration_type
		AND t2.duration = t.duration
		AND t2.id < t.id
);
--> statement-breakpoint
-- Any remaining duplicate (company_id, term_id) rows (e.g. legacy data): keep one offering.
WITH dup_offerings AS (
	SELECT
		id,
		FIRST_VALUE(id) OVER (
			PARTITION BY company_id, term_id
			ORDER BY
				(
					SELECT COUNT(*)::int
					FROM applications AS a
					WHERE a.term_offering_id = term_offerings.id
				) DESC,
				id
		) AS keeper_id
	FROM term_offerings
),
remap_apps AS (
	SELECT id AS dup_offering_id, keeper_id
	FROM dup_offerings
	WHERE id <> keeper_id
)
UPDATE applications AS a
SET term_offering_id = r.keeper_id
FROM remap_apps AS r
WHERE a.term_offering_id = r.dup_offering_id;
--> statement-breakpoint
DELETE FROM term_offerings AS o
WHERE o.id IN (
	SELECT id
	FROM (
		SELECT
			id,
			ROW_NUMBER() OVER (
				PARTITION BY company_id, term_id
				ORDER BY id
			) AS rn
		FROM term_offerings
	) AS d
	WHERE d.rn > 1
);
--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_duration_type_duration_unique" UNIQUE ("duration_type", "duration");
