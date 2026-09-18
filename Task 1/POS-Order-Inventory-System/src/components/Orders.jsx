import { Table, Tag, Button, Popconfirm } from 'antd';
import { useStore } from '../store';

const Orders = () => {
    const { orders, cancelOrder } = useStore();

    const getStatusColor = (status) => {
        switch (status) {
            case 'Paid':
                return 'green';
            case 'Pending':
                return 'gold';
            case 'Reserved':
                return 'blue';
            case 'Cancelled':
                return 'default';
            case 'Expired':
                return 'warning';
            case 'Failed':
                return 'red';
            default:
                return 'default';
        }
    };

    const columns = [
        { title: 'Order ID', dataIndex: 'id', key: 'id' },
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (text) => new Date(text).toLocaleString()
        },
        {
            title: 'Items',
            dataIndex: 'items',
            key: 'items',
            render: (items) => (
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                    {items.map((item, index) => (
                        <li key={index}>
                            {item.name} (x{item.qty})
                        </li>
                    ))}
                </ul>
            )
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            render: (val) => `Rs. ${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {status.toUpperCase()}
                </Tag>
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Popconfirm
                    title="Are you sure you want to cancel this order?"
                    onConfirm={() => cancelOrder(record.id)}
                    okText="Yes, Cancel"
                    cancelText="No"
                    disabled={record.status === 'Cancelled' || record.status === 'Failed' || record.status === 'Expired'}
                >
                    <Button
                        danger
                        disabled={record.status === 'Cancelled' || record.status === 'Failed' || record.status === 'Expired'}
                    >
                        Cancel Order
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div>
            <Table
                columns={columns}
                dataSource={orders}
                rowKey="id"
                pagination={{ pageSize: 10 }}
            />
        </div>
    );
};

export default Orders;
