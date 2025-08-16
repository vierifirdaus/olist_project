import React, { useEffect, useMemo, useState } from "react";
import { Card, Select, DatePicker, InputNumber, Row, Col, Spin } from "antd";
import dayjs from "dayjs";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Polyline, Tooltip as LTooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { geoChoropleth, geoCustomerPoints, geoFlows } from "../../api/geo.api";

const { RangePicker } = DatePicker;


export default function GeoPage() {
  const [range, setRange] = useState([dayjs("2017-01-01"), dayjs("2017-12-31")]);
  const [metric, setMetric] = useState("orders"); // orders | delivery_days | freight
  const [category, setCategory] = useState("");
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

  // Load geojson brazil states from public/
  useEffect(() => {
    fetch("/geo/brazil-states.geojson").then(r => r.json()).then(setStatesGeo);
  }, []);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      geoChoropleth({ ...params, metric }),
      geoCustomerPoints({ ...params, limit }),
      geoFlows({ ...params, minCount }),
    ]).then(([st, pt, fl]) => {
      setChoropleth(st);
      setPoints(pt);
      setFlows(fl);
    }).finally(() => setLoading(false));
  }, [metric, category, limit, minCount, range[0], range[1]]);

  const choroplethMap = useMemo(() => {
    const m = new Map();
    choropleth.forEach((r) => m.set(r.state, r));
    return m;
  }, [choropleth]);

  const maxVal = useMemo(() => {
    const vals = choropleth.map((d) =>
      metric === "freight" ? d.total_freight :
      metric === "delivery_days" ? d.avg_delivery_days :
      d.orders
    );
    return Math.max(1, ...vals);
  }, [choropleth, metric]);

  const color = (v) => {
    const t = Math.min(1, (v || 0) / maxVal);
    const g = Math.floor(220 - 160 * t);
    return `rgb(255, ${g}, 120)`;
  };

  // helper di dalam komponen GeoPage (letakkan sebelum return)
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
    metric === "delivery_days" ? v.toFixed(2) : Math.round(v).toLocaleString();



  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <Row gutter={[16,16]} align="middle">
          <Col><span>Range</span></Col>
          <Col><RangePicker value={range} onChange={setRange} /></Col>
          <Col>
            <Select value={metric} onChange={setMetric} style={{ width: 200 }}
              options={[
                { value:"orders",        label:"Orders" },
                { value:"delivery_days", label:"Avg Delivery Days" },
                { value:"freight",       label:"Total Freight" },
              ]}/>
          </Col>
          <Col><span>Top points</span></Col>
          <Col><InputNumber min={100} max={10000} value={limit} onChange={setLimit} /></Col>
          <Col><span>Min flow</span></Col>
          <Col><InputNumber min={10} max={1000} value={minCount} onChange={setMinCount} /></Col>
        </Row>
      </Card>

      <Card title="Geospatial Overview">
        {loading || !statesGeo ? <Spin /> : (
          <MapContainer center={[-14.2, -51.9]} zoom={4} style={{ height: 620, width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Choropleth per state */}
            <GeoJSON
              data={statesGeo}
              style={(feature) => {
                const uf  = getUF(feature);
                const val = valueFor(uf);
                const fill = val == null ? BASE_FILL : color(val); // selalu ada fill
                return { fillColor: fill, weight: 1, color: outline, fillOpacity: 0.5 };
              }}
              onEachFeature={(feature, layer) => {
                const uf  = getUF(feature);
                const val = valueFor(uf);
                if (uf && val != null) layer.bindTooltip(`${uf}: ${Math.round(val).toLocaleString()}`);
              }}
            />



            {/* Customer points */}
            {points.map((p, i) => (
              <CircleMarker key={i} center={[p.lat, p.lng]}
                radius={Math.max(2, Math.min(10, Math.log2((p.orders_count||1)+1)))}
                pathOptions={{ color:"#2563eb", fillOpacity:0.5 }}>
                <LTooltip>{`${(p.city||"").toUpperCase()} • ${p.orders_count} orders`}</LTooltip>
              </CircleMarker>
            ))}

            {/* Flows (polyline sederhana) */}
            {flows.map((f, i) => (
              <Polyline key={i}
                positions={[[f.from_lat, f.from_lng],[f.to_lat, f.to_lng]]}
                pathOptions={{ color:"#ef4444", weight: Math.min(6, 1 + Math.log2((f.cnt||1))) , opacity:0.7 }}
              />
            ))}
          </MapContainer>
        )}
      </Card>
    </div>
  );
}
