import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Card, DatePicker, InputNumber, Row, Col, Typography } from "antd";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from "recharts";
import { getDeliveredDaily, getDeliveredMonthly, getStatusDaily, getTopCategories, getTopCities } from "../../api/analytics.api";
import { useQuery } from "@tanstack/react-query";

const { RangePicker } = DatePicker;

export default function DashboardPage() {
  const [range, setRange] = useState([dayjs("2017-01-01"), dayjs("2017-12-31")]);
  const [year, setYear] = useState(2017);
  const [limit, setLimit] = useState(10);

  const params = useMemo(() => ({
    start: range?.[0]?.format("YYYY-MM-DD"),
    end: range?.[1]?.format("YYYY-MM-DD"),
  }), [range]);

  const { data: daily = [] } = useQuery({ queryKey: ["deliveredDaily", params],   queryFn: () => getDeliveredDaily(params) });
  const { data: monthly = [] } = useQuery({ queryKey: ["deliveredMonthly", year],  queryFn: () => getDeliveredMonthly({ year }) });
  const { data: status = [] } = useQuery({ queryKey: ["statusDaily", params],      queryFn: () => getStatusDaily(params) });
  const { data: cities = [] } = useQuery({ queryKey: ["topCities", params, limit],  queryFn: () => getTopCities({ ...params, limit }) });
  const { data: categories = [] } = useQuery({ queryKey: ["topCategories", params, limit], queryFn: () => getTopCategories({ ...params, limit }) });

  const totalDelivered = useMemo(() => (monthly || []).reduce((a, b) => a + Number(b.delivered_count || b.delivered || 0), 0), [monthly]);

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
    return Array.from(s).slice(0, 6); // tampilkan max 6 status biar rapi
  }, [status]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-16">
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
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="delivered_count" name="Delivered" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={`Monthly Trend of Delivered Products (${year})`}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="delivered_count" name="Delivered" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Daily Status of Product Purchase (Stacked)">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {statusKeys.map((k) => <Bar key={k} dataKey={k} stackId="a" />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={`Top ${limit} Customer Cities`}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cities} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="customer_city" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders_count" name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={`Top ${limit} Purchased Product Categories`}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="category" type="category" width={200} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="items_count" name="Items" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
