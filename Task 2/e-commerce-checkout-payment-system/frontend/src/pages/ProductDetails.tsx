import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Typography, Button, Spin, Tag, InputNumber } from 'antd';
import { ShoppingCartOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import { ProductType, useAppStore } from '../store';

const { Title, Text, Paragraph } = Typography;

const ProductDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [product, setProduct] = useState<ProductType | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);

    const addToCart = useAppStore(state => state.addToCart);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await axios.get(`${(import.meta as any).env.VITE_API_URL || ((import.meta as any).env.PROD ? '/api' : 'http://localhost:3000/api')}/products`);
                const found = res.data.find((p: ProductType) => p._id === id);
                setProduct(found);
            } catch (error) {
                console.error("Error fetching product details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    if (loading) return <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" /></div>;
    if (!product) return <div style={{ textAlign: 'center', padding: '100px 0' }}><Title level={3}>Product not found</Title></div>;

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
                Back to Store
            </Button>

            <Row gutter={[40, 24]}>
                <Col xs={24} md={12}>
                    <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                        <img src={product.imageUrl} alt={product.name} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
                    </div>
                </Col>
                <Col xs={24} md={12}>
                    <Tag color="blue" style={{ marginBottom: 12, padding: '4px 10px', fontSize: '14px' }}>{product.category}</Tag>
                    <Title level={2} style={{ marginTop: 0 }}>{product.name}</Title>
                    <Title level={1} style={{ color: '#1890ff', marginTop: 10 }}>${product.price.toFixed(2)}</Title>

                    <div style={{ margin: '24px 0', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
                        <Text strong>Availability: </Text>
                        {product.stock > 0 ? (
                            <Text type="success">{product.stock} in stock</Text>
                        ) : (
                            <Text type="danger">Out of stock</Text>
                        )}
                    </div>

                    <Paragraph style={{ fontSize: '16px', lineHeight: '1.6', color: '#666' }}>
                        Experience premium quality with our {product.name}. Designed for exceptional comfort and durability, ensuring you get the best value. This is a generic description as the backend model only contains basic product info.
                    </Paragraph>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '30px' }}>
                        <InputNumber
                            min={1}
                            max={product.stock}
                            value={quantity}
                            onChange={val => setQuantity(val || 1)}
                            size="large"
                            disabled={product.stock === 0}
                        />
                        <Button
                            type="primary"
                            size="large"
                            icon={<ShoppingCartOutlined />}
                            disabled={product.stock === 0}
                            onClick={() => addToCart(product, quantity)}
                            style={{ padding: '0 40px', height: '40px', borderRadius: '20px' }}
                        >
                            Add to Cart
                        </Button>
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default ProductDetails;
