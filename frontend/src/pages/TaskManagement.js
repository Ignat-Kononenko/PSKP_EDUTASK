import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  List,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Upload
} from 'antd';
import { useCallback, useContext, useEffect, useState } from 'react';
import LatexRenderer from '../components/LatexRenderer';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const flattenTopics = (nodes = [], prefix = '', parentId = null) => {
  const result = [];
  nodes.forEach((topic) => {
    const label = prefix ? `${prefix} / ${topic.title}` : topic.title;
    result.push({ id: topic.id, title: label, subject: topic.subject, isRoot: parentId === null });
    if (topic.subtopics?.length) {
      result.push(...flattenTopics(topic.subtopics, label, topic.id));
    }
  });
  return result;
};

const TaskManagement = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(null);

  const [previewData, setPreviewData] = useState({ content: '', hint: '', solution: '', answer: '', image_data: '' });
  const [form] = Form.useForm();

  // Временные фильтры (то, что выбрал пользователь, но ещё не применил)
  const [tempFilters, setTempFilters] = useState({
    search: '',
    visibility: 'all',
    topic: '',
  });
  // Применённые фильтры (то, по которым реально загружены задачи)
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    visibility: 'all',
    topic: '',
  });

  // Загрузка тем
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const res = await api.get('/topics');
        setTopics(flattenTopics(res.data || []));
      } catch (err) {
        console.error('Ошибка загрузки тем', err);
        message.error('Не удалось загрузить темы');
      }
    };
    loadTopics();
  }, []);

  // Загрузка задач с применёнными фильтрами
  const fetchTasks = useCallback(async (filters) => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.visibility !== 'all') params.visibility = filters.visibility;
      if (filters.topic) params.topic_id = filters.topic;
      const res = await api.get('/teacher/available-tasks', { params });
      setTasks(res.data);
    } catch (err) {
      console.error('Ошибка загрузки задач', err);
      message.error('Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  }, []);

  // При изменении appliedFilters (после нажатия "Применить") загружаем задачи
  useEffect(() => {
    fetchTasks(appliedFilters);
  }, [appliedFilters, fetchTasks]);

  // Обработчики изменений временных фильтров
  const handleSearchChange = (e) => {
    setTempFilters({ ...tempFilters, search: e.target.value });
  };
  const handleVisibilityChange = (value) => {
    setTempFilters({ ...tempFilters, visibility: value });
  };
  const handleTopicChange = (value) => {
    setTempFilters({ ...tempFilters, topic: value || '' });
  };

  // Применить фильтры – копируем временные в применённые
  const handleApplyFilters = () => {
    setAppliedFilters({ ...tempFilters });
  };


  const isOwnTask = useCallback((task) => user && task.author_id === user.id, [user]);

  const handleEdit = (task) => {
    if (!isOwnTask(task)) {
      message.warning('Можно редактировать только свои задачи');
      return;
    }
    setEditingTask(task.id);
    form.setFieldsValue({
      title: task.title,
      content: task.content,
      answer: task.answer,
      hint: task.hint || '',
      solution: task.solution || '',
      topic_id: task.topic_id || '',
      is_public: task.is_public ? 'public' : 'private',
    });
    setPreviewData({
      content: task.content,
      hint: task.hint || '',
      solution: task.solution || '',
      answer: task.answer || '',
      image_data: task.image_data || '',
    });
  };

  const handleImageChange = (info) => {
    const file = info.file;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewData((prev) => ({ ...prev, image_data: reader.result }));
      };
      reader.readAsDataURL(file);
    }
    return false;
  };

  const removeImage = () => {
    setPreviewData((prev) => ({ ...prev, image_data: '' }));
  };

  const handleDelete = async (id, task) => {
    if (!isOwnTask(task)) {
      message.warning('Можно удалять только свои задачи');
      return;
    }
    try {
      await api.delete(`/tasks/${id}`);
      message.success('Задача удалена');

      fetchTasks(appliedFilters);
    } catch (err) {
      message.error(err.response?.data?.message || 'Ошибка при удалении');
    }
  };

  const handleSubmit = async (values) => {
    const payload = {
      ...values,
      topic_id: Number(values.topic_id),
      is_public: values.is_public === 'public',
      image_data: previewData.image_data,
    };
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask}`, payload);
        message.success('Задача успешно обновлена');
      } else {
        await api.post('/tasks', payload);
        message.success('Новая задача создана');
      }
      handleCancel();
      fetchTasks(appliedFilters);
    } catch (err) {
      message.error(err.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const handleCancel = () => {
    setEditingTask(null);
    form.resetFields();
    setPreviewData({ content: '', hint: '', solution: '', answer: '', image_data: '' });
  };

  const onValuesChange = (changedValues, allValues) => {
    setPreviewData((prev) => ({
      ...prev,
      content: allValues.content || '',
      hint: allValues.hint || '',
      solution: allValues.solution || '',
      answer: allValues.answer || ''
    }));
  };

  const renderPreviewBox = (label, text) => (
    <div style={{ marginTop: 8, padding: 12, borderRadius: 6, backgroundColor: '#f8f9fa', border: '1px dashed #d9d9d9' }}>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Превью: {label}</div>
      {text ? <LatexRenderer text={text} /> : <Text type="secondary">Введите текст...</Text>}
    </div>
  );

  if (loading && !tasks.length) return <div style={{ padding: 100, textAlign: 'center' }}><Spin size="large" /></div>;

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: 24 }}>Управление задачами</Title>

      <Card bodyStyle={{ padding: '16px 24px' }} style={{ marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
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
              options={topics.map((t) => ({ value: t.id, label: t.title }))}
              filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
            />
          </Col>
          <Col xs={12} md={3}>
            <Button type="primary" onClick={handleApplyFilters} style={{ width: '100%' }}>
              Применить
            </Button>
          </Col>
          
        </Row>
        {/* Можно добавить индикатор активных фильтров, если нужно */}
        {appliedFilters.search && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Поиск: "{appliedFilters.search}"</Text>
          </div>
        )}
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={10} xl={8}>
          <Card 
            title={editingTask ? 'Редактирование задачи' : 'Новая задача'} 
            style={{ position: 'sticky', top: 80, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              onValuesChange={onValuesChange}
              initialValues={{ is_public: 'public' }}
            >
              <Form.Item name="title" label="Название" rules={[{ required: true, message: 'Обязательное поле' }]}>
                <Input placeholder="Например: Уравнение с параметром" />
              </Form.Item>
              <Form.Item name="content" label="Условие" rules={[{ required: true, message: 'Обязательное поле' }]}>
                <TextArea rows={4} placeholder="Используйте $$ для формул" />
              </Form.Item>
              {renderPreviewBox('Условие', previewData.content)}
              <Form.Item name="answer" label="Правильный ответ" rules={[{ required: true, message: 'Обязательное поле' }]} style={{ marginTop: 16 }}>
                <Input placeholder="Точный ответ (число или формула)" />
              </Form.Item>
              {renderPreviewBox('Ответ', previewData.answer)}
              <Form.Item name="hint" label="Подсказка">
                <TextArea rows={2} placeholder="Поможет ученику, если он застрял" />
              </Form.Item>
              {renderPreviewBox('Подсказка', previewData.hint)}
              <Form.Item name="solution" label="Полное решение" style={{ marginTop: 16 }}>
                <TextArea rows={4} placeholder="Шаги решения" />
              </Form.Item>
              {renderPreviewBox('Решение', previewData.solution)}
              <Form.Item label="Изображение (необязательно)" style={{ marginTop: 16 }}>
                <Upload beforeUpload={() => false} onChange={handleImageChange} showUploadList={false} accept="image/*">
                  <Button>Выбрать файл</Button>
                </Upload>
                {previewData.image_data && (
                  <div style={{ marginTop: 12 }}>
                    <img src={previewData.image_data} alt="preview" style={{ maxWidth: '100%', borderRadius: 6, border: '1px solid #d9d9d9' }} />
                    <Button type="link" danger size="small" onClick={removeImage} style={{ padding: 0, marginTop: 4 }}>
                      Удалить фото
                    </Button>
                  </div>
                )}
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="topic_id" label="Тема" rules={[{ required: true, message: 'Выберите тему' }]}>
                    <Select
                      options={topics.map((t) => ({ value: t.id, label: t.title, disabled: t.isRoot }))}
                      placeholder="Выбрать..."
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="is_public" label="Видимость">
                    <Select>
                      <Select.Option value="public">Публичная</Select.Option>
                      <Select.Option value="private">Приватная</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
                <Space>
                  <Button type="primary" htmlType="submit">
                    {editingTask ? 'Сохранить изменения' : 'Создать задачу'}
                  </Button>
                  {editingTask && <Button onClick={handleCancel}>Отмена</Button>}
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={14} xl={16}>
          <Card 
            title={`Мои задачи (${tasks.length})`}
            style={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            bodyStyle={{ padding: 0 }}
          >
            <List
              dataSource={tasks}
              style={{ maxHeight: '800px', overflowY: 'auto' }}
              locale={{ emptyText: <Empty description="У вас пока нет созданных задач" style={{ padding: 40 }} /> }}
              renderItem={(task) => (
                <List.Item style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <Title level={5} style={{ margin: 0 }}>{task.title}</Title>
                      <Text type="secondary" style={{ fontSize: 13 }}>{task.topic?.title || 'Без темы'}</Text>
                    </div>
                    <Space>
                      {task.is_public ? <Tag color="success">Публичная</Tag> : <Tag color="default">Приватная</Tag>}
                      <Tag color="blue">Моя</Tag>
                    </Space>
                  </div>
                  <div style={{ backgroundColor: '#fafafa', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                    <LatexRenderer text={`${task.content.substring(0, 150)}${task.content.length > 150 ? '...' : ''}`} inline />
                  </div>
                  <Space wrap>
                    <Button size="small" onClick={() => handleEdit(task)}>Редактировать</Button>
          
                    <Button
                          size="small"
                          danger
                          onClick={() => {
                            Modal.confirm({
                              title: 'Подтверждение удаления',
                              content: 'Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.',
                              okText: 'Да, удалить',
                              cancelText: 'Отмена',
                              onOk: () => handleDelete(task.id, task),
                              okButtonProps: { danger: true },
                            });
                          }}
                        >
                          Удалить
                        </Button>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TaskManagement;