import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PASSWORD_REQUIREMENTS_TEXT, validateEmail, validateFullName, validatePassword } from '../utils/validators';



const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    invite_code: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateFullName(formData.full_name)) {
      setError('Введите корректное ФИО (минимум 2 слова, только буквы/пробелы/дефисы, 3-50 символов).');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Введите корректный email (формат name@example.com, до 255 символов).');
      return;
    }

    if (!validatePassword(formData.password)) {
      setError(PASSWORD_REQUIREMENTS_TEXT);
      return;
    }

    if (formData.password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (!formData.invite_code || !formData.invite_code.trim()) {
      setError('Введите код приглашения преподавателя');
      return;
    }

    try {
      const response = await api.post('/auth/register', formData);
      setSuccess(response.data.message);
      setConfirmPassword('');
      setTimeout(() => navigate(`/verify-email?email=${encodeURIComponent(formData.email.trim())}`), 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при регистрации');
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Регистрация</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: '10px' }}>{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">ФИО</label>
          <input
            className="form-input"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Пароль</label>
          <input
            className="form-input"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <small style={{ color: '#666' }}>{PASSWORD_REQUIREMENTS_TEXT}</small>
        </div>
        <div className="form-group">
          <label className="form-label">Подтвердите пароль</label>
          <input
            className="form-input"
            type="password"
            name="confirm_password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Код приглашения (от учителя)</label>
          <input
            className="form-input"
            name="invite_code"
            value={formData.invite_code}
            onChange={handleChange}
            placeholder="Например: MATH123"
            required
          />
        </div>
        <button className="form-button" type="submit">Зарегистрироваться</button>
      </form>
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
      </div>
    </div>
  );
};

export default Register;
