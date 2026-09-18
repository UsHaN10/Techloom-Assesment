import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

export default function Login() {
    const { login } = useStore();
    const navigate = useNavigate();

    const onFinish = async (values) => {
        try {
            const user = await login(values.email, values.password);
            message.success(`Welcome back, ${user.name}`);

            if (user.role === 'ADMIN') navigate('/admin/dashboard');
            else if (user.role === 'CASHIER') navigate('/pos');
            else navigate('/dashboard');
        } catch (error) {
            message.error(error.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%' }}>
            <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>PayCart POS Login</Title>
                <Form name="login" onFinish={onFinish} layout="vertical">
                    <Form.Item
                        name="email"
                        rules={[{ required: true, message: 'Please input your Email!' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Please input your Password!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" size="large" block>
                            Log in
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
