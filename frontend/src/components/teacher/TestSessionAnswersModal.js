import LatexRenderer from '../LatexRenderer';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
};

const modalStyle = {
  backgroundColor: '#fff',
  width: '900px',
  maxHeight: '85vh',
  overflowY: 'auto',
  borderRadius: '10px',
  padding: '25px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
};

const TestSessionAnswersModal = ({ visible, loading, data, onClose }) => {
  if (!visible) return null;

  const session = data?.session;
  const test = data?.test;
  const student = data?.student;
  const answers = data?.answers || [];

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Ответы ученика</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка...</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div className="card" style={{ flex: '1 1 250px', padding: '15px' }}>
                <p style={{ margin: 0, color: '#6c757d' }}>Ученик</p>
                <strong>{student?.full_name}</strong>
                <div style={{ fontSize: '12px', color: '#888' }}>{student?.email}</div>
              </div>
              <div className="card" style={{ flex: '1 1 250px', padding: '15px' }}>
                <p style={{ margin: 0, color: '#6c757d' }}>Тест</p>
                <strong>{test?.title}</strong>
                <div style={{ fontSize: '12px', color: '#888' }}>Порог: {test?.passing_score ?? test?.max_score} / Макс: {test?.max_score}</div>
              </div>
              <div className="card" style={{ flex: '1 1 250px', padding: '15px' }}>
                <p style={{ margin: 0, color: '#6c757d' }}>Результат</p>
                <strong>{session?.score} / {test?.max_score}</strong>
                <div style={{ fontSize: '12px', color: session?.is_passed ? '#2e7d32' : '#c62828' }}>
                  {session?.is_passed ? 'Сдан' : 'Не сдан'}
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f7fb', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Задача</th>
                  <th style={{ padding: '10px' }}>Ответ ученика</th>
                  <th style={{ padding: '10px' }}>Правильный ответ</th>
                  <th style={{ padding: '10px' }}>Статус</th>
                </tr>
              </thead>
              <tbody>
                {answers.map(answer => (
                  <tr key={answer.task_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontWeight: 500 }}>
                      <LatexRenderer text={answer.title} />
                    </td>
                    <td style={{ padding: '10px', color: '#3f51b5' }}>
                      {answer.student_answer ? <LatexRenderer text={answer.student_answer} /> : '—'}
                    </td>
                    <td style={{ padding: '10px', color: '#555' }}>
                      <LatexRenderer text={answer.correct_answer} />
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '4px 12px', borderRadius: '12px', backgroundColor: answer.is_correct ? '#e8f5e9' : '#fdecea', color: answer.is_correct ? '#2e7d32' : '#c62828' }}>
                        {answer.is_correct ? 'Верно' : 'Неверно'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!answers.length && (
                  <tr>
                    <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Нет ответов для отображения.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

export default TestSessionAnswersModal;
