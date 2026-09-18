import { Navigate } from 'react-router-dom';
import { useStore } from '../store';
import { Typography, Card } from 'antd';

export default function ProtectedRoute({ children, allowedRoles }) {
    const { isAuthenticated, currentUser } = useStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
        return (
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <Card style={{ width: 500, textAlign: 'center' }}>
                    <Typography.Title level={3} type="danger">403 - Access Denied</Typography.Title>
                    <Typography.Paragraph>
                        You do not have permission to access this page. Expected {allowedRoles.join(' or ')} but got {currentUser.role}.
                    </Typography.Paragraph>
                </Card>
            </div>
        );
    }

    return children;
}
