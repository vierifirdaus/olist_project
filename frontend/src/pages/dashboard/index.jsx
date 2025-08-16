import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Card, DatePicker, InputNumber, Row, Col, Typography } from "antd";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from "recharts";
import { getDeliveredDaily, getDeliveredMonthly, getStatusDaily, getTopCategories, getTopCities } from "../../api/analytics.api";
import { useQuery } from "@tanstack/react-query";

const { RangePicker } = DatePicker;

// Constants for consistent styling
const CHART_COLORS = {
  delivered: "#4CAF50",
  canceled: "#F44336",
  invoiced: "#2196F3",
  processing: "#FFC107",
  shipped: "#FF9800",
  unavailable: "#9E9E9E",
  default: "#8884d8",
};

const DashboardPage = () => {
  // Global filter state
  const [filters, setFilters] = useState({
    dateRange: [dayjs("2017-01-01"), dayjs("2017-12-31")],
    year: 2017,
    limit: 10,
  });

  // Memoized query params
  const queryParams = useMemo(() => ({
    daily: {
      start: filters.dateRange[0].format("YYYY-MM-DD"),
      end: filters.dateRange[1].format("YYYY-MM-DD"),
    },
    monthly: { year: filters.year },
    topItems: {
      start: filters.dateRange[0].format("YYYY-MM-DD"),
      end: filters.dateRange[1].format("YYYY-MM-DD"),
      limit: filters.limit,
    },
  }), [filters]);

  // Data fetching
  const { data: daily = [] } = useQuery({
    queryKey: ["deliveredDaily", queryParams.daily],
    queryFn: () => getDeliveredDaily(queryParams.daily),
  });

  const { data: monthly = [] } = useQuery({
    queryKey: ["deliveredMonthly", queryParams.monthly],
    queryFn: () => getDeliveredMonthly(queryParams.monthly),
  });

  const { data: status = [] } = useQuery({
    queryKey: ["statusDaily", queryParams.daily],
    queryFn: () => getStatusDaily(queryParams.daily),
  });

  const { data: cities = [] } = useQuery({
    queryKey: ["topCities", queryParams.topItems],
    queryFn: () => getTopCities(queryParams.topItems),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["topCategories", queryParams.topItems],
    queryFn: () => getTopCategories(queryParams.topItems),
  });

  // Derived data
  const totalDelivered = useMemo(
    () => monthly.reduce((sum, item) => sum + Number(item.delivered_count || 0), 0),
    [monthly]
  );

  const statusData = useMemo(() => {
    const groupedData = {};
    status.forEach((item) => {
      groupedData[item.day] = {
        ...groupedData[item.day],
        [item.order_status]: item.count,
        day: item.day,
      };
    });
    return Object.values(groupedData).slice(0, 30);
  }, [status]);

  const statusKeys = useMemo(
    () => [...new Set(status.map(item => item.order_status))].slice(0, 6),
    [status]
  );

  // Filter controls component
  const FilterControls = () => (
    <Card>
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-3">
          <span className="text-slate-600">Date range</span>
          <RangePicker
            value={filters.dateRange}
            onChange={(range) => setFilters({ ...filters, dateRange: range })}
            allowClear={false}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-600">Year</span>
          <InputNumber
            value={filters.year}
            min={2016}
            max={2020}
            onChange={(year) => setFilters({ ...filters, year })}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-600">Top N</span>
          <InputNumber
            value={filters.limit}
            min={3}
            max={20}
            onChange={(limit) => setFilters({ ...filters, limit })}
          />
        </div>
      </div>
    </Card>
  );

  // Chart components
  const DailyTrendChart = () => (
    <Card title="Daily Trend of Delivered Products">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="delivered_count"
              name="Delivered"
              stroke={CHART_COLORS.delivered}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  const MonthlyTrendChart = () => (
    <Card title={`Monthly Trend of Delivered Products (${filters.year})`}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="delivered_count"
              name="Delivered"
              fill={CHART_COLORS.delivered}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  const StatusChart = () => (
    <Card title="Daily Status of Product Purchase (Stacked)">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={statusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            {statusKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={CHART_COLORS[key.toLowerCase()] || CHART_COLORS.default}
                name={key}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  const TopCitiesChart = () => (
    <Card title={`Top ${filters.limit} Customer Cities`}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cities} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="customer_city" type="category" width={150} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="orders_count"
              name="Orders"
              fill={CHART_COLORS.invoiced}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  const TopCategoriesChart = () => (
    <Card title={`Top ${filters.limit} Purchased Product Categories`}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categories} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="category" type="category" width={200} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="items_count"
              name="Items"
              fill={CHART_COLORS.processing}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-16">
      <Typography.Title level={2}>Dashboard</Typography.Title>
      
      <FilterControls />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Total Delivered (per year)">
            <div className="text-3xl font-semibold">
              {totalDelivered.toLocaleString()}
            </div>
            <div className="text-slate-500">
              Sum of monthly delivered in {filters.year}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Data Window">
            <div className="text-lg">
              {queryParams.daily.start} → {queryParams.daily.end}
            </div>
            <div className="text-slate-500">Filters applied</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <DailyTrendChart />
        </Col>
        <Col xs={24} lg={12}>
          <MonthlyTrendChart />
        </Col>
        <Col xs={24} lg={12}>
          <StatusChart />
        </Col>
        <Col xs={24} lg={12}>
          <TopCitiesChart />
        </Col>
        <Col xs={24} lg={12}>
          <TopCategoriesChart />
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;