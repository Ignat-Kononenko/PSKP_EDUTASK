import { Button, Card, Empty, message, Modal, Space, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const { Title, Text } = Typography;

const columnsBuilder = ({ onDelete }) => [
  {
    title: 'Название',
    dataIndex: 'title',
    key: 'title',
    render: (text, record) => (
      <div>
        <Space size={8} align="center">
          <Text strong style={{ fontSize: 16 }}>{text}</Text>
          {record.is_archived && <Tag color="default">Архив</Tag>}
        </Space>
        <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
          Создан: {new Date(record.createdAt).toLocaleString('ru-RU')}
        </div>
      </div>
    ),
  },
  {
    title: 'Лимит времени',
    dataIndex: 'time_limit',
    key: 'time_limit',
    align: 'center',
    render: (value) => (
      <Tag color="blue">{value} мин</Tag>
    ),
  },
  {
    title: 'Проходной балл',
    dataIndex: 'passing_score',
    key: 'passing_score',
    align: 'center',
  },
  {
    title: 'Задач',
    dataIndex: 'taskCount',
    key: 'taskCount',
    align: 'center',
  },
  {
    title: 'Действия',
    key: 'actions',
    align: 'right',
    render: (_, record) => (
      <Space size="middle">
        <Link to={`/teacher/tests/${record.id}/edit`}>
          <Button size="small">Редактировать</Button>
        </Link>
        <Button
          size="small"
          danger
          onClick={() => {
            Modal.confirm({
              title: 'Подтверждение удаления',
              content: 'Вы уверены, что хотите удалить этот тест?',
              okText: 'Да, удалить',
              cancelText: 'Отмена',
              onOk: () => onDelete(record.id),
              okButtonProps: { danger: true },
            });
          }}
        >
          Удалить
        </Button>
      </Space>
    ),
  },
];

const TeacherTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/tests/my');
        if (isMounted) {
          setTests(res.data || []);
        }
      } catch (err) {
        console.error('Не удалось загрузить тесты', err);
        if (isMounted) {
          message.error(err.response?.data?.message || 'Ошибка загрузки списка тестов');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/tests/${id}`);
      message.success('Тест удалён');
      setTests((prev) => prev.filter((test) => test.id !== id));
    } catch (err) {
      console.error('Ошибка удаления теста', err);
      message.error(err.response?.data?.message || 'Не удалось удалить тест');
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} className="page-title" style={{ margin: 0 }}>
          Мои тесты
        </Title>
      </div>

      <Card className="shadow-card" bordered={false}>
        <Table
          dataSource={tests}
          columns={columnsBuilder({ onDelete: handleDelete })}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <Empty description="У вас пока нет созданных тестов" /> }}
        />
      </Card>
    </div>
  );
};

export default TeacherTests;
