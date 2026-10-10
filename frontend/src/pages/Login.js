import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthContext } from '../context/AuthContext';
import api from '../services/api';


const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      const userData = response.data.user;
      login(response.data.token, userData);

      if (userData.role === 'ADMIN') {
        navigate('/admin/stats');
      } else if (userData.role === 'TEACHER') {
        navigate('/profile');
      } else if (userData.role === 'STUDENT') {
        navigate('/student/topics');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при входе');
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Войти</h2>
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          {error}
          {error.toLowerCase().includes('подтвердите') && (
            <div style={{ marginTop: 8 }}>
              <Link to={`/verify-email?email=${encodeURIComponent(email.trim())}`}>Перейти к подтверждению</Link>
            </div>
          )}
        </div>
      )}
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
          <label className="form-label">Пароль</label>
          <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
          />
        </div>
        <button className="form-button" type="submit">Войти</button>
      </form>
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
      </div>
    </div>
  );
};

export default Login;
