import { Button, Card, Empty, List, Spin, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const { Title, Text } = Typography;

const StudentTests = () => {
  const [testSessions, setTestSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await api.get('/student/tests');
      const sessions = Array.isArray(res.data) ? res.data : res.data?.sessions ?? [];
      setTestSessions(sessions);
    } catch (err) {
      console.error('Ошибка загрузки тестов', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusTags = (session) => {
    const tags = [];
    
    if (session.status === 'pending') {
      tags.push(<Tag color="processing" key="pending">Назначен</Tag>);
    } else if (session.status === 'in_progress') {
      tags.push(<Tag color="warning" key="in_progress">В процессе</Tag>);
    } else if (session.status === 'completed') {
      tags.push(<Tag color="default" key="completed">Завершён</Tag>);
      
      if (session.is_passed) {
        tags.push(<Tag color="success" key="passed">Сдан</Tag>);
      } else {
        tags.push(<Tag color="error" key="failed">Не сдан</Tag>);
      }
    }
    return tags;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" tip="Загрузка тестов..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: 24 }}>Мои тесты</Title>

      <List
        grid={{ gutter: 24, xs: 1, sm: 1, md: 2, lg: 3, xl: 3 }}
        dataSource={testSessions}
        locale={{ emptyText: <Empty description="У вас пока нет назначенных тестов" /> }}
        renderItem={(session) => (
          <List.Item>
            <Card 
              hoverable 
              style={{ height: '100%' }}
              bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >

              <div style={{ marginBottom: 16 }}>
                <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
                  {session.test?.title}
                </Title>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {renderStatusTags(session)}
                </div>
              </div>

              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 20 }}>
                <Text>
                  <Text type="secondary">Баллы: </Text>
                  <Text strong>{session.score != null ? `${session.score} / ${session.test?.max_score ?? '-'}` : '–'}</Text>
                </Text>
                <Text>
                  <Text type="secondary">Порог сдачи: </Text>
                  <Text strong>{session.test?.passing_score ?? '-'}</Text>
                </Text>
                <Text>
                  <Text type="secondary">Доступен до: </Text>
                  {session.available_until ? new Date(session.available_until).toLocaleString() : '–'}
                </Text>
              </div>

              {session.status === 'pending' && (
                <Button 
                  type="primary" 
                  block 
                  onClick={() => navigate(`/student/test/${session.id}`)}
                >
                  Начать тест
                </Button>
              )}

              {session.status === 'in_progress' && (
                <Button 
                  type="dashed" 
                  block 
                  onClick={() => navigate(`/student/test/${session.id}`)}
                >
                  Вернуться к тесту
                </Button>
              )}
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
};

export default StudentTests;