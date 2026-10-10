import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import LatexRenderer from '../../components/LatexRenderer';
import api from '../../services/api';

const { Text } = Typography;

const initialFilters = { topic_id: undefined, author_id: undefined, visibility: 'all', search: '' };

const AdminTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [flatTopics, setFlatTopics] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskEditingId, setTaskEditingId] = useState(null);
  const [taskForm] = Form.useForm();
  const [filters, setFilters] = useState(initialFilters);
  const [taskQuery, setTaskQuery] = useState(initialFilters);
  const [imagePreview, setImagePreview] = useState(null);
  const [formPreview, setFormPreview] = useState({ content: '', answer: '', hint: '', solution: '' });

  const handleTaskFormChange = (_, allValues) => {
    setFormPreview({
      content: allValues.content || '',
      answer: allValues.answer || '',
      hint: allValues.hint || '',
      solution: allValues.solution || ''
    });
  };

  const renderPreviewBox = (label, value) => (
    <div style={{ marginTop: 8, padding: 12, borderRadius: 6, background: '#f8f9fa', border: '1px dashed #d9d9d9' }}>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Превью: {label}</div>
      {value?.trim() ? <LatexRenderer text={value} /> : <Text type="secondary">Введите текст...</Text>}
    </div>
  );

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const loadMeta = useCallback(async () => {
    try {
      const [topicsRes, usersRes] = await Promise.all([
        api.get('/topics'),
        api.get('/admin/users')
      ]);
      const flatten = (nodes = [], prefix = '', parentId = null) => {
        const result = [];
        nodes.forEach((node) => {
          const label = prefix ? `${prefix} / ${node.title}` : node.title;
          result.push({ id: node.id, title: label, isRoot: parentId === null });
          if (node.subtopics?.length) {
            result.push(...flatten(node.subtopics, label, node.id));
          }
        });
        return result;
      };
      setFlatTopics(flatten(topicsRes.data || []));
      setTeachers((usersRes.data || []).filter((u) => u.role === 'TEACHER'));
    } catch (err) {
      message.error('Не удалось загрузить справочники');
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const fetchTasks = useCallback(async (query) => {
    setLoadingTasks(true);
    try {
      const res = await api.get('/admin/tasks', { params: query });
      setTasks(res.data || []);
    } catch (err) {
      message.error('Не удалось загрузить задачи');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks(taskQuery);
  }, [fetchTasks, taskQuery]);

  const openTaskModal = (task = null) => {
    setTaskEditingId(task?.id || null);
    if (task) {
      taskForm.setFieldsValue({
        title: task.title,
        content: task.content,
        answer: task.answer,
        hint: task.hint,
        solution: task.solution,
        topic_id: task.topic_id,
        author_id: task.author_id || undefined,
        is_public: task.is_public ? 'public' : 'private',
        image_data: task.image_data || null
      });
      setFormPreview({
        content: task.content || '',
        answer: task.answer || '',
        hint: task.hint || '',
        solution: task.solution || ''
      });
    } else {
      taskForm.resetFields();
      taskForm.setFieldsValue({ is_public: 'public', image_data: null });
      setFormPreview({ content: '', answer: '', hint: '', solution: '' });
    }
    setTaskModalOpen(true);
    setImagePreview(task?.image_data || null);
  };

  const handleImageBeforeUpload = async (file) => {
    try {
      const base64 = await fileToBase64(file);
      taskForm.setFieldsValue({ image_data: base64 });
      setImagePreview(base64);
    } catch (err) {
      message.error('Не удалось прочитать изображение');
    }
    return false;
  };

  const handleImageRemove = () => {
    taskForm.setFieldsValue({ image_data: null });
    setImagePreview(null);
  };

  const handleTaskModalClose = () => {
    setTaskModalOpen(false);
    setTaskEditingId(null);
    setImagePreview(null);
    taskForm.resetFields();
    setFormPreview({ content: '', answer: '', hint: '', solution: '' });
  };

  const handleTaskSubmit = async () => {
    try {
      const values = await taskForm.validateFields();
      const payload = {
        ...values,
        author_id: values.author_id || null,
        is_public: values.is_public === 'public',
        image_data: values.image_data || null
      };
      if (taskEditingId) {
        await api.put(`/tasks/${taskEditingId}`, payload);
        message.success('Задача обновлена');
      } else {
        await api.post('/tasks', payload);
        message.success('Задача создана');
      }
      handleTaskModalClose();
      fetchTasks(taskQuery);
    } catch (err) {
      message.error(err.response?.data?.message || 'Ошибка сохранения задачи');
    }
  };

  const handleCloneTask = async (task) => {
    try {
      await api.post(`/admin/tasks/${task.id}/clone`, {});
      message.success('Задача клонирована');
      fetchTasks(taskQuery);
    } catch (err) {
      message.error('Не удалось клонировать задачу');
    }
  };

  const handleDeleteTask = async (task) => {
    try {
      await api.delete(`/tasks/${task.id}`);
      message.success('Задача удалена');
      fetchTasks(taskQuery);
    } catch (err) {
      message.error('Не удалось удалить задачу');
    }
  };

  const handleFilterApply = () => {
    setTaskQuery(filters);
  };

  const taskColumns = [
    {
      title: 'Название',
      dataIndex: 'title',
      render: (text, record) => (
        <div>
          <strong>{text}</strong>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            <LatexRenderer text={`${record.content?.substring(0, 80)}...`} />
          </div>
        </div>
      )
    },
    {
      title: 'Тема',
      dataIndex: ['topic', 'title'],
      render: (_, record) => record.topic?.title || '—'
    },
    {
      title: 'Автор',
      dataIndex: ['author', 'full_name'],
      render: (_, record) => record.author?.full_name || '—'
    },
    {
      title: 'Видимость',
      dataIndex: 'is_public',
      render: (value) => (value ? <Tag color="green">Публичная</Tag> : <Tag color="red">Приватная</Tag>)
    },
    {
      title: 'Действия',
      render: (_, record) => (
        <Space>
          <Button onClick={() => openTaskModal(record)}>Изменить</Button>
          <Button onClick={() => handleCloneTask(record)}>Клонировать</Button>
            <Button
              danger
              onClick={() => {
                Modal.confirm({
                  title: 'Подтверждение удаления',
                  content: 'Вы уверены, что хотите удалить эту задачу?',
                  okText: 'Да, удалить',
                  cancelText: 'Отмена',
                  onOk: () => handleDeleteTask(record),
                  okButtonProps: { danger: true },
                });
              }}
            >
            Удалить
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      <Card
        title="Задачи"
        extra={
          <Space>
            <Button type="primary" onClick={() => openTaskModal()}>Добавить задачу</Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="Тема (подраздел)"
            value={filters.topic_id}
            allowClear
            style={{ width: 200 }}
            options={flatTopics.filter((topic) => !topic.isRoot).map((topic) => ({ label: topic.title, value: topic.id }))}
            onChange={(value) => setFilters({ ...filters, topic_id: value })}
          />
          <Select
            placeholder="Автор"
            allowClear
            style={{ width: 200 }}
            value={filters.author_id}
            options={teachers.map((teacher) => ({ label: teacher.full_name, value: teacher.id }))}
            onChange={(value) => setFilters({ ...filters, author_id: value })}
          />
          <Select
            value={filters.visibility}
            onChange={(value) => setFilters({ ...filters, visibility: value })}
            style={{ width: 180 }}
            options={[
              { value: 'all', label: 'Все задачи' },
              { value: 'public', label: 'Публичные' },
              { value: 'private', label: 'Приватные' }
            ]}
          />
          <Input
            placeholder="Название задачи"
            value={filters.search}
            allowClear
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onPressEnter={handleFilterApply}
            style={{ width: 220 }}
          />
          <Button onClick={handleFilterApply}>Применить фильтры</Button>
        </Space>

        <Table
          rowKey="id"
          loading={loadingTasks}
          dataSource={tasks}
          columns={taskColumns}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <Modal
        open={taskModalOpen}
        width={800}
        title={taskEditingId ? 'Редактировать задачу' : 'Создать задачу'}
        onCancel={handleTaskModalClose}
        onOk={handleTaskSubmit}
        okText="Сохранить"
      >
        <Form layout="vertical" form={taskForm} onValuesChange={handleTaskFormChange}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="Название" rules={[{ required: true }]}> 
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="topic_id" label="Тема" rules={[{ required: true, message: 'Выберите тему' }]}>
                <Select
                  showSearch
                  placeholder="Выберите тему"
                  options={flatTopics.map((topic) => ({ label: topic.title, value: topic.id, disabled: topic.isRoot }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="content" label="Условие" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Используйте LaTeX для формул" />
          </Form.Item>
          {renderPreviewBox('Условие', formPreview.content)}
          <Form.Item name="answer" label="Ответ" rules={[{ required: true }]}
            style={{ marginTop: 16 }}>
            <Input placeholder="Точный ответ (формула или число)" />
          </Form.Item>
          {renderPreviewBox('Ответ', formPreview.answer)}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="hint" label="Подсказка">
                <Input.TextArea rows={2} placeholder="Доп. пояснение" />
              </Form.Item>
              {renderPreviewBox('Подсказка', formPreview.hint)}
            </Col>
            <Col span={12}>
              <Form.Item name="solution" label="Решение">
                <Input.TextArea rows={2} placeholder="Ключевые шаги решения" />
              </Form.Item>
              {renderPreviewBox('Решение', formPreview.solution)}
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="author_id" label="Автор">
                <Select allowClear placeholder="Системная задача" options={teachers.map((teacher) => ({ label: teacher.full_name, value: teacher.id }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="is_public" label="Доступ">
            <Select>
              <Select.Option value="public">Публичная</Select.Option>
              <Select.Option value="private">Приватная</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="image_data" hidden>
            <Input type="hidden" />
          </Form.Item>
          <Form.Item label="Изображение">
            <Space direction="vertical" style={{ width: '100%' }}>
              {imagePreview ? (
                <img src={imagePreview} alt="task" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4 }} />
              ) : (
                <Text type="secondary">Изображение не прикреплено</Text>
              )}
              <Space>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={handleImageBeforeUpload}
                >
                  <Button>Загрузить</Button>
                </Upload>
                {imagePreview && (
                  <Button onClick={handleImageRemove}>Удалить</Button>
                )}
              </Space>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminTasks;
