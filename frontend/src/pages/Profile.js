import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Row,
  Spin,
  Typography,
} from 'antd';
import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { PASSWORD_REQUIREMENTS_TEXT, validateFullName, validatePassword } from '../utils/validators';

const { Title, Text } = Typography;

const Profile = () => {
  const { user, login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const handleUpdateProfile = async (values) => {
    setLoading(true);
    setMessage('');
    setError('');
    if (!validateFullName(values.fullName)) {
      setError('Введите корректное ФИО (минимум 2 слова, только буквы/пробелы/дефисы, 3-50 символов).');
      setLoading(false);
      return;
    }
    try {
      const response = await api.put('/auth/profile', {
        full_name: values.fullName,
      });
      
      login(localStorage.getItem('token'), response.data.user);
      setMessage('Профиль успешно обновлен!');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      setError('Новый пароль и подтверждение не совпадают');
      return;
    }

    if (!validatePassword(values.newPassword)) {
      setError(PASSWORD_REQUIREMENTS_TEXT);
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await api.put('/auth/profile/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setMessage(response.data.message);
      passwordForm.resetFields();
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при смене пароля');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" tip="Загрузка профиля..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="center">
        <Col xs={24} sm={20} md={16} lg={12} xl={10}>
          <Card
            title={
              <Title level={3} style={{ margin: 0 }}>
                Ваш профиль
              </Title>
            }
            bordered={false}
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
          >
            {message && <Alert message={message} type="success" showIcon style={{ marginBottom: 24 }} />}
            {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} />}

            <Descriptions bordered column={1} size="middle" style={{ marginBottom: 32 }}>
              <Descriptions.Item label="Email">
                {user.email}
              </Descriptions.Item>
              
              {user.role === 'TEACHER' && (
                <Descriptions.Item label="Код приглашения">
                  <Text 
                    copyable
                    strong 
                    style={{ backgroundColor: '#f8f9fa', padding: '4px 8px', borderRadius: '4px' }}
                  >
                    {user.invite_code}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Form
              form={form}
              layout="vertical"
              initialValues={{ 
                fullName: user.full_name
              }}
              onFinish={handleUpdateProfile}
            >
              <Form.Item
                label="ФИО"
                name="fullName"
                rules={[{ required: true, message: 'Пожалуйста, введите ваше имя' }]}
              >
                <Input size="large" />
              </Form.Item>

              <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large" 
                  block 
                  loading={loading}
                >
                  Сохранить изменения
                </Button>
              </Form.Item>
            </Form>

            <div style={{ marginTop: 40 }}>
              <Title level={4} style={{ marginBottom: 16 }}>
                Смена пароля
              </Title>
              <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
                <Form.Item
                  label="Текущий пароль"
                  name="currentPassword"
                  rules={[{ required: true, message: 'Введите текущий пароль' }]}
                >
                  <Input.Password size="large"  visibilityToggle={false}/>
                </Form.Item>
                <Form.Item
                  label="Новый пароль"
                  name="newPassword"
                  rules={[{ required: true, message: 'Введите новый пароль' }]}
                  extra={PASSWORD_REQUIREMENTS_TEXT}
                >
                  <Input.Password size="large" visibilityToggle={false}/>
                </Form.Item>
                <Form.Item
                  label="Подтвердите пароль"
                  name="confirmPassword"
                  dependencies={["newPassword"]}
                  rules={[{ required: true, message: 'Повторите новый пароль' }]}
                >
                  <Input.Password size="large" visibilityToggle={false}/>
                </Form.Item>
                <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                  Обновить пароль
                </Button>
              </Form>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;