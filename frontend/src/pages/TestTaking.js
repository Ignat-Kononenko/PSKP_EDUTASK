import {
  Button,
  Card,
  Col,
  Input,
  Modal,
  Progress,
  Row,
  Spin,
  Typography,
  message
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LatexRenderer from '../components/LatexRenderer';
import api from '../services/api';

const { Title, Text } = Typography;

const TestTaking = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLimit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  const storageKey = useMemo(() => `test_session_${sessionId}_answers`, [sessionId]);

  const handleSubmit = useCallback(async () => {
    if (isFinished) return;
    setIsFinished(true);
    try {
      await api.post('/student/tests/submit', {
        session_id: sessionId,
        answers: answers,
      });
      localStorage.removeItem(storageKey);
      message.success('Тест успешно завершен и отправлен на проверку!');
      navigate('/student/tests');
    } catch (err) {
      console.error('Ошибка при отправке теста', err);
      message.error('Ошибка при отправке результатов');
    }
  }, [sessionId, answers, isFinished, navigate, storageKey]);

  const confirmSubmit = () => {
    Modal.confirm({
      title: 'Завершить тест?',
      content: 'Вы уверены, что хотите завершить тест? Вы больше не сможете изменить свои ответы.',
      okText: 'Да, завершить',
      cancelText: 'Отмена',
      onOk: handleSubmit,
    });
  };

  useEffect(() => {
    const startTest = async () => {
      try {
        const res = await api.post('/student/tests/start', { session_id: sessionId });
        setSession(res.data);

        const totalSeconds = (res.data?.test?.time_limit || 0) * 60;
        const startedAt = res.data?.started_at ? new Date(res.data.started_at) : null;
        const elapsedSeconds = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;
        const remainingSeconds = Math.max(totalSeconds - elapsedSeconds, 0);
        setTimeLimit(remainingSeconds);

        const savedAnswers = localStorage.getItem(storageKey);
        if (savedAnswers) {
          try {
            const parsed = JSON.parse(savedAnswers);
            setAnswers(parsed || {});
          } catch (_) {
            localStorage.removeItem(storageKey);
          }
        }

        setLoading(false);
      } catch (err) {
        message.error('Не удалось начать тест или он уже завершен');
        navigate('/student/tests');
      }
    };
    startTest();
  }, [sessionId, navigate, storageKey]);

  useEffect(() => {
    if (timeLeft <= 0 || isFinished) return;
    const timer = setInterval(() => {
      setTimeLimit((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isFinished, handleSubmit]);

  useEffect(() => {
    if (!session || isFinished) return;
    if (timeLeft === 0) {
      handleSubmit();
    }
  }, [timeLeft, session, isFinished, handleSubmit]);


  useEffect(() => {
    if (!session) return;
    localStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, session, storageKey]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '150px 20px' }}>
        <Spin size="large" tip="Подготавливаем задания..." />
      </div>
    );
  }

  const currentTask = session.test.tasks[currentTaskIndex];
  const totalTasks = session.test.tasks.length;
  const progressPercent = Math.round(((currentTaskIndex + 1) / totalTasks) * 100);
  const isTimeRunningOut = timeLeft < 60;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            {session.test.title}
          </Title>
        </Col>
        <Col>
          <div 
            style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: isTimeRunningOut ? '#ff4d4f' : 'inherit'
            }}
          >
            {formatTime(timeLeft)}
          </div>
        </Col>
      </Row>

      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between">
          <Text type="secondary">Вопрос {currentTaskIndex + 1} из {totalTasks}</Text>
          <Text type="secondary">Отвечено: {Object.keys(answers).filter(k => answers[k]?.trim()).length} / {totalTasks}</Text>
        </Row>
        <Progress 
          percent={progressPercent} 
          showInfo={false} 
          strokeColor="var(--primary-color)" 
          status={isTimeRunningOut ? "exception" : "active"}
        />
      </div>

      <Card className="shadow-card" bordered={false} style={{ marginBottom: 24 }}>
        <Title level={4}>{currentTask.title}</Title>
        
        <div style={{ margin: '24px 0', fontSize: '16px', lineHeight: 1.6 }}>
          {currentTask.image_data && (
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <img 
                src={currentTask.image_data} 
                alt="Изображение к задаче" 
                style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: 8, border: '1px solid #f0f0f0' }} 
              />
            </div>
          )}
          <LatexRenderer text={currentTask.content} />
        </div>

        <div style={{ marginTop: 32, backgroundColor: '#fafafa', padding: 20, borderRadius: 8 }}>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>
            Ваш ответ:
          </Text>
          <Input.TextArea
            value={answers[currentTask.id] || ''}
            onChange={(e) => setAnswers({ ...answers, [currentTask.id]: e.target.value })}
            placeholder="Используйте LaTeX, например: $a^2 + b^2 = c^2$"
            autoSize={{ minRows: 2, maxRows: 4 }}
            autoFocus
          />

          <div style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Предпросмотр формулы:
            </Text>
            <div style={{ minHeight: 48, padding: '12px 16px', background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              {(answers[currentTask.id] || '').trim()
                ? <LatexRenderer text={answers[currentTask.id]} />
                : <Text type="secondary">Введите выражение, чтобы увидеть его форматирование</Text>
              }
            </div>
          </div>
        </div>
      </Card>

      <Row justify="space-between" align="middle">
        <Col>
          <Button 
            size="large" 
            disabled={currentTaskIndex === 0}
            onClick={() => setCurrentTaskIndex((prev) => prev - 1)}
          >
            Назад
          </Button>
        </Col>
        
        <Col>
          {currentTaskIndex < totalTasks - 1 ? (
            <Button 
              type="primary" 
              size="large" 
              onClick={() => setCurrentTaskIndex((prev) => prev + 1)}
            >
              Далее
            </Button>
          ) : (
            <Button 
              type="primary" 
              size="large" 
              onClick={confirmSubmit}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Завершить тест
            </Button>
          )}
        </Col>
      </Row>

    </div>
  );
};

export default TestTaking;