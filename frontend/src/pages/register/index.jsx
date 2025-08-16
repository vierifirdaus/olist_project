import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Form, Input, Typography, message, Card } from "antd";
import { useAuth } from "../../hooks/useAuth.jsx";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();

  const onFinish = async (v) => {
    if (v.password !== v.confirm) return message.warning("Passwords don't match");
    try {
      await register({ email: v.email, name: v.name, password: v.password });
      message.success("Registered & logged in");
      nav("/dashboard", { replace: true });
    } catch (e) {
      message.error(e?.response?.data?.message || "Register failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <Typography.Title level={3} style={{ marginBottom: 24, textAlign: "center" }}>
          Register
        </Typography.Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input placeholder="you@example.com" />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Your name" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="confirm" label="Confirm Password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Create account</Button>
          <div className="text-center mt-3">
            Sudah punya akun? <Link to="/login">Login</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
