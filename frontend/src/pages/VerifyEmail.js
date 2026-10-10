import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { validateEmail } from '../utils/validators';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    const normalizedEmail = email.trim();
    if (!validateEmail(normalizedEmail)) {
      setError('Введите корректный email.');
      return;
    }
    try {
      const response = await api.post('/auth/verify-email/resend', { email: normalizedEmail });
      setMessage(response.data.message);
      setError('');
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при отправке кода');
      setMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim();
    if (!validateEmail(normalizedEmail)) {
      setError('Введите корректный email.');
      return;
    }
    try {
      const response = await api.post('/auth/verify-email', { email: normalizedEmail, code });
      setMessage(response.data.message);
      setError('');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось подтвердить email');
      setMessage('');
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Подтверждение email</h2>
      {message && <div style={{ color: 'green', marginBottom: 15 }}>{message}</div>}
      {error && <div style={{ color: 'red', marginBottom: 15 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Код подтверждения</label>
          <input
            className="form-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            required
          />
        </div>
        <button className="form-button" type="submit">Подтвердить</button>
      </form>
      <button
        type="button"
        className="form-button"
        style={{ marginTop: 10, backgroundColor: '#f0f0f0', color: '#333' }}
        onClick={handleResend}
        disabled={cooldown > 0}
      >
        {cooldown > 0 ? `Отправить код повторно (${cooldown}с)` : 'Отправить код повторно'}
      </button>
      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
        <p>Уже подтвердили? <Link to="/login">Войдите</Link>.</p>
      </div>
    </div>
  );
};

export default VerifyEmail;
