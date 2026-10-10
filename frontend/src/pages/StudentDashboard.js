import {
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  List,
  Menu,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LatexRenderer from '../components/LatexRenderer';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

const StudentDashboard = () => {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [solvedTasks, setSolvedTasks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  
  const [taskFilters, setTaskFilters] = useState({
    search: '',
    onlyUnsolved: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [topicsRes, solvedRes] = await Promise.all([
        api.get('/topics'),
        api.get('/tasks/solved'),
      ]);
      setTopics(topicsRes.data);
      setSolvedTasks(solvedRes.data);
    } catch (err) {
      console.error('Ошибка загрузки данных', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (topicId) => {
    setTasksLoading(true);
    try {
      const res = await api.get(`/tasks/${topicId}`);
      setTasks(res.data);
    } catch (err) {
      console.error('Ошибка загрузки задач', err);
    } finally {
      setTasksLoading(false);
    }
  };

  const findTopicById = (id, topicList) => {
    for (const t of topicList) {
      if (t.id === id) return t;
      if (t.subtopics) {
        const found = findTopicById(id, t.subtopics);
        if (found) return found;
      }
    }
    return null;
  };

  const handleMenuSelect = ({ key }) => {
    const topicId = parseInt(key.replace('topic-', ''), 10);
    const topic = findTopicById(topicId, topics);
    if (topic) {
      setSelectedTopic(topic);
      fetchTasks(topic.id);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (taskFilters.onlyUnsolved && solvedTasks.includes(task.id)) return false;
    if (
      taskFilters.search &&
      !task.title.toLowerCase().includes(taskFilters.search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getMenuItems = (topicList) => {
    return topicList.map((topic) => ({
      key: `topic-${topic.id}`,
      label: topic.title,
      children: topic.subtopics?.length > 0 ? getMenuItems(topic.subtopics) : undefined,
    }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" tip="Загрузка материалов..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: 32 }}>
        Моё обучение
      </Title>

      <Row gutter={[32, 32]}>

        <Col xs={24} md={8} lg={6}>
          <Card 
            title="Темы" 
            bordered={false} 
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', minHeight: '500px' }}
            bodyStyle={{ padding: 0 }}
          >
            {topics.length > 0 ? (
              <Menu
                mode="inline"
                items={getMenuItems(topics)}
                onSelect={handleMenuSelect}
                selectedKeys={selectedTopic ? [`topic-${selectedTopic.id}`] : []}
                style={{ borderRight: 'none' }}
              />
            ) : (
              <Empty description="Темы не найдены" style={{ marginTop: 40 }} />
            )}
          </Card>
        </Col>

        <Col xs={24} md={16} lg={18}>
          <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', minHeight: '500px' }}>
            {selectedTopic ? (
              <>

                <Row justify="space-between" align="middle" style={{ marginBottom: 24, rowGap: 16 }}>
                  <Col>
                    <Title level={4} style={{ margin: 0 }}>
                      Задачи по теме: {selectedTopic.title}
                    </Title>
                  </Col>
                  <Col>
                    <Space size="middle" wrap>
                      <Input
                        placeholder="Поиск по названию"
                        value={taskFilters.search}
                        onChange={(e) => setTaskFilters({ ...taskFilters, search: e.target.value })}
                        style={{ width: 250 }}
                        allowClear
                      />
                      <Checkbox
                        checked={taskFilters.onlyUnsolved}
                        onChange={(e) => setTaskFilters({ ...taskFilters, onlyUnsolved: e.target.checked })}
                      >
                        Только нерешённые
                      </Checkbox>
                    </Space>
                  </Col>
                </Row>

                {tasksLoading ? (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Spin />
                  </div>
                ) : (
                  <List
                    grid={{ gutter: 24, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
                    dataSource={filteredTasks}
                    locale={{
                      emptyText: <Empty description={tasks.length ? "По заданным фильтрам ничего не найдено" : "В этой теме пока нет задач"} />
                    }}
                    renderItem={(task) => {
                      const isSolved = solvedTasks.includes(task.id);
                      return (
                        <List.Item>
                          <Link to={`/student/task/${task.id}`}>
                            <Card
                              hoverable
                              style={{ 
                                height: '100%', 
                                border: isSolved ? '1px solid #b7eb8f' : '1px solid var(--border-color)' 
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <Text strong style={{ fontSize: 16 }}>
                                  {task.title}
                                </Text>
                                {isSolved && (
                                  <Tag color="success" style={{ margin: 0 }}>
                                    Решено
                                  </Tag>
                                )}
                              </div>
                              <Paragraph type="secondary" ellipsis={{ rows: 3 }}>
                                <LatexRenderer text={task.content} inline />
                              </Paragraph>
                            </Card>
                          </Link>
                        </List.Item>
                      );
                    }}
                  />
                )}
              </>
            ) : (

              <div style={{ textAlign: 'center', padding: '100px 20px' }}>
                <Title level={4} style={{ color: '#8c8c8c' }}>
                  Выберите тему из списка слева, чтобы начать решение задач
                </Title>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentDashboard;