import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { login } from '../../services/authService';

const { Text } = Typography;

const LoginForm: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const loginState = useAuthStore(state => state.loginState);
    const navigate = useNavigate();

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const data = await login(values.email, values.password);
            loginState(data.user, data.token);
            message.success('Successfully logged in');
            navigate('/');
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form
            name="normal_login"
            layout="vertical"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            style={{
                width: '100%',
                animation: 'fadeIn 0.5s ease'
            }}
        >
            <Form.Item
                name="email"
                label={<Text strong style={{ color: '#555' }}>Email Address</Text>}
                rules={[
                    { required: true, message: 'Please input your Email!' },
                    { type: 'email', message: 'Please enter a valid email!' }
                ]}
            >
                <Input
                    prefix={<UserOutlined style={{ color: '#bfbfbf' }} className="site-form-item-icon" />}
                    placeholder="Enter your email"
                    size="large"
                    style={{ borderRadius: '8px' }}
                />
            </Form.Item>

            <Form.Item
                name="password"
                label={<Text strong style={{ color: '#555' }}>Password</Text>}
                rules={[{ required: true, message: 'Please input your Password!' }]}
            >
                <Input.Password
                    prefix={<LockOutlined style={{ color: '#bfbfbf' }} className="site-form-item-icon" />}
                    placeholder="Enter your password"
                    size="large"
                    style={{ borderRadius: '8px' }}
                />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox style={{ color: '#777' }}>Remember Me</Checkbox>
                </Form.Item>
                <a style={{ color: '#e545a5', fontWeight: '500' }} href="#">
                    Forgot Password
                </a>
            </div>

            <Form.Item>
                <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    style={{
                        width: '100%',
                        borderRadius: '8px',
                        background: 'linear-gradient(90deg, #e545a5 0%, #fa71cd 100%)',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(229, 69, 165, 0.3)',
                        height: '45px',
                        fontSize: '16px',
                        fontWeight: '600'
                    }}
                >
                    Sign In
                </Button>
            </Form.Item>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                    By signing in, you agree to our Terms of Service. <br />
                    Your account information is protected.
                </Text>
            </div>
        </Form>
    );
};

export default LoginForm;
