import { Button, Space, Typography } from 'antd';
import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const { Title, Text } = Typography;

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  const formatName = (name) => {
    if (!name) return '';
    return name.length > 15 ? name.substring(0, 15) + '...' : name;
  };

  return (
    <nav 
      className="navbar" 
      style={{ 
        padding: '0 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: 'var(--bg-color)',
        borderBottom: '1px solid var(--border-color)',
        height: 'var(--navbar-height)'
      }}
    >

      <div className="logo">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Title level={4} style={{ margin: 0, color: 'var(--primary-color)' }}>
            EduTask
          </Title>
        </Link>
      </div>
      
      <div className="user-info">
        {user ? (
          <Space size="large" align="center">
            <Text strong style={{ color: 'var(--text-color)' }}>
              {formatName(user.full_name)}
            </Text>

            <Button 
              type="text" 
              danger 
              onClick={logout}
            >
              Выйти
            </Button>
          </Space>
        ) : (
          <Space size="middle">
            <Link to="/login">

              <Button type="text" style={{ fontWeight: 500 }}>
                Войти
              </Button>
            </Link>
            <Link to="/register">

              <Button type="primary">
                Регистрация
              </Button>
            </Link>
          </Space>
        )}
      </div>
    </nav>
  );
};

export default Navbar;