import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import { HomeOutlined, ShoppingCartOutlined, HistoryOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';

import Storefront from './pages/Storefront';
import ProductDetails from './pages/ProductDetails';
import CartCheckout from './pages/CartCheckout';
import OrderHistory from './pages/OrderHistory';
import Login from './pages/Login';
import UserManagement from './pages/admin/UserManagement';
import { useAuthStore } from './store/authStore';

const { Header, Content, Footer } = Layout;

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
};

// Role-Based Protected Route
const RoleProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles: string[] }) => {
    const { isAuthenticated, user } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
    if (user && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;

    return children;
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { user, logout } = useAuthStore();

    return (
        <Layout className="layout" style={{
            minHeight: '100vh',
            backgroundColor: '#e691d1',
            backgroundImage: 'url("/bg.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
        }}>
            <Header style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 1, padding: '0 50px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '20px', marginRight: '40px', color: '#e545a5', letterSpacing: '1px' }}>
                    PayCart POS
                </div>
                <Menu theme="light" mode="horizontal" defaultSelectedKeys={['1']} style={{ flex: 1, borderBottom: 'none' }}>
                    {(user?.role === 'ADMIN' || user?.role === 'CASHIER') && (
                        <>
                            <Menu.Item key="pos" icon={<HomeOutlined />}>
                                <Link to="/pos">POS Terminal</Link>
                            </Menu.Item>
                            <Menu.Item key="checkout" icon={<ShoppingCartOutlined />}>
                                <Link to="/pos/checkout">Cart & Checkout</Link>
                            </Menu.Item>
                        </>
                    )}

                    <Menu.Item key="dashboard" icon={<HistoryOutlined />}>
                        <Link to="/dashboard">My Dashboard</Link>
                    </Menu.Item>

                    {user?.role === 'ADMIN' && (
                        <Menu.Item key="admin" icon={<UserOutlined />}>
                            <Link to="/admin/users">User Management</Link>
                        </Menu.Item>
                    )}
                </Menu>

                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontWeight: 500 }}><UserOutlined /> {user.name} ({user.role})</span>
                        <Button type="default" danger icon={<LogoutOutlined />} onClick={logout}>
                            Logout
                        </Button>
                    </div>
                )}
            </Header>
            <Content style={{ padding: '40px 50px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(12px)',
                    padding: 24,
                    minHeight: 400,
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    border: '1px solid rgba(255,255,255,0.5)'
                }}>
                    {children}
                </div>
            </Content>
            <Footer style={{ textAlign: 'center', color: '#555', backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(5px)' }}>PayCart POS ©2026</Footer>
        </Layout>
    );
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                {/* Protected POS Routes */}
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <Routes>
                                    {/* ADMIN & CASHIER: POS System */}
                                    <Route path="/pos" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'CASHIER']}><Storefront /></RoleProtectedRoute>} />
                                    <Route path="/pos/checkout" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'CASHIER']}><CartCheckout /></RoleProtectedRoute>} />
                                    <Route path="/pos/product/:id" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'CASHIER']}><ProductDetails /></RoleProtectedRoute>} />

                                    {/* EVERYONE: Dashboard */}
                                    <Route path="/dashboard" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'CASHIER', 'STAFF']}><OrderHistory /></RoleProtectedRoute>} />

                                    {/* ADMIN ONLY: Admin Area */}
                                    <Route path="/admin/users" element={<RoleProtectedRoute allowedRoles={['ADMIN']}><UserManagement /></RoleProtectedRoute>} />

                                    {/* Defaults */}
                                    <Route path="/" element={<Navigate to="/pos" replace />} />
                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                </Routes>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
