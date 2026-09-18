import { useState, useEffect } from 'react';
import { Steps, Button, Table, Typography, Card, Form, Input, Alert, Statistic, Result, message } from 'antd';
import { ShoppingCartOutlined, CreditCardOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAppStore } from '../store';

const { Title, Text } = Typography;
const { Countdown } = Statistic;

const CartCheckout = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const cart = useAppStore(state => state.cart);
    const removeFromCart = useAppStore(state => state.removeFromCart);
    const clearCart = useAppStore(state => state.clearCart);
    const navigate = useNavigate();

    const [orderId, setOrderId] = useState<string | null>(null);
    const [reservationEnd, setReservationEnd] = useState<number>(0);
    const [processing, setProcessing] = useState(false);
    const [paymentResult, setPaymentResult] = useState<'SUCCESS' | 'FAILED' | 'TIMEOUT' | null>(null);
    const [form] = Form.useForm();

    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const reserveStock = async () => {
        try {
            setProcessing(true);
            const payload = {
                items: cart.map(c => ({ productId: c._id, quantity: c.quantity }))
            };
            const res = await axios.post(`${(import.meta as any).env.VITE_API_URL || ((import.meta as any).env.PROD ? '/api' : 'http://localhost:3000/api')}/orders/reserve`, payload);
            setOrderId(res.data._id);
            setReservationEnd(new Date(res.data.expiresAt).getTime());
            setCurrentStep(2);
        } catch (error: any) {
            message.error(error.response?.data?.error || "Error reserving stock (may be oversold)");
        } finally {
            setProcessing(false);
        }
    };

    const handlePayment = async (outcome: 'SUCCESS' | 'FAILED' | 'TIMEOUT') => {
        try {
            setProcessing(true);
            await axios.post(`${(import.meta as any).env.VITE_API_URL || ((import.meta as any).env.PROD ? '/api' : 'http://localhost:3000/api')}/payments/process`, {
                orderId,
                outcome
            });
            setPaymentResult(outcome);
            if (outcome === 'SUCCESS') {
                clearCart();
            }
            setCurrentStep(3);
        } catch (error: any) {
            message.error(error.response?.data?.error || "Payment processing error");
        } finally {
            setProcessing(false);
        }
    };

    const onTimeout = () => {
        message.warning("Reservation expired");
        handlePayment('TIMEOUT');
    };

    const columns = [
        { title: 'Product', dataIndex: 'name', key: 'name' },
        { title: 'Price', dataIndex: 'price', key: 'price', render: (val: number) => `$${val.toFixed(2)}` },
        { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
        { title: 'Total', key: 'total', render: (_: any, record: any) => `$${(record.price * record.quantity).toFixed(2)}` },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: any) => (
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeFromCart(record._id)} />
            )
        }
    ];

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <Title level={2}>Checkout</Title>

            <Steps
                current={currentStep}
                style={{ marginBottom: '40px' }}
                items={[
                    { title: 'Cart', icon: <ShoppingCartOutlined /> },
                    { title: 'Shipping', icon: <CheckCircleOutlined /> },
                    { title: 'Payment', icon: <CreditCardOutlined /> },
                    { title: 'Result' }
                ]}
            />

            {currentStep === 0 && (
                <Card>
                    <Table dataSource={cart} columns={columns} rowKey="_id" pagination={false} />
                    <div style={{ textAlign: 'right', marginTop: '20px' }}>
                        <Title level={3}>Total: ${totalPrice.toFixed(2)}</Title>
                        <Button type="primary" size="large" disabled={cart.length === 0} onClick={() => setCurrentStep(1)}>
                            Proceed to Shipping
                        </Button>
                    </div>
                </Card>
            )}

            {currentStep === 1 && (
                <Card style={{ maxWidth: 600, margin: '0 auto' }}>
                    <Title level={4}>Shipping Details</Title>
                    <Form form={form} layout="vertical" onFinish={reserveStock}>
                        <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="address" label="Address" rules={[{ required: true }]}>
                            <Input.TextArea />
                        </Form.Item>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Button onClick={() => setCurrentStep(0)}>Back</Button>
                            <Button type="primary" htmlType="submit" loading={processing}>
                                Reserve Products & Pay
                            </Button>
                        </div>
                    </Form>
                </Card>
            )}

            {currentStep === 2 && (
                <Card style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
                    <Alert
                        message="Stock Reserved"
                        description="Your selected items have been reserved. Please complete payment within the timeframe."
                        type="info"
                        showIcon
                        style={{ marginBottom: 24, textAlign: 'left' }}
                    />
                    <Statistic.Countdown
                        title="Reservation Time Remaining"
                        value={reservationEnd}
                        onFinish={onTimeout}
                        valueStyle={{ fontSize: '32px', color: '#cf1322' }}
                    />
                    <div style={{ marginTop: 40 }}>
                        <Title level={4}>Mock Payment Gateway</Title>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>Select a simulated payment outcome to safely test backend handling.</Text>
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                            <Button type="primary" onClick={() => handlePayment('SUCCESS')} disabled={processing} loading={processing && paymentResult === 'SUCCESS'}>
                                Simulate Success
                            </Button>
                            <Button type="primary" danger onClick={() => handlePayment('FAILED')} disabled={processing} loading={processing && paymentResult === 'FAILED'}>
                                Simulate Failure
                            </Button>
                            <Button onClick={() => handlePayment('TIMEOUT')} disabled={processing} loading={processing && paymentResult === 'TIMEOUT'}>
                                Simulate Timeout
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {currentStep === 3 && (
                <Card>
                    {paymentResult === 'SUCCESS' ? (
                        <Result status="success" title="Order Successfully Paid!" subTitle={`Order ID: ${orderId}`} extra={[
                            <Button type="primary" key="console" onClick={() => navigate('/history')}>View Order History</Button>
                        ]} />
                    ) : paymentResult === 'FAILED' ? (
                        <Result status="error" title="Payment Failed" subTitle="Your payment was declined and stock reservation has been released." extra={[
                            <Button key="retry" onClick={() => navigate('/')}>Return to Store</Button>
                        ]} />
                    ) : (
                        <Result status="warning" title="Reservation Expired" subTitle="Your session timed out and stock was released back to inventory." extra={[
                            <Button key="retry" onClick={() => navigate('/')}>Return to Store</Button>
                        ]} />
                    )}
                </Card>
            )}

        </div>
    );
};

export default CartCheckout;
