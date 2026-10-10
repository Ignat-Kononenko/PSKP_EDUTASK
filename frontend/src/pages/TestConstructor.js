import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd';
import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LatexRenderer from '../components/LatexRenderer';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const { Title, Text } = Typography;

const TestConstructor = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const navigate = useNavigate();
  const { testId } = useParams();
  const isEditMode = Boolean(testId);

  const [form] = Form.useForm();

  const [tempFilters, setTempFilters] = useState({
    search: '',
    visibility: 'all',
    topic: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    visibility: 'all',
    topic: '',
  });

  useEffect(() => {
    const loadTopics = async () => {
      setLoadingTopics(true);
      try {
        const res = await api.get('/topics');

        const flatten = (nodes, prefix = '') => {
          let result = [];
          nodes.forEach(node => {
            const label = prefix ? `${prefix} / ${node.title}` : node.title;
            result.push({ id: node.id, title: label });
            if (node.subtopics?.length) {
              result = result.concat(flatten(node.subtopics, label));
            }
          });
          return result;
        };
        setTopics(flatten(res.data || []));
      } catch (err) {
        console.error('Ошибка загрузки тем', err);
      } finally {
        setLoadingTopics(false);
      }
    };
    loadTopics();
  }, []);

  const fetchTasks = async (filters) => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.visibility !== 'all') params.visibility = filters.visibility;
      if (filters.topic) params.topic_id = filters.topic;
      const res = await api.get('/teacher/available-tasks', { params });
      setTasks(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки задач', err);
      message.error('Не удалось загрузить список задач');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadTestData = async () => {
      if (!isEditMode) return;
      try {
        const testRes = await api.get(`/tests/${testId}`);
        if (testRes?.data) {
          const payload = testRes.data;
          const taskIds = (payload.tasks || []).map(task => task.id);
          setSelectedTasks(taskIds);
          const fallbackScore = taskIds.length || 1;
          const basePassing = payload.passing_score ?? fallbackScore;
          const safeBase = Number(basePassing) > 0 ? Number(basePassing) : fallbackScore;
          const normalizedPassing = Math.min(safeBase, fallbackScore);
          form.setFieldsValue({
            title: payload.title,
            time_limit: payload.time_limit,
            passing_score: normalizedPassing,
          });
        }
      } catch (err) {
        message.error('Не удалось загрузить данные теста');
      }
    };
    loadTestData();
  }, [isEditMode, testId, form]);

  useEffect(() => {
    fetchTasks(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    if (!isEditMode) {
      form.setFieldsValue({
        title: '',
        time_limit: 30,
        passing_score: 1,
      });
      setSelectedTasks([]);
    }
  }, [isEditMode, form]);

  const normalizeSelectedTaskIds = () => {
    const normalized = Array.from(new Set(
      selectedTasks
        .map(value => Number(value))
        .filter(id => Number.isInteger(id) && id > 0)
    ));
    return normalized;
  };

  const handleSubmit = async (values) => {
    const normalizedTaskIds = normalizeSelectedTaskIds();

    if (normalizedTaskIds.length < 5) {
      message.warning('Для теста нужно выбрать минимум 5 уникальных задач');
      return;
    }

    if (values.passing_score > normalizedTaskIds.length) {
      message.error(`Проходной балл не может быть больше количества задач (${normalizedTaskIds.length})`);
      return;
    }

    const payload = {
      title: values.title,
      time_limit: values.time_limit,
      passing_score: values.passing_score,
      task_ids: normalizedTaskIds,
    };

    try {
      if (isEditMode) {
        await api.put(`/tests/${testId}`, payload);
        message.success('Тест успешно обновлён');
        navigate('/teacher/tests');
      } else {
        await api.post('/tests', payload);
        message.success('Тест успешно создан!');
        form.resetFields();
        setSelectedTasks([]);

        setAppliedFilters({ search: '', visibility: 'all', topic: '' });
        setTempFilters({ search: '', visibility: 'all', topic: '' });
      }
    } catch (err) {
      console.error('Ошибка сохранения теста', err);
      message.error(err.response?.data?.message || 'Ошибка при сохранении теста');
    }
  };

  const handleSearchChange = (e) => {
    setTempFilters({ ...tempFilters, search: e.target.value });
  };
  const handleVisibilityChange = (value) => {
    setTempFilters({ ...tempFilters, visibility: value });
  };
  const handleTopicChange = (value) => {
    setTempFilters({ ...tempFilters, topic: value || '' });
  };
  const handleApplyFilters = () => {
    setAppliedFilters({ ...tempFilters });

  };


  const taskColumns = [
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Условие (превью)',
      dataIndex: 'content',
      key: 'content',
      render: (content) => (
        <div style={{ color: '#576b75', fontSize: '13px' }}>
          <LatexRenderer text={`${content?.substring(0, 80) || ''}${content?.length > 80 ? '...' : ''}`} inline />
        </div>
      ),
    },
    {
      title: 'Тип / Автор',
      key: 'tags',
      align: 'right',
      render: (_, record) => {
        const isOwn = record.author_id === user?.id;
        return (
          <Space direction="vertical" size="small" style={{ display: 'flex', alignItems: 'flex-end' }}>
            {record.is_public ? <Tag color="success">Публичная</Tag> : <Tag color="error">Приватная</Tag>}
            <Tag color={isOwn ? 'blue' : 'default'}>
              {isOwn ? 'Моя задача' : (record.author?.full_name || 'Система')}
            </Tag>
          </Space>
        );
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedTasks,
    onChange: (newSelectedRowKeys) => {
      setSelectedTasks(newSelectedRowKeys);
      const currentPassingScore = form.getFieldValue('passing_score');
      if (currentPassingScore > newSelectedRowKeys.length) {
        form.setFieldsValue({ passing_score: Math.max(1, newSelectedRowKeys.length) });
      }
    },
  };

  return (
    <div className="page-container" style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          {isEditMode ? 'Редактирование теста' : 'Конструктор тестов'}
        </Title>
        {isEditMode && (
          <Button onClick={() => navigate('/teacher/tests')}>К списку тестов</Button>
        )}
      </div>

      <Card size="small" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Input
              placeholder="Поиск по названию"
              value={tempFilters.search}
              onChange={handleSearchChange}
              allowClear
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              style={{ width: '100%' }}
              value={tempFilters.visibility}
              onChange={handleVisibilityChange}
              options={[
                { value: 'all', label: 'Все задачи' },
                { value: 'public', label: 'Только публичные' },
                { value: 'private', label: 'Только приватные' },
              ]}
            />
          </Col>
          <Col xs={24} md={7}>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="Все темы"
              value={tempFilters.topic || null}
              onChange={handleTopicChange}
              allowClear
              loading={loadingTopics}
              options={topics.map(t => ({ value: t.id, label: t.title }))}
              filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
            />
          </Col>
          <Col xs={12} md={3}>
            <Button type="primary" onClick={handleApplyFilters} style={{ width: '100%' }}>
              Применить
            </Button>
          </Col>
        
        </Row>
        {appliedFilters.search && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Поиск: "{appliedFilters.search}"</Text>
          </div>
        )}
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card title="Настройки теста" style={{ position: 'sticky', top: 80 }}>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item name="title" label="Название теста" rules={[{ required: true }]}>
                <Input placeholder="Например: Итоговый тест по уравнениям" />
              </Form.Item>
              <Form.Item name="time_limit" label="Лимит времени (в минутах)" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="passing_score"
                label="Проходной балл"
                rules={[{ required: true }]}
                extra={`Выбрано задач: ${normalizeSelectedTaskIds().length} (нужно минимум 5)`}
              >
                <InputNumber
                  min={1}
                  max={Math.max(1, normalizeSelectedTaskIds().length)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Alert
                type={selectedTasks.length > 0 ? 'info' : 'warning'}
                message={`Выбрано задач: ${selectedTasks.length}`}
                style={{ marginBottom: 24 }}
              />
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  disabled={normalizeSelectedTaskIds().length < 5}
                >
                  {isEditMode ? 'Обновить тест' : 'Создать тест'}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title="База доступных задач" bodyStyle={{ padding: 0 }}>
            <Table
              rowSelection={rowSelection}
              columns={taskColumns}
              dataSource={tasks}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              size="middle"
              locale={{ emptyText: 'Нет доступных задач. Создайте задачи в разделе "Управление задачами".' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TestConstructor;