import { message, Modal } from 'antd';
import { useEffect, useState } from 'react';
import StudentProgressModal from '../../components/teacher/StudentProgressModal';
import TestSessionAnswersModal from '../../components/teacher/TestSessionAnswersModal';
import api from '../../services/api';

const TeacherStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [answersModalVisible, setAnswersModalVisible] = useState(false);
  const [answersData, setAnswersData] = useState(null);
  const [answersLoading, setAnswersLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки учеников', err);
    } finally {
      setLoading(false);
    }
  };

   const handleDetach = (studentId) => {
      Modal.confirm({
        title: 'Завершение обучения',
        content: 'Вы уверены, что хотите завершить обучение для этого ученика? Он потеряет доступ к аккаунту.',
        okText: 'Да, завершить',
        cancelText: 'Отмена',
        onOk: async () => {
          try {
            await api.delete(`/students/${studentId}/detach`);
            message.success('Обучение ученика завершено');
            fetchStudents();
          } catch (err) {
            message.error(err.response?.data?.message || 'Не удалось завершить обучение');
          }
        },
        okButtonProps: { danger: true },
      });
    };

  const openProgress = (studentId) => {
    setSelectedStudentId(studentId);
  };

  const closeProgress = () => {
    setSelectedStudentId(null);
  };

  const handleShowAnswers = async (sessionId) => {
    setAnswersLoading(true);
    setAnswersModalVisible(true);
    try {
      const res = await api.get(`/teacher/test-session/${sessionId}/answers`);
      setAnswersData(res.data);
    } catch (err) {
      setAnswersData(null);
      alert(err.response?.data?.message || 'Не удалось загрузить ответы');
    } finally {
      setAnswersLoading(false);
    }
  };

  const closeAnswersModal = () => {
    setAnswersModalVisible(false);
    setAnswersData(null);
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="teacher-dashboard">


      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Мои ученики ({students.length})</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>ФИО</th>
              <th style={{ padding: '10px' }}>Email</th>
              <th style={{ padding: '10px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', fontWeight: 500 }}>{student.full_name}</td>
                <td style={{ padding: '10px', color: '#555' }}>{student.email}</td>
                <td style={{ padding: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={() => openProgress(student.id)} className="form-button" style={{ padding: '6px 10px' }}>Прогресс</button>
                  <button onClick={() => handleDetach(student.id)} style={{ padding: '6px 10px', backgroundColor: '#ffe8cc', border: '1px solid #ffb55b', borderRadius: '4px', cursor: 'pointer' }}>Завершить обучение</button>
                </td>
              </tr>
            ))}
            {!students.length && (
              <tr>
                <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Ученики не найдены</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <StudentProgressModal
        visible={!!selectedStudentId}
        studentId={selectedStudentId}
        onClose={closeProgress}
        onShowSessionAnswers={handleShowAnswers}
      />

      <TestSessionAnswersModal
        visible={answersModalVisible}
        loading={answersLoading}
        data={answersData}
        onClose={closeAnswersModal}
      />
    </div>
  );
};

export default TeacherStudents;
