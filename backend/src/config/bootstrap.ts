import { pgPool } from "./pgPool";

export async function ensureGeoMaterializedViews() {
  const sql = `
  CREATE MATERIALIZED VIEW IF NOT EXISTS mv_zip_centroids AS
  SELECT geolocation_zip_code_prefix AS zip,
         AVG(geolocation_lat)  AS lat,
         AVG(geolocation_lng)  AS lng,
         MIN(geolocation_state) AS state
  FROM geolocation
  GROUP BY geolocation_zip_code_prefix;

  CREATE INDEX IF NOT EXISTS idx_mv_zip_zip ON mv_zip_centroids(zip);

  CREATE MATERIALIZED VIEW IF NOT EXISTS mv_city_centroids AS
  SELECT lower(geolocation_city) AS city,
         geolocation_state       AS state,
         AVG(geolocation_lat)    AS lat,
         AVG(geolocation_lng)    AS lng
  FROM geolocation
  GROUP BY lower(geolocation_city), geolocation_state;

  CREATE INDEX IF NOT EXISTS idx_mv_city_city_state
  ON mv_city_centroids(city, state);
  `;
  await pgPool.query(sql);
}
