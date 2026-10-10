import {
  Button,
  Card,
  DatePicker,
  Form,
  Select,
  Spin,
  Table,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const { Title, Text } = Typography;

const MIN_ASSIGNMENT_OFFSET_HOURS = 4;

const TestAssignment = () => {
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [currentTime, setCurrentTime] = useState(dayjs());
  
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minAvailableMoment = useMemo(() => currentTime.add(MIN_ASSIGNMENT_OFFSET_HOURS, 'hour'), [currentTime]);

  const disabledDate = (current) => {
    if (!current) return false;
    return current.endOf('day').isBefore(minAvailableMoment.startOf('day'));
  };

  const disabledDateTime = (current) => {
    if (!current) return {};
    if (current.isBefore(minAvailableMoment, 'day')) {
      const fullRange = Array.from({ length: 60 }, (_, i) => i);
      return {
        disabledHours: () => Array.from({ length: 24 }, (_, i) => i),
        disabledMinutes: () => fullRange,
        disabledSeconds: () => fullRange,
      };
    }
    if (!current.isSame(minAvailableMoment, 'day')) {
      return {};
    }

    const hourLimit = minAvailableMoment.hour();
    const minuteLimit = minAvailableMoment.minute();
    const secondLimit = minAvailableMoment.second();

    return {
      disabledHours: () => Array.from({ length: hourLimit }, (_, i) => i),
      disabledMinutes: (selectedHour) =>
        selectedHour === hourLimit
          ? Array.from({ length: minuteLimit }, (_, i) => i)
          : [],
      disabledSeconds: (selectedHour, selectedMinute) =>
        selectedHour === hourLimit && selectedMinute === minuteLimit
          ? Array.from({ length: secondLimit }, (_, i) => i)
          : [],
    };
  };

  const fetchData = async () => {
    try {
      const [testsRes, studentsRes] = await Promise.all([
        api.get('/tests/my'),
        api.get('/students'),
      ]);
      setTests(testsRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (err) {
      console.error('Ошибка загрузки данных', err);
      message.error('Не удалось загрузить списки тестов и учеников');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (values) => {
    if (selectedStudents.length === 0) {
      message.warning('Выберите хотя бы одного ученика из списка');
      return;
    }

    try {
      const deadline = values.available_until?.toISOString();
      await api.post('/tests/assign', {
        test_id: values.test_id,
        student_ids: selectedStudents,

        available_until: deadline, 
      });
      
      message.success('Тест успешно назначен выбранным ученикам!');
      
      form.resetFields();
      setSelectedStudents([]);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Ошибка при назначении теста');
    }
  };

  const studentColumns = [
    {
      title: 'ФИО ученика',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedStudents,
    onChange: (newSelectedRowKeys) => {
      setSelectedStudents(newSelectedRowKeys);
    },
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" tip="Загрузка данных..." />
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>
      <Title level={2} className="page-title">
        Назначение тестов
      </Title>

      <Card className="shadow-card" bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAssign}
        >

          <Form.Item
            name="test_id"
            label={<Text strong>Выберите тест</Text>}
            rules={[{ required: true, message: 'Пожалуйста, выберите тест' }]}
          >
            <Select
              size="large"
              placeholder="Нажмите, чтобы выбрать тест..."
              options={tests.map((test) => ({ value: test.id, label: test.title }))}
              showSearch
              filterOption={(input, option) => 
                option.label.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="available_until"
            label={<Text strong>Доступен до</Text>}
            rules={[
              { required: true, message: 'Пожалуйста, укажите крайний срок' },
              () => ({
                validator(_, value) {
                  if (!value) return Promise.resolve();
                  if (value.isBefore(minAvailableMoment)) {
                    return Promise.reject(new Error(`Можно выбрать не ранее ${minAvailableMoment.format('DD.MM.YYYY HH:mm')}`));
                  }
                  return Promise.resolve();
                },
              })
            ]}

          >
            <DatePicker 
              showTime 
              size="large" 
              style={{ width: '100%' }} 
              placeholder="Выберите дату и время"
              format="DD.MM.YYYY HH:mm"
              disabledDate={disabledDate}
              disabledTime={disabledDateTime}
            />
          </Form.Item>

          <div style={{ marginBottom: 24 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Выберите учеников
            </Text>
            <Table
              rowSelection={rowSelection}
              columns={studentColumns}
              dataSource={students}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
              bordered
              locale={{ emptyText: 'У вас пока нет привязанных учеников' }}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              Выбрано учеников: {selectedStudents.length}
            </Text>
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              block
            >
              Назначить тест
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default TestAssignment;