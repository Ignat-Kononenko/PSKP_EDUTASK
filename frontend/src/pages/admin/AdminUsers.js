import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm] = Form.useForm();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      message.error('Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const teachers = useMemo(() => users.filter((u) => u.role === 'TEACHER'), [users]);

  const openUserModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      userForm.setFieldsValue({
        full_name: user.full_name,
        email: user.email,
        teacher_id: user.role === 'ADMIN' ? undefined : user.teacher_id || undefined
      });
    } else {
      setEditingUser(null);
      userForm.resetFields();
    }
    setUserModalOpen(true);
  };

  const handleUserSubmit = async () => {
    try {
      const values = await userForm.validateFields();
      const teacherIdPayload = editingUser?.role === 'STUDENT'
        ? Number(values.teacher_id)
        : null;

      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, {
          full_name: values.full_name,
          email: values.email,
          teacher_id: teacherIdPayload
        });
        message.success('Пользователь обновлен');
      } else {
        await api.post('/admin/users', {
          full_name: values.full_name,
          email: values.email,
          password: values.password,
          role: 'TEACHER'
        });
        message.success('Пользователь создан');
      }

      setUserModalOpen(false);
      setEditingUser(null);
      userForm.resetFields();
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Ошибка сохранения пользователя');
    }
  };

  // Блокировка пользователя
  const handleBan = async (user) => {
    if (user.role === 'ADMIN') {
      message.warning('Нельзя блокировать администратора');
      return;
    }
    try {
      await api.post(`/admin/users/${user.id}/ban`);
      message.success('Пользователь заблокирован');
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Не удалось заблокировать');
    }
  };

  // Разблокировка пользователя
  const handleUnban = async (user) => {
    try {
      await api.post(`/admin/users/${user.id}/unban`);
      message.success('Пользователь разблокирован');
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Не удалось разблокировать');
    }
  };

  // Завершение обучения (использует detachStudent, доступен для ADMIN)
  const handleGraduate = async (user) => {
    if (user.role !== 'STUDENT') return;
    try {
      await api.delete(`/students/${user.id}/detach`);
      message.success('Обучение ученика завершено');
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Не удалось завершить обучение');
    }
  };

  // Возобновление обучения (только для администратора)
  const handleRestoreStudent = async (user) => {
    if (user.role !== 'STUDENT') return;
    try {
      await api.post(`/admin/students/${user.id}/restore`);
      message.success('Обучение ученика возобновлено');
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Не удалось возобновить обучение');
    }
  };

  const columns = [
    {
      title: 'ФИО',
      dataIndex: 'full_name',
      render: (text, record) => (
        <div>
          <strong>{text || '—'}</strong>
          <div style={{ color: '#888' }}>{record.email}</div>
        </div>
      )
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      render: (value) => {
        const colorMap = {
          ADMIN: 'purple',
          TEACHER: 'blue',
          STUDENT: 'geekblue'
        };
        const labelMap = {
          ADMIN: 'Админ',
          TEACHER: 'Преподаватель',
          STUDENT: 'Ученик'
        };
        return <Tag color={colorMap[value] || 'default'}>{labelMap[value] || value}</Tag>;
      }
    },
    {
      title: 'Статус',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tag color={record.is_banned ? 'red' : 'green'}>
            {record.is_banned ? 'Заблокирован' : 'Активен'}
          </Tag>
          {record.role === 'STUDENT' && record.is_graduated && (
            <Tag color="default">Завершил обучение</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Преподаватель',
      dataIndex: 'teacher_id',
      render: (value) => users.find((u) => u.id === value)?.full_name || '—'
    },
    {
      title: 'Действия',
      render: (_, record) => (
        <Space>
          <Button
            disabled={record.role === 'ADMIN'}
            onClick={() => (record.is_banned ? handleUnban(record) : handleBan(record))}
          >
            {record.is_banned ? 'Разблокировать' : 'Заблокировать'}
          </Button>
          {record.role === 'STUDENT' && (
            !record.is_graduated ? (
              <Button onClick={() => handleGraduate(record)}>Завершить</Button>
            ) : (
              <Button onClick={() => handleRestoreStudent(record)}>Возобновить</Button>
            )
          )}
          <Button onClick={() => openUserModal(record)}>Изменить</Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      <Card title="Пользователи" extra={<Button type="primary" onClick={() => openUserModal()}>Добавить</Button>}>
        <Table rowKey="id" loading={loading} dataSource={users} columns={columns} pagination={{ pageSize: 8 }} />
      </Card>

      <Modal
        open={userModalOpen}
        title={editingUser ? 'Редактировать пользователя' : 'Создать пользователя'}
        onCancel={() => { setUserModalOpen(false); setEditingUser(null); userForm.resetFields(); }}
        onOk={handleUserSubmit}
        okText="Сохранить"
      >
        <Form layout="vertical" form={userForm}>
          <Form.Item name="full_name" label="ФИО" rules={[{ required: true, message: 'Введите ФИО' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}>
            <Input />
          </Form.Item>
          {!editingUser && (
            <Form.Item name="password" label="Пароль" rules={[{ required: true, min: 8, message: 'Не менее 8 символов' }]}>
              <Input.Password visibilityToggle={false} />
            </Form.Item>
          )}
          {editingUser?.role === 'STUDENT' && (
            <Form.Item
              name="teacher_id"
              label="Привязанный преподаватель"
              rules={[{ required: true, message: 'Выберите преподавателя' }]}
            >
              <Select placeholder="Выберите преподавателя">
                {teachers.map((teacher) => (
                  <Select.Option key={teacher.id} value={teacher.id}>{teacher.full_name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsers;