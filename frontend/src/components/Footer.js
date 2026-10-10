import { Col, Row, Typography } from 'antd';

const { Text } = Typography;

const Footer = () => {
  return (
    <footer style={{ backgroundColor: '#f0f2f5', padding: '20px', marginTop: 'auto' }}>
      <Row justify="center" align="middle" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Col>
          <Text type="secondary">© {new Date().getFullYear()} EduTask. Все права защищены.</Text>
        </Col>
      </Row>
    </footer>
  );
};

export default Footer;