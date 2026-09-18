import { useState } from 'react';
import { Row, Col, Card, Button, Drawer, List, Typography, Modal, Spin, message, Space } from 'antd';
import { ShoppingCartOutlined, PlusOutlined, MinusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useStore } from '../store';

const { Title, Text } = Typography;

const POS = () => {
    const { products, cart, addToCart, updateCartQty, removeFromCart, initiateCheckout, finalizePayment } = useStore();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const cartTotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

    const handleInitiate = async () => {
        setIsProcessing(true);
        try {
            await initiateCheckout();
            setPaymentModalVisible(true);
        } catch {
            // Error managed in store.jsx
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCheckout = async (outcome) => {
        setIsProcessing(true);
        try {
            await finalizePayment(outcome);
            if (outcome === 'success') {
                message.success('Payment succeeded! Order placed.');
                setDrawerVisible(false);
            }
        } catch {
            if (outcome === 'failure') {
                message.error('Payment failed!');
            } else {
                message.warning('Payment timed out!');
            }
        } finally {
            setIsProcessing(false);
            setPaymentModalVisible(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4}>Available Products</Title>
                <Button
                    type="primary"
                    icon={<ShoppingCartOutlined />}
                    onClick={() => setDrawerVisible(true)}
                    size="large"
                >
                    Cart ({cart.reduce((acc, i) => acc + i.qty, 0)}) - Rs. {cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Button>
            </div>

            <Row gutter={[16, 16]}>
                {products.map(product => {
                    const cartItem = cart.find(i => i.id === product.id);
                    const currentQty = cartItem ? cartItem.qty : 0;
                    const remainingStock = product.stock - currentQty;

                    return (
                        <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                            <Card
                                hoverable
                                title={product.name}
                                actions={[
                                    <Button
                                        key="add"
                                        type="primary"
                                        disabled={remainingStock <= 0}
                                        onClick={() => addToCart(product)}
                                    >
                                        {remainingStock > 0 ? 'Add to Cart' : 'Out of Stock'}
                                    </Button>
                                ]}
                            >
                                <p>Price: Rs. {product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                <p>Available: {remainingStock}</p>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            <Drawer
                title="Active Cart"
                placement="right"
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
                width={400}
                footer={
                    <div style={{ padding: 16, textAlign: 'right' }}>
                        <Title level={4}>Total: Rs. {cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Title>
                        <Button
                            type="primary"
                            size="large"
                            disabled={cart.length === 0}
                            onClick={handleInitiate}
                            style={{ width: '100%' }}
                        >
                            Checkout Now
                        </Button>
                    </div>
                }
            >
                <List
                    itemLayout="horizontal"
                    dataSource={cart}
                    renderItem={item => (
                        <List.Item
                            actions={[
                                <Button key="minus" size="small" icon={<MinusOutlined />} onClick={() => updateCartQty(item.id, item.qty - 1)} />,
                                <Text key="qty">{item.qty}</Text>,
                                <Button key="plus" size="small" icon={<PlusOutlined />} onClick={() => updateCartQty(item.id, item.qty + 1)} disabled={products.find(p => p.id === item.id)?.stock <= item.qty} />,
                                <Button key="del" size="small" danger icon={<DeleteOutlined />} onClick={() => removeFromCart(item.id)} />
                            ]}
                        >
                            <List.Item.Meta
                                title={item.name}
                                description={`Rs. ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })} each`}
                            />
                        </List.Item>
                    )}
                />
            </Drawer>

            <Modal
                title="Mock Payment Gateway"
                open={paymentModalVisible}
                closable={!isProcessing}
                maskClosable={!isProcessing}
                onCancel={() => !isProcessing && setPaymentModalVisible(false)}
                footer={null}
            >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    {isProcessing ? (
                        <Space direction="vertical" align="center">
                            <Spin size="large" />
                            <Typography.Text>Processing your payment...</Typography.Text>
                        </Space>
                    ) : (
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button type="primary" block onClick={() => handleCheckout('success')}>
                                Simulate Success
                            </Button>
                            <Button danger block onClick={() => handleCheckout('failure')}>
                                Simulate Failure
                            </Button>
                            <Button dashed block onClick={() => handleCheckout('timeout')}>
                                Simulate Timeout
                            </Button>
                        </Space>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default POS;
