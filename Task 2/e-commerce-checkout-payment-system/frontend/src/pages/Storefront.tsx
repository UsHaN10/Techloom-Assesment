import { useState, useEffect } from 'react';
import { Input, Slider, Card, Row, Col, Typography, Spin, Badge, Button, Select } from 'antd';
import { SearchOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ProductType, useAppStore } from '../store';

const { Title, Text } = Typography;
const { Option } = Select;

const Storefront = () => {
    const [products, setProducts] = useState<ProductType[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 200]);
    const [category, setCategory] = useState<string>('All');

    const addToCart = useAppStore(state => state.addToCart);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await axios.get(`${(import.meta as any).env.VITE_API_URL || ((import.meta as any).env.PROD ? '/api' : 'http://localhost:3000/api')}/products`);
                setProducts(res.data);
            } catch (error) {
                console.error("Error fetching products", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

    const filteredProducts = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
        const matchCategory = category === 'All' || p.category === category;
        return matchSearch && matchPrice && matchCategory;
    });

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .product-card { transition: all 0.3s ease; border-radius: 12px; overflow: hidden; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .product-card:hover { transform: translateY(-5px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        .product-image { height: 200px; object-fit: cover; width: 100%; transition: transform 0.5s ease; }
        .product-card:hover .product-image { transform: scale(1.05); }
      `}</style>

            <div style={{ marginBottom: 30, display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#fafafa', padding: '20px', borderRadius: '12px' }}>
                <Input.Search
                    placeholder="Search products..."
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: 250 }}
                    size="large"
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <Text strong>Category:</Text>
                    <Select defaultValue="All" style={{ width: 150 }} size="large" onChange={setCategory}>
                        {categories.map(c => (
                            <Option key={c} value={c}>{c}</Option>
                        ))}
                    </Select>
                </div>

                <div style={{ flex: 1, minWidth: '250px' }}>
                    <Text strong style={{ display: 'block', marginBottom: '5px' }}>Price Range (${priceRange[0]} - ${priceRange[1]})</Text>
                    <Slider
                        range
                        defaultValue={[0, 200]}
                        max={500}
                        onChange={(val) => setPriceRange(val as [number, number])}
                        tooltip={{ formatter: val => `$${val}` }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px 0' }}><Spin size="large" /></div>
            ) : (
                <Row gutter={[24, 24]}>
                    {filteredProducts.map(product => (
                        <Col xs={24} sm={12} md={8} lg={6} key={product._id}>
                            <Badge.Ribbon text={product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'} color={product.stock > 0 ? "green" : "red"}>
                                <Card
                                    className="product-card"
                                    cover={<img alt={product.name} src={product.imageUrl} className="product-image" />}
                                    actions={[
                                        <Button
                                            type="primary"
                                            shape="round"
                                            icon={<ShoppingCartOutlined />}
                                            disabled={product.stock === 0}
                                            onClick={(e) => { e.preventDefault(); addToCart(product); }}
                                        >
                                            Add To Cart
                                        </Button>
                                    ]}
                                >
                                    <Link to={`/product/${product._id}`}>
                                        <Card.Meta
                                            title={<span style={{ fontSize: '16px', fontWeight: '600' }}>{product.name}</span>}
                                            description={
                                                <div>
                                                    <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>{product.category}</Text>
                                                    <Title level={4} style={{ margin: 0, color: '#1890ff' }}>${product.price.toFixed(2)}</Title>
                                                </div>
                                            }
                                        />
                                    </Link>
                                </Card>
                            </Badge.Ribbon>
                        </Col>
                    ))
                    }
                    {
                        filteredProducts.length === 0 && (
                            <div style={{ width: '100%', textAlign: 'center', padding: '50px 0', color: '#888' }}>
                                <Title level={4} type="secondary">No products found.</Title>
                            </div>
                        )
                    }
                </Row >
            )}
        </div >
    );
};

export default Storefront;
