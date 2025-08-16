import React, { useEffect, useMemo, useState } from "react";
import { Card, Select, DatePicker, InputNumber, Row, Col, Spin } from "antd";
import dayjs from "dayjs";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Polyline,
  Tooltip as LTooltip,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geoChoropleth, geoCustomerPoints, geoFlows } from "../../api/geo.api";

const { RangePicker } = DatePicker;

// warna dasar untuk negara (saat tidak ada nilai)
const BASE_FILL = "#fde68a"; // kuning lembut
const OUTLINE = "#475569";   // garis batas state

// Custom arrowhead for flow direction
const arrowHead = L.icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="%23ef4444"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

export default function GeoPage() {
  const [range, setRange] = useState([dayjs("2017-01-01"), dayjs("2017-12-31")]);
  const [metric, setMetric] = useState("orders"); // orders | delivery_days | freight
  const [category] = useState("");                // disiapkan kalau nanti mau ditambah filter kategori
  const [limit, setLimit] = useState(2000);
  const [minCount, setMinCount] = useState(50);

  const [statesGeo, setStatesGeo] = useState(null);
  const [choropleth, setChoropleth] = useState([]);
  const [points, setPoints] = useState([]);
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);

  const params = {
    start: range?.[0]?.format("YYYY-MM-DD"),
    end:   range?.[1]?.format("YYYY-MM-DD"),
    category: category || undefined,
  };

  // Load GeoJSON Brazil (pastikan file ada di public/geo/brazil-states.geojson)
  useEffect(() => {
    let cancelled = false;
    fetch("/geo/brazil-states.geojson")
      .then((r) => {
        if (!r.ok) throw new Error("GeoJSON not found");
        return r.json();
      })
      .then((g) => !cancelled && setStatesGeo(g))
      .catch((e) => console.error("GeoJSON load failed:", e));
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch data dari backend
  useEffect(() => {
    setLoading(true);
    Promise.all([
      geoChoropleth({ ...params, metric }),
      geoCustomerPoints({ ...params, limit }),
      geoFlows({ ...params, minCount }),
    ])
      .then(([st, pt, fl]) => {
        setChoropleth(st || []);
        setPoints(pt || []);
        setFlows(fl || []);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, limit, minCount, range[0], range[1]]); // category belum dipakai di UI

  // Map state -> record
  const choroplethMap = useMemo(() => {
    const m = new Map();
    (choropleth || []).forEach((r) => r?.state && m.set(r.state, r));
    return m;
  }, [choropleth]);

  // skala warna
  const maxVal = useMemo(() => {
    const vals = (choropleth || []).map((d) =>
      metric === "freight" ? Number(d.total_freight || 0)
      : metric === "delivery_days" ? Number(d.avg_delivery_days || 0)
      : Number(d.orders || 0)
    );
    return Math.max(1, ...vals, 1);
  }, [choropleth, metric]);

  const color = (v) => {
    const t = Math.min(1, (Number(v) || 0) / maxVal);
    const g = Math.floor(220 - 160 * t);
    return `rgb(255, ${g}, 120)`;
  };

  // helpers
  const getUF = (feature) => {
    const p = feature?.properties || {};
    return (
      p.sigla || p.UF || p.state || p.uf || p.estado || p.STATE ||
      p.state_code || p.CODE_UF || null
    );
  };
  const valueFor = (uf) => {
    if (!uf) return null;
    const r = choroplethMap.get(uf);
    if (!r) return null;
    return metric === "freight"
      ? Number(r.total_freight)
      : metric === "delivery_days"
      ? Number(r.avg_delivery_days)
      : Number(r.orders);
  };
  const fmt = (v) =>
    metric === "delivery_days" ? Number(v).toFixed(2) : Math.round(Number(v)).toLocaleString();

  // kurangi kepadatan garis: ambil Top 200 berdasarkan cnt
  const topFlows = useMemo(
    () => [...(flows || [])].sort((a, b) => (b?.cnt || 0) - (a?.cnt || 0)).slice(0, 200),
    [flows]
  );

  // Calculate midpoint for arrow placement
  const getMidpoint = (from, to) => {
    return [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2
    ];
  };

  // Calculate rotation angle for arrow
  const getAngle = (from, to) => {
    return Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI;
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col><span>Range</span></Col>
          <Col><RangePicker value={range} onChange={setRange} /></Col>
          <Col>
            <Select
              value={metric}
              onChange={setMetric}
              style={{ width: 200 }}
              options={[
                { value: "orders",        label: "Orders" },
                { value: "delivery_days", label: "Avg Delivery Days" },
                { value: "freight",       label: "Total Freight" },
              ]}
            />
          </Col>
          <Col><span>Top points</span></Col>
          <Col><InputNumber min={100} max={10000} value={limit} onChange={setLimit} /></Col>
          <Col><span>Min flow</span></Col>
          <Col><InputNumber min={10} max={1000} value={minCount} onChange={setMinCount} /></Col>
        </Row>
      </Card>

      <Card title="Geospatial Overview">
        {loading || !statesGeo ? (
          <Spin />
        ) : (
          <MapContainer center={[-14.2, -51.9]} zoom={4} style={{ height: 620, width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Choropleth per state (selalu ada fill) */}
            <GeoJSON
              data={statesGeo}
              style={(feature) => {
                const uf = getUF(feature);
                const val = valueFor(uf);
                const fill = val == null ? BASE_FILL : color(val);
                return { fillColor: fill, weight: 1, color: OUTLINE, fillOpacity: 0.5 };
              }}
              onEachFeature={(feature, layer) => {
                const uf = getUF(feature);
                const val = valueFor(uf);
                if (uf && val != null) layer.bindTooltip(`${uf}: ${fmt(val)}`);
              }}
            />

            {/* Customer points */}
            {(points || []).map((p, i) => {
              if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lng)) return null;
              return (
                <CircleMarker
                  key={i}
                  center={[p.lat, p.lng]}
                  radius={Math.max(2, Math.min(10, Math.log2((p.orders_count || 1) + 1)))}
                  pathOptions={{ color: "#2563eb", fillOpacity: 0.5 }}
                >
                  <LTooltip>
                    {(p.city || "Unknown").toUpperCase()} • {p.orders_count} orders
                  </LTooltip>
                </CircleMarker>
              );
            })}

            {/* Flows (polyline dengan arah jelas) */}
            {topFlows.map((f, i) => {
              if (
                !Number.isFinite(f?.from_lat) || !Number.isFinite(f?.from_lng) ||
                !Number.isFinite(f?.to_lat)   || !Number.isFinite(f?.to_lng)
              ) return null;
              
              const fromPos = [f.from_lat, f.from_lng];
              const toPos = [f.to_lat, f.to_lng];
              const midpoint = getMidpoint(fromPos, toPos);
              const angle = getAngle(fromPos, toPos);
              
              return (
                <React.Fragment key={i}>
                  <Polyline
                    positions={[fromPos, toPos]}
                    pathOptions={{
                      color: "#ef4444",
                      weight: Math.min(6, 1 + Math.log2((f.cnt || 1))),
                      opacity: 0.6,
                    }}
                  />
                  {/* Arrow marker at midpoint */}
                  <CircleMarker
                    center={midpoint}
                    radius={6}
                    pathOptions={{
                      fillColor: "#ef4444",
                      color: "#ef4444",
                      fillOpacity: 1,
                    }}
                  >
                    <LTooltip>
                      From: {f.from_city || "Unknown"} → To: {f.to_city || "Unknown"}<br />
                      Orders: {f.cnt || 0}
                    </LTooltip>
                  </CircleMarker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        )}
      </Card>
    </div>
  );
}