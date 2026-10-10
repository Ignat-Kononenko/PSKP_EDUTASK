import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Tree,
  Typography,
  message
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const { Text } = Typography;

const AdminTopics = () => {
  const [topicsTree, setTopicsTree] = useState([]);
  const [flatTopics, setFlatTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const loadTopics = useCallback(async () => {
    setLoading(true);
    try {
      const [treeRes, flatRes] = await Promise.all([
        api.get('/admin/topics/tree'),
        api.get('/topics')
      ]);

      const flatten = (nodes = [], prefix = '', parentId = null) => {
        const result = [];
        nodes.forEach((node) => {
          const label = prefix ? `${prefix} / ${node.title}` : node.title;
          result.push({ id: node.id, title: label, subject: node.subject, parent_id: parentId, isRoot: parentId === null });
          if (node.subtopics?.length) {
            result.push(...flatten(node.subtopics, label, node.id));
          }
        });
        return result;
      };

      setTopicsTree(treeRes.data || []);
      setFlatTopics(flatten(flatRes.data || []));
    } catch (err) {
      message.error('Не удалось загрузить темы');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const handleAdd = useCallback((parent) => {
    if (parent && parent.parent_id !== null) {
      message.warning('Новые темы можно добавлять только в корневые разделы');
      return;
    }
    setEditingId(null);
    form.setFieldsValue({
      subject: parent?.subject || '',
      parent_id: parent?.id,
      title: ''
    });
    setModalOpen(true);
  }, [form]);

  const handleEdit = useCallback((topic) => {
    setEditingId(topic.id);
    form.setFieldsValue({
      subject: topic.subject || '',
      title: topic.title,
      parent_id: topic.parent_id || undefined
    });
    setModalOpen(true);
  }, [form]);

  const handleDelete = useCallback(async (topic) => {
    try {
      await api.delete(`/topics/${topic.id}`);
      message.success('Тема удалена');
      loadTopics();
    } catch (err) {
      message.error(err.response?.data?.message || 'Не удалось удалить тему');
    }
  }, [loadTopics]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await api.put(`/topics/${editingId}`, values);
      } else {
        await api.post('/topics', values);
      }
      message.success('Тема сохранена');
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
      loadTopics();
    } catch (err) {
      message.error(err.response?.data?.message || 'Не удалось сохранить тему');
    }
  };

  const treeData = useMemo(() => {
    const buildNodes = (nodes = []) => nodes.map((node) => {
      const hasChildren = (node.children?.length || 0) > 0;
      const deleteDisabled = hasChildren || (node.taskCount ?? 0) > 0;
      return {
        key: node.id,
        title: (
          <Space size="small">
            <div>
              <Text strong>{node.title}</Text>
              <div style={{ fontSize: 12, color: '#888' }}>{node.subject}</div>
            </div>
            <Tag color="blue">{node.taskCount || 0} задач</Tag>
            <Space size="small">
              <Button
                size="small"
                disabled={node.parent_id !== null}
                onClick={(e) => { e.stopPropagation(); handleAdd(node); }}
              >
                +
              </Button>
              <Button size="small" onClick={(e) => { e.stopPropagation(); handleEdit(node); }}>Изм.</Button>
              <Button
                size="small"
                danger
                disabled={deleteDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (deleteDisabled) return;
                  Modal.confirm({
                    title: 'Подтверждение удаления',
                    content: 'Удалить тему? Удалять можно только пустые темы (без задач и подтем).',
                    okText: 'Да, удалить',
                    cancelText: 'Отмена',
                    onOk: () => handleDelete(node),
                    okButtonProps: { danger: true },
                  });
                }}
              >
                Удалить
              </Button>
            </Space>
          </Space>
        ),
        children: buildNodes(node.children || [])
      };
    });
    return buildNodes(topicsTree);
  }, [topicsTree, handleAdd, handleDelete, handleEdit]);

  return (
    <div style={{ paddingBottom: 40 }}>
      <Card
        title="Темы"
        extra={<Button type="primary" onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}>Создать корневую тему</Button>}
        loading={loading}
      >
        <Tree treeData={treeData} showLine defaultExpandAll />
      </Card>

      <Modal
        open={modalOpen}
        title={editingId ? 'Редактировать тему' : 'Создать тему'}
        onCancel={() => { setModalOpen(false); setEditingId(null); }}
        onOk={handleSubmit}
        okText="Сохранить"
      >
        <Form layout="vertical" form={form}>
          <Form.Item name="subject" label="Предмет" rules={[{ required: true, message: 'Укажите предмет' }]}>
            <Input placeholder="Алгебра" />
          </Form.Item>
          <Form.Item name="title" label="Название" rules={[{ required: true, message: 'Введите название темы' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parent_id" label="Родительская тема">
            <Select
              allowClear
              placeholder="Корневая тема"
              options={flatTopics.filter((topic) => topic.isRoot).map((topic) => ({ label: topic.title, value: topic.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminTopics;
