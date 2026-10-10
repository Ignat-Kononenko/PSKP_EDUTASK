import { Button, Card, message, Modal, Space, Table } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';

const AdminTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/tests');
      setTests(res.data || []);
    } catch (err) {
      message.error('Не удалось загрузить тесты');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const handleDelete = async (test) => {
    try {
      await api.delete(`/admin/tests/${test.id}`);
      message.success('Тест удалён');
      loadTests();
    } catch (err) {
      message.error('Не удалось удалить тест');
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'title'
    },
    {
      title: 'Преподаватель',
      dataIndex: ['teacher', 'full_name'],
      render: (_, record) => record.teacher?.full_name || '—'
    },
    {
      title: 'Задачи',
      dataIndex: 'taskCount'
    },
    {
      title: 'Назначения',
      dataIndex: 'sessionsCount'
    },
    {
      title: 'Создан',
      dataIndex: 'createdAt',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      title: 'Действия',
      render: (_, record) => (
        <Space>
          <Button
            danger
            onClick={() => {
              Modal.confirm({
              title: 'Подтверждение удаления',
              content: 'Вы уверены, что хотите удалить этот тест?',
              okText: 'Да, удалить',
              cancelText: 'Отмена',
              onOk: () => handleDelete(record),
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
    <Card title="Тесты">
      <Table rowKey="id" loading={loading} dataSource={tests} columns={columns} pagination={{ pageSize: 8 }} />
    </Card>
  );
};

export default AdminTests;
