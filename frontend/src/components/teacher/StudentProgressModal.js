import { message, Modal } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0,0,0,0.45)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
};

const modalStyle = {
  backgroundColor: '#fff',
  width: '960px',
  maxHeight: '90vh',
  overflowY: 'auto',
  borderRadius: '14px',
  padding: '28px',
  boxShadow: '0 12px 40px rgba(15,23,42,0.25)'
};

const tabStyle = (active) => ({
  padding: '10px 20px',
  cursor: 'pointer',
  borderBottom: active ? '3px solid #4f46e5' : '3px solid transparent',
  color: active ? '#1d1f2c' : '#7a7a92',
  fontWeight: active ? 600 : 500
});

const StudentProgressModal = ({ visible, studentId, onClose, onShowSessionAnswers }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [error, setError] = useState(null);
  const [cancelLoadingId, setCancelLoadingId] = useState(null);

  const fetchProgress = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/teacher/student/${studentId}/progress`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось загрузить прогресс');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (!visible || !studentId) return;
    fetchProgress();
  }, [visible, studentId, fetchProgress]);

  const handleCancelAssignment = (sessionId) => {
    Modal.confirm({
      title: 'Отмена назначения',
      content: 'Вы уверены, что хотите отменить это назначение? Ученик потеряет доступ к тесту.',
      okText: 'Да, отменить',
      cancelText: 'Нет',
      onOk: async () => {
        setCancelLoadingId(sessionId);
        try {
          await api.delete(`/tests/assign/${sessionId}`);
          message.success('Назначение отменено');
          await fetchProgress();
        } catch (err) {
          message.error(err.response?.data?.message || 'Не удалось отменить назначение');
        } finally {
          setCancelLoadingId(null);
        }
      },
    });
  };

  if (!visible) return null;

  const summary = data?.summary || {};
  const solvedTasks = data?.solved_tasks || [];
  const testAttempts = data?.test_attempts || [];

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Прогресс ученика</h3>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>{data?.student?.full_name} · {data?.student?.email}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка...</div>
        ) : error ? (
          <div style={{ color: '#c62828', padding: '20px', textAlign: 'center' }}>{error}</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
              {[
                { label: 'Решено задач', value: summary.solved_tasks },
                { label: 'Попыток', value: summary.attempts },
                { label: 'Успех', value: `${summary.accuracy_percent ?? 0}%` },
                { label: 'Тесты (сдано)', value: summary.tests_passed },
                { label: 'Тесты (не сдано)', value: summary.tests_failed },
                { label: 'Средний балл', value: `${summary.avg_score_percent ?? 0}%` }
              ].map((metric) => (
                <div key={metric.label} className="card" style={{ flex: '1 1 150px', padding: '15px' }}>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af' }}>{metric.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px', color: '#111827' }}>{metric.value ?? '—'}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '30px', borderBottom: '1px solid #e5e7eb', marginBottom: '15px' }}>
              <div style={tabStyle(activeTab === 'tasks')} onClick={() => setActiveTab('tasks')}>Решённые задачи</div>
              <div style={tabStyle(activeTab === 'tests')} onClick={() => setActiveTab('tests')}>Тесты</div>
            </div>

            {activeTab === 'tasks' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                    <th style={{ padding: '10px' }}>Задача</th>
                    <th style={{ padding: '10px' }}>Тема</th>
                    <th style={{ padding: '10px' }}>Попыток</th>
                    <th style={{ padding: '10px' }}>Дата решения</th>
                  </tr>
                </thead>
                <tbody>
                  {solvedTasks.map(task => (
                    <tr key={task.task_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: 500 }}>{task.title}</td>
                      <td style={{ padding: '10px' }}>{task.topic?.title || '—'}</td>
                      <td style={{ padding: '10px' }}>{task.attempts}</td>
                      <td style={{ padding: '10px' }}>{task.solved_at ? new Date(task.solved_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                  {!solvedTasks.length && (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Ещё нет решённых задач.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                    <th style={{ padding: '10px' }}>Тест</th>
                    <th style={{ padding: '10px' }}>Дата</th>
                    <th style={{ padding: '10px' }}>Статус</th>
                    <th style={{ padding: '10px' }}>Баллы</th>
                    <th style={{ padding: '10px' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {testAttempts.map(attempt => (
                    <tr key={attempt.session_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: 500 }}>{attempt.test_title}</td>
                      <td style={{ padding: '10px' }}>{attempt.date ? new Date(attempt.date).toLocaleString() : '—'}</td>
                      <td style={{ padding: '10px' }}>
                        {attempt.is_passed ? (
                          <span style={{ padding: '4px 12px', borderRadius: '12px', backgroundColor: '#e8f5e9', color: '#2e7d32' }}>Сдан</span>
                        ) : attempt.status === 'completed' ? (
                          <span style={{ padding: '4px 12px', borderRadius: '12px', backgroundColor: '#fdecea', color: '#c62828' }}>Не сдан</span>
                        ) : attempt.status === 'closed' ? (
                          <span style={{ padding: '4px 12px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#b45309' }}>Закрыт</span>
                        ) : attempt.status === 'pending' ? (
                          <span style={{ padding: '4px 12px', borderRadius: '12px', backgroundColor: '#e0e7ff', color: '#3730a3' }}>Назначен</span>
                        ) : (
                          <span style={{ padding: '4px 12px', borderRadius: '12px', backgroundColor: '#fff7ed', color: '#c2410c' }}>В процессе</span>
                        )}
                      </td>
                      <td style={{ padding: '10px' }}>{attempt.score} / {attempt.max_score}</td>
                      <td style={{ padding: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          disabled={!attempt.session_id}
                          onClick={() => onShowSessionAnswers(attempt.session_id)}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer' }}
                        >
                          Детали
                        </button>
                        {attempt.status === 'pending' && (
                          <button
                            onClick={() => handleCancelAssignment(attempt.session_id)}
                            disabled={cancelLoadingId === attempt.session_id}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #facc15', backgroundColor: '#fff8db', cursor: 'pointer' }}
                          >
                            {cancelLoadingId === attempt.session_id ? 'Отмена...' : 'Отменить'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!testAttempts.length && (
                    <tr>
                      <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Пока нет данных по тестам.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentProgressModal;
