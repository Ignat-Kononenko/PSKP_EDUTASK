import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  List,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [publicTopics, setPublicTopics] = useState([]);
  const [publicTasks, setPublicTasks] = useState([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [publicError, setPublicError] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.role === 'TEACHER' || user.role === 'ADMIN') {
        navigate('/profile', { replace: true });
      }
      return;
    }
    loadPublicData();
  }, [user, navigate]);

  const loadPublicData = async () => {
    setPublicLoading(true);
    setPublicError(null);
    try {
      const [topicsRes, tasksRes] = await Promise.all([
        api.get('/topics'),
        api.get('/public/tasks')
      ]);
      setPublicTopics(topicsRes.data);
      setPublicTasks(tasksRes.data);
    } catch (err) {
      console.error('Ошибка загрузки публичных данных', err);
      setPublicError('Не удалось загрузить темы и задачи. Попробуйте позже.');
    } finally {
      setPublicLoading(false);
    }
  };

  const collectTopicIds = useCallback(
    (topicId) => {
      if (!topicId) return [];
      const rootTopic = publicTopics.find((topic) => topic.id === topicId);
      if (rootTopic) {
        const childIds = rootTopic.subtopics?.map((sub) => sub.id) || [];
        return [rootTopic.id, ...childIds];
      }

      const parentTopic = publicTopics.find((topic) =>
        topic.subtopics?.some((sub) => sub.id === topicId)
      );
      if (parentTopic) {
        return [topicId];
      }
      return [topicId];
    },
    [publicTopics]
  );

  const visibleTasks = useMemo(() => {
    if (!selectedTopicId) return [];
    const allowedIds = collectTopicIds(selectedTopicId);
    return publicTasks.filter((task) => allowedIds.includes(task.topic_id));
  }, [publicTasks, selectedTopicId, collectTopicIds]);

  const selectedTopicTitle = useMemo(() => {
    if (!selectedTopicId) return '';
    const rootTopic = publicTopics.find((topic) => topic.id === selectedTopicId);
    if (rootTopic) {
      return rootTopic.title;
    }
    for (const topic of publicTopics) {
      const sub = topic.subtopics?.find((item) => item.id === selectedTopicId);
      if (sub) {
        return sub.title;
      }
    }
    return '';
  }, [publicTopics, selectedTopicId]);

  const featureCards = [
    {
      title: 'Алгебра',
      description:
        'От линейных уравнений до сложных функций. Решайте задачи и получайте мгновенную обратную связь.',
    },
    {
      title: 'Геометрия',
      description:
        'Изучайте свойства фигур, углы и площади. Наглядные решения помогут лучше понять материал.',
    },
    {
      title: 'ИИ-помощник',
      description:
        'Запутались в решении? Наш умный помощник даст подсказку, не раскрывая ответ сразу.',
    },
  ];

  const TopicTree = () => (
    <Collapse accordion bordered={false} defaultActiveKey={publicTopics[0]?.id?.toString()}>
      {publicTopics.map((topic) => (
        <Panel
          header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <strong>{topic.title}</strong>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {topic.subject}
                </Text>
              </span>
              <Tag color="blue">{topic.subtopics?.length || 0} подтем</Tag>
            </div>
          }
          key={topic.id}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type={selectedTopicId === topic.id ? 'primary' : 'default'}
              block
              onClick={() => setSelectedTopicId(topic.id)}
              style={{ textAlign: 'left', marginBottom: 8 }}
            >
              Все задачи темы
            </Button>
            {topic.subtopics?.map((sub) => (
              <Button
                key={sub.id}
                type={selectedTopicId === sub.id ? 'primary' : 'text'}
                block
                onClick={() => setSelectedTopicId(sub.id)}
                style={{ textAlign: 'left', paddingLeft: 32 }}
              >
                • {sub.title}
              </Button>
            ))}
          </Space>
        </Panel>
      ))}
    </Collapse>
  );

  const TaskList = () => (
    <List
      dataSource={visibleTasks}
      locale={{ emptyText: 'В этой теме пока нет задач' }}
      renderItem={(task) => (
        <List.Item actions={[<Tag color="warning">Войдите, чтобы открыть</Tag>]}>
          <List.Item.Meta
            title={task.title}
            description="Для просмотра условия и решения необходимо авторизоваться"
          />
        </List.Item>
      )}
    />
  );

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="center">
        <Col xs={24} md={20} lg={18}>
          {/* Приветственный блок */}
          <Card style={{ textAlign: 'center', marginBottom: 32 }}>
            <Title level={1} style={{ color: '#1c2b33' }}>
              Добро пожаловать в EduTask!
            </Title>
            <Paragraph style={{ fontSize: 18, color: '#576b75', maxWidth: 800, margin: '0 auto 24px' }}>
              Интерактивный задачник с автоматической проверкой и ИИ-помощником. Решайте задачи по алгебре
              и геометрии, получайте подсказки и отслеживайте прогресс.
            </Paragraph>
            <Space size="middle">
              {!user ? (
                <>
                  <Link to="/register">
                    <Button type="primary" size="large">
                      Начать учиться
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="large">
                      Войти в систему
                    </Button>
                  </Link>
                </>
              ) : (
                <Link to={user.role === 'STUDENT' ? '/student/topics' : '/teacher/students'}>
                  <Button type="primary" size="large">
                    {user.role === 'STUDENT' ? 'К моим задачам' : 'К моим ученикам'}
                  </Button>
                </Link>
              )}
            </Space>
          </Card>

          {/* Карточки предметов */}
          <Row gutter={[24, 24]} style={{ marginBottom: 40 }}>
            {featureCards.map((card) => (
              <Col xs={24} sm={12} md={8} key={card.title}>
                <Card hoverable style={{ textAlign: 'center', height: '100%' }}>
                  <Title level={4} style={{ marginTop: 16 }}>
                    {card.title}
                  </Title>
                  <Paragraph>{card.description}</Paragraph>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Блок о лекциях и фото класса */}
          <Card title="Приходите к нам на лекции!" style={{ marginBottom: 32 }}>
            <Row gutter={[32, 32]} align="middle">
              <Col xs={24} md={12}>
                <Paragraph>
                  Мы проводим <strong>бесплатные лекции и практикумы</strong> в современном компьютерном
                  классе. Вы можете прийти к нам, задать вопросы преподавателю и решать задачи вместе с
                  другими учениками. Расписание уточняйте по телефону или в личном кабинете после
                  регистрации.
                </Paragraph>
                <Paragraph>
                  <strong>Адрес:</strong> г. Минск, ул. Свердлова, 13а
                </Paragraph>
              </Col>
              <Col xs={24} md={12}>
                <img
                  src="/images/classroom.jpg"
                  alt="Наш класс"
                  style={{
                    width: '100%',
                    borderRadius: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
              </Col>
            </Row>
          </Card>

          {!user && (
            <Card
              title="Задачи доступны гостям для просмотра названий"
              extra={<Text type="secondary">Зарегистрируйтесь, чтобы решать задачи</Text>}
              style={{ marginTop: 16 }}
            >
              {publicLoading && (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Spin tip="Загрузка списка задач..." />
                </div>
              )}
              {publicError && <Alert message="Ошибка" description={publicError} type="error" showIcon />}
              {!publicLoading && !publicError && (
                <Row gutter={[32, 32]}>
                  <Col xs={24} md={10}>
                    <Title level={4}>Темы</Title>
                    <TopicTree />
                  </Col>
                  <Col xs={24} md={14}>
                    <Title level={4}>
                      Задачи{' '}
                      {selectedTopicId && selectedTopicTitle && ` (тема ${selectedTopicTitle})`}
                    </Title>
                    <TaskList />
                  </Col>
                </Row>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default Home;