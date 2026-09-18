import { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm, message, Switch, Row, Col, Statistic } from 'antd';
import { UserAddOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UserOutlined, StopOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useStore } from '../store';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const { currentUser } = useStore();
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${API_URL}/users`);
            setUsers(data);
        } catch {
            message.error('Failed to load users');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const openForm = (user = null) => {
        setEditingUser(user);
        if (user) {
            form.setFieldsValue({ ...user });
        } else {
            form.resetFields();
            form.setFieldsValue({ isActive: true });
        }
        setIsModalVisible(true);
    };

    const openPasswordModal = (user) => {
        setEditingUser(user);
        passwordForm.resetFields();
        setIsPasswordModalVisible(true);
    };

    const handlePasswordReset = async (values) => {
        if (values.password !== values.confirmPassword) {
            return message.error('Passwords do not match');
        }
        try {
            await axios.patch(`${API_URL}/users/${editingUser.id}/password`, { password: values.password });
            message.success('Password updated successfully');
            setIsPasswordModalVisible(false);
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to update password');
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingUser) {
                await axios.put(`${API_URL}/users/${editingUser.id}`, values);
                message.success('User updated successfully');
            } else {
                if (values.password !== values.confirmPassword) {
                    return message.error('Passwords do not match');
                }
                await axios.post(`${API_URL}/users`, values);
                message.success('User created successfully');
            }
            setIsModalVisible(false);
            fetchUsers();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to save user');
        }
    };

    const deleteUser = async (id) => {
        try {
            await axios.delete(`${API_URL}/users/${id}`);
            message.success('User deleted');
            fetchUsers();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const toggleStatus = async (id, isActive) => {
        try {
            await axios.patch(`${API_URL}/users/${id}/status`, { isActive });
            message.success(`User set to ${isActive ? 'Active' : 'Inactive'}`);
            fetchUsers();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to update status');
            fetchUsers(); // revert ui
        }
    };

    const activeCount = users.filter(u => u.isActive).length;
    const inactiveCount = users.filter(u => !u.isActive).length;

    const columns = [
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Tag color={role === 'ADMIN' ? 'red' : role === 'CASHIER' ? 'blue' : 'green'}>
                    {role}
                </Tag>
            )
        },
        {
            title: 'Status',
            key: 'isActive',
            render: (_, record) => (
                <Switch
                    checked={record.isActive}
                    onChange={(checked) => toggleStatus(record.id, checked)}
                    disabled={record.id === currentUser.id && record.role === 'ADMIN'}
                />
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => openForm(record)} />
                    <Button onClick={() => openPasswordModal(record)}>Reset Password</Button>
                    <Popconfirm
                        title="Delete the user"
                        description="Are you sure you want to delete this user?"
                        onConfirm={() => deleteUser(record.id)}
                        disabled={record.id === currentUser.id}
                    >
                        <Button danger icon={<DeleteOutlined />} disabled={record.id === currentUser.id} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card bordered={false}>
                        <Statistic title="Total Users" value={users.length} prefix={<TeamOutlined />} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={false}>
                        <Statistic title="Active Users" value={activeCount} prefix={<UserOutlined />} valueStyle={{ color: '#3f8600' }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={false}>
                        <Statistic title="Inactive Users" value={inactiveCount} prefix={<StopOutlined />} valueStyle={{ color: '#cf1322' }} />
                    </Card>
                </Col>
            </Row>

            <Card
                title="User Management"
                bordered={false}
                extra={<Button type="primary" icon={<UserAddOutlined />} onClick={() => openForm()}>Add User</Button>}
            >
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={editingUser ? "Edit User" : "Add New User"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                        <Select disabled={editingUser && (editingUser.role === 'ADMIN' || currentUser.id === editingUser.id)}>
                            <Select.Option value="CASHIER">CASHIER</Select.Option>
                            <Select.Option value="STAFF">STAFF</Select.Option>
                            {/* Do not allow normal admin creation via frontend unless it's an existing admin being edited */}
                            {editingUser && editingUser.role === 'ADMIN' && (
                                <Select.Option value="ADMIN">ADMIN</Select.Option>
                            )}
                        </Select>
                    </Form.Item>

                    {!editingUser && (
                        <>
                            <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                                <Input.Password />
                            </Form.Item>
                            <Form.Item name="confirmPassword" label="Confirm Password" rules={[{ required: true }]}>
                                <Input.Password />
                            </Form.Item>
                        </>
                    )}

                    <Form.Item name="isActive" label="Account Status" valuePropName="checked">
                        <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            {editingUser ? "Update User" : "Create User"}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`Reset Password for ${editingUser?.name}`}
                open={isPasswordModalVisible}
                onCancel={() => setIsPasswordModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form form={passwordForm} layout="vertical" onFinish={handlePasswordReset}>
                    <Form.Item name="password" label="New Password" rules={[{ required: true }]}>
                        <Input.Password />
                    </Form.Item>
                    <Form.Item name="confirmPassword" label="Confirm New Password" rules={[{ required: true }]}>
                        <Input.Password />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>Reset Password</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
