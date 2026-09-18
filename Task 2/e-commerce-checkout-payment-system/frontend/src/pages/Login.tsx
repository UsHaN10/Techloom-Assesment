import React, { useEffect } from 'react';
import { Row, Col, Typography, Card } from 'antd';
import { ShoppingOutlined, SafetyOutlined, TagOutlined, InteractionOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import { useAuthStore } from '../store/authStore';

const { Title, Text, Paragraph } = Typography;

const Login: React.FC = () => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    return (
        <div style={{
            minHeight: '100vh',
            background: '#eb9dcf url("/bg.jpg") center/cover fixed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <Card style={{
                maxWidth: '1000px',
                width: '100%',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.4)',
                padding: 0
            }} bodyStyle={{ padding: 0 }}>
                <Row>
                    {/* LEFT SIDE BRANDING (Hides on Mobile) */}
                    <Col xs={0} md={11} style={{
                        background: 'linear-gradient(135deg, rgba(229, 69, 165, 0.85) 0%, rgba(250, 113, 205, 0.95) 100%)',
                        padding: '60px 40px',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ position: 'relative', zIndex: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    padding: '12px',
                                    borderRadius: '16px',
                                    backdropFilter: 'blur(5px)'
                                }}>
                                    <ShoppingOutlined style={{ fontSize: '32px', color: '#fff' }} />
                                </div>
                                <Title level={2} style={{ color: 'white', margin: 0, letterSpacing: '1px' }}>
                                    PayCart POS
                                </Title>
                            </div>

                            <Title level={1} style={{ color: 'white', marginTop: '20px', fontSize: '42px', lineHeight: 1.2 }}>
                                Smart Commerce. <br />Seamless Checkout.
                            </Title>
                            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px', marginTop: '20px', lineHeight: 1.6 }}>
                                Manage products, inventory, orders and payments securely from one powerful, modern platform.
                            </Paragraph>

                            <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', opacity: 0.9 }}>
                                    <SafetyOutlined style={{ fontSize: '20px' }} /> <span>Bank-grade security</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', opacity: 0.9 }}>
                                    <TagOutlined style={{ fontSize: '20px' }} /> <span>Advanced inventory tracking</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', opacity: 0.9 }}>
                                    <InteractionOutlined style={{ fontSize: '20px' }} /> <span>Real-time concurrency lock</span>
                                </div>
                            </div>
                        </div>

                        {/* Decorative circles */}
                        <div style={{
                            position: 'absolute', top: '-10%', right: '-20%', width: '300px', height: '300px',
                            borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(3xl)'
                        }} />
                        <div style={{
                            position: 'absolute', bottom: '-20%', left: '-10%', width: '400px', height: '400px',
                            borderRadius: '50%', background: 'rgba(255,255,255,0.15)', filter: 'blur(4xl)'
                        }} />
                    </Col>

                    {/* RIGHT SIDE FORM */}
                    <Col xs={24} md={13} style={{ padding: '60px 50px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
                            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                <Title level={2} style={{ color: '#2c3e50', marginBottom: '8px' }}>Welcome Back</Title>
                                <Text style={{ color: '#7f8c8d', fontSize: '16px' }}>Sign in to continue to PayCart POS</Text>
                            </div>

                            <LoginForm />

                            <div style={{ textAlign: 'center', marginTop: '32px' }}>
                                <Text style={{ color: '#7f8c8d' }}>
                                    Don't have an account? <a href="#" style={{ color: '#e545a5', fontWeight: 'bold' }}>Create Account</a>
                                </Text>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default Login;
