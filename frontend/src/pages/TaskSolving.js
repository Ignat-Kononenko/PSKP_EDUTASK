import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Row,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LatexRenderer from '../components/LatexRenderer';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

const TaskSolving = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  
  const [task, setTask] = useState(null);
  const [nextTaskId, setNextTaskId] = useState(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [hint, setHint] = useState(null);
  const [solution, setSolution] = useState(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [loadingSolution, setLoadingSolution] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userQuestion, setUserQuestion] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/tasks/item/${taskId}`);
        setTask(res.data.task);
        setNextTaskId(res.data.nextTaskId);
      } catch (err) {
        console.error('Ошибка загрузки задачи', err);
        message.error('Не удалось загрузить задачу');
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
    
    setShowHint(false);
    setShowSolution(false);
    setHint(null);
    setSolution(null);
    setResult(null);
    setAnswer('');
    setChatMessages([]);
  }, [taskId]);


  const fetchHint = async () => {
    if (hint !== null) return;
    setLoadingHint(true);
    try {
      const res = await api.get(`/tasks/${taskId}/hint`);
      setHint(res.data.hint);
    } catch (err) {
      console.error('Ошибка загрузки подсказки', err);
      message.error('Не удалось загрузить подсказку');
      setHint('');
    } finally {
      setLoadingHint(false);
    }
  };

  const fetchSolution = async () => {
    if (solution !== null) return;
    setLoadingSolution(true);
    try {
      const res = await api.get(`/tasks/${taskId}/solution`);
      setSolution(res.data.solution);
    } catch (err) {
      console.error('Ошибка загрузки решения', err);
      message.error('Не удалось загрузить решение');
      setSolution('');
    } finally {
      setLoadingSolution(false);
    }
  };

  const handleShowHint = () => {
    if (!showHint) {
      fetchHint();
    }
    setShowHint(!showHint);
  };

  const handleShowSolution = () => {
    if (!showSolution) {
      fetchSolution();
    }
    setShowSolution(!showSolution);
  };

  const handleCheckAnswer = async () => {
    if (!answer.trim()) return;
    try {
      const res = await api.post('/tasks/check', { task_id: taskId, answer });
      setResult(res.data.is_correct);
    } catch (err) {
      console.error('Ошибка проверки ответа', err);
      message.error('Ошибка при проверке');
    }
  };

  const handleAskAI = async () => {
    if (!userQuestion.trim()) return;
    const newMessages = [...chatMessages, { role: 'user', content: userQuestion }];
    setChatMessages(newMessages);
    setUserQuestion('');
    setAiLoading(true);
    try {
      const res = await api.post('/ai-hint', { 
        task_id: taskId, 
        student_answer: answer,
        user_question: userQuestion
      });
      setChatMessages([...newMessages, { role: 'ai', content: res.data.hint }]);
    } catch (err) {
      console.error('Ошибка ИИ', err);
      setChatMessages([...newMessages, { role: 'ai', content: 'Произошла ошибка при обращении к ИИ. Попробуйте еще раз.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, aiLoading]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" tip="Загрузка задачи..." />
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert message="Ошибка" description="Задача не найдена или у вас нет к ней доступа." type="error" showIcon />
      </div>
    );
  }

  const hintContent = loadingHint ? <Spin size="small" /> : (hint ? <LatexRenderer text={hint} /> : "К этой задаче пока нет базовой подсказки.");
  const solutionContent = loadingSolution ? <Spin size="small" /> : (solution ? <LatexRenderer text={solution} /> : "Решение еще не добавлено преподавателем.");

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 24 }}>{task.title}</Title>

      <Row gutter={[32, 32]}>
        <Col xs={24} lg={16}>
          <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 24 }}>
            {task.image_data && (
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <img 
                  src={task.image_data} 
                  alt="Чертеж к задаче" 
                  style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: 8, border: '1px solid #f0f0f0' }} 
                />
              </div>
            )}
            <div style={{ fontSize: '16px', lineHeight: 1.6 }}>
              <LatexRenderer text={task.content} />
            </div>
          </Card>

          <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 24, backgroundColor: '#fafafa' }}>
            <Text strong style={{ display: 'block', fontSize: 16, marginBottom: 12 }}>Ваш ответ:</Text>
            <Space direction="vertical" style={{ width: '100%', maxWidth: 520 }} size={16}>
              <Input.TextArea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Используйте LaTeX, например: $\\frac{a}{b}$"
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
              <div style={{ width: '100%' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Предпросмотр формулы:</Text>
                <div style={{ minHeight: 48, padding: '12px 16px', background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                  {answer.trim()
                    ? <LatexRenderer text={answer} />
                    : <Text type="secondary">Введите выражение, чтобы увидеть форматирование</Text>}
                </div>
              </div>
              <Button type="primary" size="large" onClick={handleCheckAnswer} style={{ alignSelf: 'flex-start' }}>
                Проверить
              </Button>
            </Space>
            {result !== null && (
              <Alert
                message={result ? "Правильно! Отличная работа." : "Неправильно. Попробуйте еще раз или воспользуйтесь подсказкой."}
                type={result ? "success" : "error"}
                showIcon={false}
                style={{ marginTop: 16, maxWidth: '400px' }}
              />
            )}
          </Card>

          <Space wrap style={{ marginBottom: 24 }}>
            <Button onClick={handleShowHint}>
              {showHint ? 'Скрыть подсказку' : 'Показать подсказку'}
            </Button>
            <Button onClick={handleShowSolution}>
              {showSolution ? 'Скрыть решение' : 'Показать подробное решение'}
            </Button>
          </Space>

          {showHint && (
            <Alert
              message={<Text strong>Подсказка</Text>}
              description={hintContent}
              type="warning"
              showIcon={false}
              style={{ marginBottom: 24 }}
            />
          )}

          {showSolution && (
            <Alert
              message={<Text strong>Пошаговое решение</Text>}
              description={solutionContent}
              type="info"
              showIcon={false}
              style={{ marginBottom: 24 }}
            />
          )}

          {nextTaskId && (
            <div style={{ textAlign: 'right' }}>
              <Button type="primary" size="large" onClick={() => navigate(`/student/task/${nextTaskId}`)}>
                Следующая задача
              </Button>
            </div>
          )}
        </Col>

        <Col xs={24} lg={8}>
          <Card 
            title="ИИ-помощник"
            bordered={false} 
            style={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            bodyStyle={{ flexGrow: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}
          >
            <div style={{ flexGrow: 1, height: '400px', overflowY: 'auto', marginBottom: 16, paddingRight: 8 }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#bfbfbf', marginTop: '50px' }}>
                  <Paragraph>Не знаете с чего начать?<br/>Задайте мне вопрос по задаче!</Paragraph>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {chatMessages.map((msg, i) => (
                    <div 
                      key={i} 
                      style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : '#f0f2f5',
                        color: msg.role === 'user' ? '#fff' : '#000',
                        padding: '10px 14px',
                        borderRadius: '16px',
                        borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                        borderBottomLeftRadius: msg.role === 'ai' ? '4px' : '16px',
                        maxWidth: '85%',
                        fontSize: '14px',
                        lineHeight: 1.5,
                      }}
                    >
                      <LatexRenderer text={msg.content} />
                    </div>
                  ))}
                  {aiLoading && (
                    <div style={{ alignSelf: 'flex-start', backgroundColor: '#f0f2f5', padding: '10px 14px', borderRadius: '16px', borderBottomLeftRadius: '4px' }}>
                      <Spin size="small" /> <Text type="secondary" style={{ marginLeft: 8 }}>Печатает...</Text>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
            <Space.Compact style={{ width: '100%' }}>
              <Input 
                placeholder="Например: Как найти дискриминант?" 
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                onPressEnter={handleAskAI}
                disabled={aiLoading}
              />
              <Button type="primary" onClick={handleAskAI} loading={aiLoading}>
                Отправить
              </Button>
            </Space.Compact>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TaskSolving;