import { Badge, Menu } from 'antd';
import { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Sidebar = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [pendingTests, setPendingTests] = useState(0);

  useEffect(() => {
    if (user?.role !== 'STUDENT') return;
    const fetchCount = async () => {
      try {
        const res = await api.get('/student/tests');
        const count = Array.isArray(res.data)
          ? res.data.filter((item) => item.status === 'pending').length
          : res.data?.pending_count ?? 0;
        setPendingTests(count);
      } catch (err) {
        console.error('Не удалось загрузить тесты', err);
      }
    };
    fetchCount();
  }, [user?.role]);

  useEffect(() => {
    if (location.pathname === '/student/tests') {
      setPendingTests(0);
    }
  }, [location.pathname]);

  if (!user) return null;

  const menuItems = [];

  if (user.role === 'STUDENT') {
    menuItems.push({
      key: '/',
      label: <Link to="/">Главная</Link>,
    });
  }

  if (user.role !== 'ADMIN') {
    menuItems.push({
      key: '/profile',
      label: <Link to="/profile">Профиль</Link>,
    });
  }

  if (user.role === 'STUDENT') {
    menuItems.push(
      {
        key: '/student/topics',
        label: <Link to="/student/topics">Темы и задачи</Link>,
      },
      {
        key: '/student/progress',
        label: <Link to="/student/progress">Мой прогресс</Link>,
      },
      {
        key: '/student/tests',
        label: (
          <Link to="/student/tests" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Мои тесты
            {pendingTests > 0 && <Badge count={pendingTests} size="small" />}
          </Link>
        ),
      }
    );
  }

  if (user.role === 'TEACHER') {
    menuItems.push(
      {
        key: '/teacher/students',
        label: <Link to="/teacher/students">Мои ученики</Link>,
      },
      {
        key: '/teacher/tasks',
        label: <Link to="/teacher/tasks">Управление задачами</Link>,
      },
      {
        key: '/teacher/tests',
        label: <Link to="/teacher/tests">Мои тесты</Link>,
      },
      {
        key: '/teacher/tests/new',
        label: <Link to="/teacher/tests/new">Конструктор тестов</Link>,
      },
      {
        key: '/teacher/tests/assign',
        label: <Link to="/teacher/tests/assign">Назначить тест</Link>,
      }
    );
  }

  if (user.role === 'ADMIN') {
    menuItems.push(
      {
        key: '/admin/users',
        label: <Link to="/admin/users">Пользователи</Link>,
      },
      {
        key: '/admin/topics',
        label: <Link to="/admin/topics">Темы</Link>,
      },
      {
        key: '/admin/tasks',
        label: <Link to="/admin/tasks">Задачи</Link>,
      },
      {
        key: '/admin/tests',
        label: <Link to="/admin/tests">Тесты</Link>,
      },
      {
        key: '/admin/stats',
        label: <Link to="/admin/stats">Статистика</Link>,
      }
    );
  }

  return (
    <aside className="sidebar">
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{
          height: '100%',
          borderRight: 0,
          backgroundColor: 'transparent',
        }}
      />
    </aside>
  );
};

export default Sidebar;