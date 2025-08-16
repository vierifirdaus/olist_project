import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Card, DatePicker, InputNumber, Row, Col, Typography, Tabs, Progress } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter, ZAxis, Cell, ComposedChart,
} from "recharts";

// existing analytics (tetap)
import { getDeliveredDaily, getDeliveredMonthly, getStatusDaily, getTopCategories, getTopCities } from "../../api/analytics.api";
import {
  getSLA, getFunnel, getRevenueMonthly, getPaymentsMix, getReviewsSummary, getBasketSize,
  getFreightScatter, getLeadtimeBreak, getPurchaseHeatmap, getSellersPareto
} from "../../api/analytics.api";

const { RangePicker } = DatePicker;

export default function DashboardPage() {
  const [range, setRange] = useState([dayjs("2017-01-01"), dayjs("2017-12-31")]);
  const [year, setYear] = useState(2017);
  const [limit, setLimit] = useState(10);

  const params = useMemo(() => ({
    start: range?.[0]?.format("YYYY-MM-DD"),
    end: range?.[1]?.format("YYYY-MM-DD"),
  }), [range]);

  // existing queries
  const { data: daily = [] }      = useQuery({ queryKey: ["deliveredDaily", params], queryFn: () => getDeliveredDaily(params) });
  const { data: monthly = [] }    = useQuery({ queryKey: ["deliveredMonthly", year],  queryFn: () => getDeliveredMonthly({ year }) });
  const { data: status = [] }     = useQuery({ queryKey: ["statusDaily", params],     queryFn: () => getStatusDaily(params) });
  const { data: cities = [] }     = useQuery({ queryKey: ["topCities", params, limit], queryFn: () => getTopCities({ ...params, limit }) });
  const { data: categories = [] } = useQuery({ queryKey: ["topCategories", params, limit], queryFn: () => getTopCategories({ ...params, limit }) });

  // new queries
  const { data: sla }           = useQuery({ queryKey: ["sla", params],           queryFn: () => getSLA(params) });
  const { data: funnel }        = useQuery({ queryKey: ["funnel", params],        queryFn: () => getFunnel(params) });
  const { data: rev = [] }      = useQuery({ queryKey: ["revMonthly", year],      queryFn: () => getRevenueMonthly({ year }) });
  const { data: paymix = [] }   = useQuery({ queryKey: ["payMix", params],        queryFn: () => getPaymentsMix(params) });
  const { data: reviews }       = useQuery({ queryKey: ["reviews", params],       queryFn: () => getReviewsSummary(params) });
  const { data: basket = [] }   = useQuery({ queryKey: ["basket", params],        queryFn: () => getBasketSize(params) });
  const { data: scatter = [] }  = useQuery({ queryKey: ["freightScatter", params],queryFn: () => getFreightScatter({ ...params, limit: 1500 }) });
  const { data: leadtime }      = useQuery({ queryKey: ["leadtime", params],      queryFn: () => getLeadtimeBreak(params) });
  const { data: heat = [] }     = useQuery({ queryKey: ["heatmap", params],       queryFn: () => getPurchaseHeatmap(params) });
  const { data: pareto = [] }   = useQuery({ queryKey: ["pareto", params],        queryFn: () => getSellersPareto({ ...params, limit: 50 }) });

  const totalDelivered = useMemo(() =>
    (monthly || []).reduce((a, b) => a + Number(b.delivered_count || b.delivered || 0), 0), [monthly]);

  const statusData = useMemo(() => {
    const map = {};
    status.forEach((r) => {
      const day = r.day;
      map[day] ||= { day };
      map[day][r.order_status] = r.count;
    });
    return Object.values(map).slice(0, 30);
  }, [status]);

  const statusKeys = useMemo(() => {
    const s = new Set();
    status.forEach(r => s.add(r.order_status));
    return Array.from(s).slice(0, 6);
  }, [status]);

  // transform heatmap grid 7x24
  const heatGrid = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    heat.forEach(r => { grid[r.dow][r.hr] = r.count; });
    return grid;
  }, [heat]);

  // Tabs content
  const OverviewTab = (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Total Delivered (per year)">
            <div className="text-3xl font-semibold">{totalDelivered.toLocaleString()}</div>
            <div className="text-slate-500">Sum of monthly delivered in {year}</div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Data Window">
            <div className="text-lg">{params.start} → {params.end}</div>
            <div className="text-slate-500">Filters applied</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Daily Trend of Delivered Products">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip /><Legend />
                  <Line type="monotone" dataKey="delivered_count" name="Delivered" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={`Monthly Trend (${year})`}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="delivered_count" name="Delivered" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Daily Status (Stacked)">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" /><YAxis /><Tooltip /><Legend />
                  {statusKeys.map((k) => <Bar key={k} dataKey={k} stackId="a" />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={`Top ${limit} Cities`}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cities} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" /><YAxis dataKey="customer_city" type="category" width={150} />
                  <Tooltip /><Legend />
                  <Bar dataKey="orders_count" name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={`Top ${limit} Categories`}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" /><YAxis dataKey="category" type="category" width={200} />
                  <Tooltip /><Legend />
                  <Bar dataKey="items_count" name="Items" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );

  const InsightsTab = (
    <>
      <Row gutter={[16,16]}>
        <Col xs={24} md={12}>
          <Card title="SLA Hit Rate">
            <div className="flex items-center gap-4">
              <Progress type="circle" percent={Math.round((sla?.hit_rate || 0) * 100)} />
              <div>
                <div>Avg Late Days: <b>{(sla?.avg_late_days ?? 0).toFixed(2)}</b></div>
                <div>P50 / P90: <b>{(sla?.p50_late_days ?? 0).toFixed(2)}</b> / <b>{(sla?.p90_late_days ?? 0).toFixed(2)}</b></div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Order Funnel">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={[
                  { stage:"Purchased", value:funnel?.purchased || 0 },
                  { stage:"Approved",  value:funnel?.approved  || 0 },
                  { stage:"Shipped",   value:funnel?.shipped   || 0 },
                  { stage:"Delivered", value:funnel?.delivered || 0 },
                  { stage:"Canceled",  value:funnel?.canceled  || 0 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" /><YAxis /><Tooltip />
                  <Bar dataKey="value" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16,16]}>
        <Col xs={24} lg={12}>
          <Card title={`Revenue & AOV (${year})`}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rev}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                  <Area dataKey="gmv" name="GMV" />
                  <Line dataKey="aov" name="AOV" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Payments Mix">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymix}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="payment_type" /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="count" name="Count" />
                </BarChart>
              </ResponsiveContainer>
              <div className="text-xs text-slate-500 mt-1">Tooltip menunjukkan rata-rata cicilan</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16,16]}>
        <Col xs={24} lg={12}>
          <Card title="Review Score Distribution & Trend">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reviews?.histogram || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="score" /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-56 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reviews?.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" /><YAxis domain={[0,5]} /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="avg_score" name="Avg Score" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Basket Size (Items / Order)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={basket}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="items" /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16,16]}>
        <Col xs={24} lg={12}>
          <Card title="Freight vs Price (Scatter)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid />
                  <XAxis dataKey="price" name="Price" />
                  <YAxis dataKey="freight" name="Freight" />
                  <ZAxis range={[50, 50]} />
                  <Tooltip />
                  <Scatter data={scatter} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Lead-time Breakdown (avg days)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  {stage:"Purchase→Approved", value: leadtime?.purchase_to_approved || 0},
                  {stage:"Approved→Carrier",  value: leadtime?.approved_to_carrier  || 0},
                  {stage:"Carrier→Customer",  value: leadtime?.carrier_to_customer  || 0},
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" /><YAxis /><Tooltip />
                  <Bar dataKey="value" name="Days" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16,16]}>
        <Col xs={24}>
          <Card title="Purchase Heatmap (DOW × Hour)">
            <div className="grid grid-cols-24 gap-1">
              {heatGrid.map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-24 gap-1">
                  {row.map((v, cIdx) => {
                    const alpha = Math.min(1, v / 50); // skala sederhana
                    return (
                      <div key={cIdx} title={`dow ${rIdx}, hour ${cIdx}: ${v}`}
                        style={{ background: `rgba(37, 99, 235, ${alpha})` }}
                        className="h-4 w-4 rounded-sm" />
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16,16]}>
        <Col xs={24}>
          <Card title="Sellers Pareto (Top 50 by GMV)">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={pareto}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="seller_id" hide /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="gmv" name="GMV" />
                  <Line dataKey="cum_share" name="Cumulative Share" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Typography.Title level={2}>Dashboard</Typography.Title>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-3">
            <span className="text-slate-600">Date range</span>
            <RangePicker value={range} onChange={setRange} allowClear={false} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-600">Year</span>
            <InputNumber value={year} min={2016} max={2020} onChange={setYear} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-600">Top N</span>
            <InputNumber value={limit} min={3} max={20} onChange={setLimit} />
          </div>
        </div>
      </Card>

      <Tabs
        defaultActiveKey="overview"
        items={[
          { key: "overview", label: "Overview", children: OverviewTab },
          { key: "insights", label: "Insights", children: InsightsTab },
        ]}
      />
    </div>
  );
}
