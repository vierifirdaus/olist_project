import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button, Form, Input, Typography, message, Card } from "antd";
import { useAuth } from "../../hooks/useAuth.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from?.pathname || "/dashboard";

  const onFinish = async (values) => {
    try {
      await login({ email: values.email, password: values.password });
      message.success("Logged in");
      nav(from, { replace: true });
    } catch (e) {
      message.error(e?.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <Typography.Title level={3} style={{ marginBottom: 24, textAlign: "center" }}>
          Login
        </Typography.Title>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ email: "", password: "" }}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input placeholder="you@example.com" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Sign In</Button>
          <div className="text-center mt-3">
            Belum punya akun? <Link to="/register">Register</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
