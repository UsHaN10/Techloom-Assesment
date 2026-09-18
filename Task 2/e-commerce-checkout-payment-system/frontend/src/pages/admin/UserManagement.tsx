import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, Space, Tag, Popconfirm, message, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { userApi } from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [form] = Form.useForm();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await userApi.getUsers();
            setUsers(res.data);
        } catch (err: any) {
            if (err.response?.status === 403) {
                message.error('Forbidden: You do not have permission to view users');
            } else {
                message.error('Failed to load users');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenModal = (user: any = null) => {
        setEditingUser(user);
        if (user) {
            form.setFieldsValue({
                ...user,
                password: '',
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ isActive: true, role: 'STAFF' });
        }
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setEditingUser(null);
        form.resetFields();
    };

    const handleSave = async (values: any) => {
        try {
            if (editingUser) {
                await userApi.updateUser(editingUser._id, values);
                message.success('User updated successfully');
            } else {
                await userApi.createUser(values);
                message.success('User created successfully');
            }
            handleCloseModal();
            fetchUsers();
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Failed to save user');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await userApi.deleteUser(id);
            message.success('User deleted');
            fetchUsers();
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Failed to delete user');
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong><UserOutlined style={{ marginRight: 8 }} />{text}</Text>
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role: string) => (
                <Tag color={role === 'ADMIN' ? 'red' : role === 'CASHIER' ? 'blue' : 'green'}>
                    {role}
                </Tag>
            )
        },
        {
            title: 'Status',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive: boolean) => (
                <Tag color={isActive ? 'success' : 'default'}>
                    {isActive ? 'Active' : 'Inactive'}
                </Tag>
            )
        },
        {
            title: 'Joined Date',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleDateString()
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete this user?"
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />}>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
                <div>
                    <Title level={3} style={{ marginBottom: 0 }}>User Management</Title>
                    <Text type="secondary">Manage POS system users, cashiers, and roles.</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()} style={{ background: '#e545a5', border: 'none' }}>
                    Add User
                </Button>
            </div>

            <Table
                dataSource={users}
                columns={columns}
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                style={{
                    background: 'white',
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}
            />

            <Modal
                title={editingUser ? 'Edit User' : 'Create New User'}
                open={modalVisible}
                onCancel={handleCloseModal}
                onOk={() => form.submit()}
                okText="Save User"
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                        <Input placeholder="Enter full name" />
                    </Form.Item>

                    <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email' }]}>
                        <Input placeholder="Enter email address" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                        rules={[{ required: !editingUser, min: 6 }]}
                    >
                        <Input.Password placeholder="Enter secure password" />
                    </Form.Item>

                    <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                        <Select placeholder="Select Role">
                            <Option value="CASHIER">Cashier</Option>
                            <Option value="STAFF">Staff</Option>
                            <Option value="ADMIN">Administrator</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="isActive" label="Account Status" valuePropName="checked">
                        <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                    </Form.Item>

                </Form>
            </Modal>
        </div>
    );
};

export default UserManagement;
