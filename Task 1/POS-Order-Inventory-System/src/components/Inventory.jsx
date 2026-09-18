import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useStore } from '../store';

const Inventory = () => {
    const { products, addProduct, updateProduct, deleteProduct } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form] = Form.useForm();

    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id' },
        { title: 'Product Name', dataIndex: 'name', key: 'name' },
        { title: 'Price', dataIndex: 'price', key: 'price', render: (val) => `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
        { title: 'Available Stock', dataIndex: 'stock', key: 'stock' },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    <Popconfirm title="Delete?" onConfirm={() => deleteProduct(record.id)}>
                        <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const openAddModal = () => {
        setEditingItem(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        form.setFieldsValue(item);
        setIsModalOpen(true);
    };

    const handleModalOk = () => {
        form.validateFields().then((values) => {
            if (editingItem) {
                updateProduct(editingItem.id, values);
            } else {
                addProduct(values);
            }
            setIsModalOpen(false);
        });
    };

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
                    Add Product
                </Button>
            </div>
            <Table columns={columns} dataSource={products} rowKey="id" pagination={{ pageSize: 5 }} />

            <Modal
                title={editingItem ? 'Edit Product' : 'Add Product'}
                open={isModalOpen}
                onOk={handleModalOk}
                onCancel={() => setIsModalOpen(false)}
                okText="Save"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="price" label="Price" rules={[{ required: true }]}>
                        <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="stock" label="Stock" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Inventory;
