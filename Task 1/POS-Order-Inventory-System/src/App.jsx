import { Layout, Typography, ConfigProvider, theme, Button, Tabs } from 'antd';
import { StoreProvider, useStore } from './store';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Inventory from './components/Inventory';
import POS from './components/POS';
import Orders from './components/Orders';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import UserManagement from './components/UserManagement';

const { Header, Content } = Layout;
const { Title } = Typography;

function MainHeader() {
  const { currentUser, logout } = useStore();
  const navigate = useNavigate();

  return (
    <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(15px)', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '0 24px', position: 'sticky', top: 0, zIndex: 1000 }}>
      <Title level={3} style={{ margin: 0, color: '#333', fontWeight: 700, letterSpacing: '-0.5px' }}>
        PayCart POS
      </Title>
      {currentUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Typography.Text strong>{currentUser.name} ({currentUser.role})</Typography.Text>
          <Button onClick={() => { logout(); navigate('/login'); }} danger>Logout</Button>
        </div>
      )}
    </Header>
  );
}

function AdminDashboard() {
  const items = [
    { key: 'users', label: 'User Management', children: <UserManagement /> },
    { key: 'pos', label: 'POS Terminal', children: <POS /> },
    { key: 'inventory', label: 'Inventory Dashboard', children: <Inventory /> },
    { key: 'orders', label: 'Orders Lifecycle', children: <Orders /> }
  ];
  return (
    <>
      <MainHeader />
      <Content style={{ padding: '24px', background: 'transparent', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <Tabs defaultActiveKey="users" items={items} />
      </Content>
    </>
  );
}

function CashierPOS() {
  const items = [
    { key: 'pos', label: 'POS Terminal', children: <POS /> }
  ];
  return (
    <>
      <MainHeader />
      <Content style={{ padding: '24px', background: 'transparent', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <Tabs defaultActiveKey="pos" items={items} />
      </Content>
    </>
  );
}

function StaffDashboard() {
  const items = [
    { key: 'inventory', label: 'Inventory Dashboard', children: <Inventory /> },
    { key: 'orders', label: 'Orders Lifecycle', children: <Orders /> }
  ];
  return (
    <>
      <MainHeader />
      <Content style={{ padding: '24px', background: 'transparent', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <Tabs defaultActiveKey="inventory" items={items} />
      </Content>
    </>
  );
}

function FallbackRouter() {
  const { isAuthenticated, currentUser } = useStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (currentUser.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (currentUser.role === 'CASHIER') return <Navigate to="/pos" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#899252',
          colorInfo: '#222222',
          colorBgBase: 'transparent',
          colorBgContainer: 'rgba(255, 255, 255, 0.7)',
          colorBgElevated: 'rgba(255, 255, 255, 0.85)',
          colorTextBase: '#1c1c1c',
          wireframe: false,
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
        },
        components: {
          Card: { colorBgContainer: 'rgba(255, 255, 255, 0.75)' },
          Table: { colorBgContainer: 'rgba(255, 255, 255, 0.75)', headerBg: 'rgba(240, 242, 235, 0.9)' }
        }
      }}
    >
      <StoreProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </ProtectedRoute>
          } />

          <Route path="/pos/*" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'CASHIER']}>
              <CashierPOS />
            </ProtectedRoute>
          } />

          <Route path="/dashboard/*" element={
            <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
              <StaffDashboard />
            </ProtectedRoute>
          } />

          <Route path="*" element={<FallbackRouter />} />
        </Routes>
      </StoreProvider>
    </ConfigProvider>
  );
}
