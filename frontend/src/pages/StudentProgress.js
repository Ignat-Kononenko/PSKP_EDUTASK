import { Alert, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const { Title } = Typography;

const StudentProgress = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get('/student/progress');
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Не удалось загрузить прогресс');
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  if (loading) return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" /></div>;
  if (error) return <Alert message="Ошибка" description={error} type="error" style={{ margin: 24 }} />;

  const summary = data?.summary || {};
  const solvedTasks = data?.solved_tasks || [];
  const testAttempts = data?.test_attempts || [];

  const taskColumns = [
    { title: 'Задача', dataIndex: 'title', key: 'title' },
    { title: 'Попыток', dataIndex: 'attempts', key: 'attempts', align: 'center' },
    { 
      title: 'Дата решения', 
      dataIndex: 'solved_at', 
      key: 'solved_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : '—'
    },
  ];

  const testColumns = [
    { title: 'Тест', dataIndex: 'test_title', key: 'test_title' },
    { 
      title: 'Дата', 
      dataIndex: 'date', 
      key: 'date',
      render: (date) => date ? new Date(date).toLocaleDateString() : '—'
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_, record) => {
        if (record.is_passed) return <Tag color="success">Сдан</Tag>;
        if (record.status === 'completed') return <Tag color="error">Не сдан</Tag>;
        if (record.status === 'closed') return <Tag color="warning">Закрыт</Tag>;
        if (record.status === 'pending') return <Tag color="default">Назначен</Tag>;
        return <Tag color="processing">В процессе</Tag>;
      },
    },
    { 
      title: 'Результат', 
      key: 'score', 
      render: (_, record) => `${record.score} из ${record.max_score} (порог: ${record.passing_score})` 
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: 24 }}>Мой прогресс</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small"><Statistic title="Решено задач" value={summary.solved_tasks} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small"><Statistic title="Попыток" value={summary.attempts} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small"><Statistic title="Точность" value={summary.accuracy_percent || 0} suffix="%" /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small"><Statistic title="Сдано тестов" value={summary.tests_passed} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small"><Statistic title="Не сдано" value={summary.tests_failed} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small"><Statistic title="Средний балл" value={summary.avg_score_percent || 0} suffix="%" /></Card>
        </Col>
      </Row>

      <Card 
        title="Задачи по темам" 
        style={{ marginBottom: 24 }}
        extra={<Link to="/student/topics">К задачам</Link>}
      >
        <Table 
          columns={taskColumns} 
          dataSource={solvedTasks} 
          rowKey="task_id"
          pagination={{ pageSize: 5 }} 
          size="small"
        />
      </Card>

      <Card 
        title="История тестов"
        extra={<Link to="/student/tests">К тестам</Link>}
      >
        <Table 
          columns={testColumns} 
          dataSource={testAttempts} 
          rowKey="session_id"
          pagination={{ pageSize: 5 }} 
          size="small"
        />
      </Card>
    </div>
  );
};

export default StudentProgress;