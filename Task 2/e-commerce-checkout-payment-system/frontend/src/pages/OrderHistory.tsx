import { useState, useEffect } from 'react';
import { Table, Button, Typography, Tag, message, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { confirm } = Modal;

const OrderHistory = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${(import.meta as any).env.VITE_API_URL || ((import.meta as any).env.PROD ? '/api' : 'http://localhost:3000/api')}/orders`);
            setOrders(res.data);
        } catch (error) {
            message.error("Failed to fetch order history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();

        // Auto refresh every 10s to see timeout side-effects
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleCancel = (id: string, currentStatus: string) => {
        confirm({
            title: 'Are you sure you want to cancel this order?',
            icon: <ExclamationCircleOutlined />,
            content: currentStatus === 'Paid' ? 'The payment will be refunded and stock will be returned.' : 'Stock reservation will be released.',
            onOk: async () => {
                try {
                    await axios.post(`${(import.meta as any).env.VITE_API_URL || ((import.meta as any).env.PROD ? '/api' : 'http://localhost:3000/api')}/orders/${id}/cancel`);
                    message.success("Order cancelled securely");
                    fetchOrders();
                } catch (error: any) {
                    message.error(error.response?.data?.error || "Error cancelling order");
                }
            }
        });
    };

    const getStatusTag = (status: string) => {
        switch (status) {
            case 'Paid': return <Tag color="success">Paid</Tag>;
            case 'Reserved': return <Tag color="processing">Reserved (Awaiting Payment)</Tag>;
            case 'Pending': return <Tag color="default">Pending</Tag>;
            case 'Cancelled': return <Tag color="warning">Cancelled (Refunded)</Tag>;
            case 'Expired': return <Tag color="error">Expired</Tag>;
            case 'Failed': return <Tag color="error">Payment Failed</Tag>;
            default: return <Tag>{status}</Tag>;
        }
    };

    const columns = [
        { title: 'Order ID', dataIndex: '_id', key: '_id', render: (id: string) => <Typography.Text copyable>{id}</Typography.Text> },
        { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => new Date(date).toLocaleString() },
        { title: 'Total', dataIndex: 'total', key: 'total', render: (val: number) => `$${val.toFixed(2)}` },
        { title: 'Status', dataIndex: 'status', key: 'status', render: getStatusTag },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: any) => {
                const canCancel = ['Pending', 'Reserved', 'Paid'].includes(record.status);
                return (
                    <Button
                        danger
                        type="primary"
                        onClick={() => handleCancel(record._id, record.status)}
                        disabled={!canCancel}
                        title={canCancel ? "Cancel Order & Refund" : "Cannot cancel in this state"}
                    >
                        Cancel Order
                    </Button>
                );
            }
        }
    ];

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <Title level={2}>Order History</Title>
            <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Table
                    columns={columns}
                    dataSource={orders}
                    rowKey="_id"
                    loading={loading}
                    expandable={{
                        expandedRowRender: record => (
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                {record.items.map((item: any, i: number) => (
                                    <li key={i}>
                                        {item.productId ? item.productId.name : 'Unknown Product'} - {item.quantity} x ${item.price?.toFixed(2)}
                                    </li>
                                ))}
                            </ul>
                        )
                    }}
                />
            </div>
        </div>
    );
};

export default OrderHistory;
