import { Card, Col, Row, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    CartesianGrid,
    Cell,
    Tooltip as ChartTooltip,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    XAxis,
    YAxis
} from 'recharts';
import api from '../../services/api';

const { Title, Text } = Typography;

const AdminStats = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const [statsRes, analyticsRes, topicsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/analytics'),
        api.get('/admin/topics/tree')
      ]);
      const flattenTopics = (nodes = []) => {
        const map = new Map();
        const walk = (items) => {
          items.forEach((node) => {
            map.set(node.id, node.title);
            if (node.children?.length) walk(node.children);
          });
        };
        walk(nodes);
        return map;
      };
      setStats(statsRes.data);
      setAnalytics({ ...analyticsRes.data, topicLabels: flattenTopics(topicsRes.data || []) });
    } catch (err) {
      message.error('Не удалось загрузить статистику');
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const activityData = useMemo(() => {
    if (!analytics) return [];
    const map = {};
    analytics.registrations?.forEach(({ date, count }) => {
      map[date] = { date, registrations: Number(count), solutions: 0 };
    });
    analytics.solutions?.forEach(({ date, count }) => {
      map[date] = { ...(map[date] || { date, registrations: 0 }), solutions: Number(count) };
    });
    return Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [analytics]);

  const tasksPieData = useMemo(() => {
    if (!analytics) return [];
    return (analytics.tasksPerTopic || []).map((row) => ({
      name: analytics.topicLabels?.get(row.topic_id) || 'Без темы',
      value: Number(row.count) || 0
    }));
  }, [analytics]);

  return (
    <div style={{ paddingBottom: 40 }}>
      {stats ? (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}><Card><Title level={4}>Пользователи</Title><Text style={{ fontSize: 28 }}>{stats.usersCount}</Text></Card></Col>
          <Col span={8}><Card><Title level={4}>Подтемы</Title><Text style={{ fontSize: 28 }}>{stats.topicsCount}</Text></Card></Col>
          <Col span={8}><Card><Title level={4}>Задачи</Title><Text style={{ fontSize: 28 }}>{stats.tasksCount}</Text></Card></Col>
        </Row>
      ) : (
        <Card style={{ marginBottom: 24 }}><Text>Статистика недоступна</Text></Card>
      )}

      <Row gutter={16}>
        <Col span={16}>
          <Card title="Активность (регистрации и решения)">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="registrations" stroke="#b19d2d" name="Регистрации" />
                  <Line type="monotone" dataKey="solutions" stroke="#a5481d" name="Решения" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Задачи по темам">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tasksPieData} dataKey="value" nameKey="name" outerRadius={100} label>
                    {tasksPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#FFBB28', '#FF8042', '#3e73a1', '#326c61',  '#a78bfa', '#e57373'][index % 6]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminStats;
