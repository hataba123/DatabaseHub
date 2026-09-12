import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ConfigProvider,
  theme,
  Card,
  Form,
  Input,
  Button,
  Checkbox,
  Alert,
  Divider,
  Typography,
  Tag,
  Space,
  Row,
  Col,
} from 'antd';
import {
  DatabaseOutlined,
  UserOutlined,
  LockOutlined,
  LoginOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';

const { Title, Text } = Typography;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const { language, setLanguage } = useAppStore();

  const isVi = language === 'vi';
  const [form] = Form.useForm();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (values: any) => {
    setErrorMessage(null);
    try {
      await login(values.username.trim(), values.password);
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg =
        err.message ||
        (isVi
          ? 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.'
          : 'Login failed. Please check your credentials.');
      setErrorMessage(msg);
    }
  };

  const handleSelectDemo = (u: string, p: string) => {
    form.setFieldsValue({ username: u, password: p });
    setErrorMessage(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)',
        position: 'relative',
        padding: '24px 16px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Background ambient lighting */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          background: 'rgba(16, 185, 129, 0.08)',
          borderRadius: '50%',
          filter: 'blur(100px)',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}
      />

      {/* Language Switcher in top right */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          zIndex: 10,
        }}
      >
        <Space
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(51, 65, 85, 0.6)',
            borderRadius: 8,
            padding: '3px 6px',
          }}
        >
          <GlobalOutlined style={{ color: '#94a3b8', fontSize: 13, marginLeft: 4 }} />
          <Button
            size="small"
            type={language === 'vi' ? 'primary' : 'text'}
            onClick={() => setLanguage('vi')}
            style={{
              height: 24,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: language === 'vi' ? '#10b981' : 'transparent',
              color: language === 'vi' ? '#ffffff' : '#94a3b8',
            }}
          >
            VI
          </Button>
          <Button
            size="small"
            type={language === 'en' ? 'primary' : 'text'}
            onClick={() => setLanguage('en')}
            style={{
              height: 24,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: language === 'en' ? '#10b981' : 'transparent',
              color: language === 'en' ? '#ffffff' : '#94a3b8',
            }}
          >
            EN
          </Button>
        </Space>
      </div>

      {/* Center Login Box with Ant Design Dark Theme */}
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#10b981',
            colorBgContainer: '#0f172a',
            colorBgElevated: '#1e293b',
            colorBorder: '#334155',
            colorText: '#f8fafc',
            colorTextSecondary: '#94a3b8',
            borderRadius: 8,
          },
        }}
      >
        <div style={{ width: '100%', maxWidth: 440, zIndex: 10 }}>
          <Card
            bordered
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(20px)',
              borderColor: 'rgba(51, 65, 85, 0.8)',
              borderRadius: 16,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              padding: '12px 6px',
            }}
          >
            {/* Logo and App Title */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  margin: '0 auto 12px auto',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
                  color: '#ffffff',
                  fontSize: 26,
                }}
              >
                <DatabaseOutlined />
              </div>
              <Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.3px', color: '#ffffff' }}>
                DB<span style={{ color: '#34d399' }}>Hub</span> Enterprise
              </Title>
              <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, display: 'block' }}>
                {isVi
                  ? 'Nền tảng Quản trị SQL Server Doanh nghiệp'
                  : 'Enterprise SQL Server Database Management Platform'}
              </Text>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <Alert
                message={errorMessage}
                type="error"
                showIcon
                closable
                onClose={() => setErrorMessage(null)}
                style={{ marginBottom: 20 }}
              />
            )}

            {/* Login Form */}
            <Form
              form={form}
              layout="vertical"
              initialValues={{ username: 'admin', remember: true }}
              onFinish={handleSubmit}
              requiredMark={false}
            >
              <Form.Item
                label={<span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{isVi ? 'Tên đăng nhập' : 'Username'}</span>}
                name="username"
                rules={[{ required: true, message: isVi ? 'Vui lòng nhập tên đăng nhập' : 'Please enter username' }]}
              >
                <Input
                  size="large"
                  prefix={<UserOutlined style={{ color: '#64748b' }} />}
                  placeholder="admin"
                  autoComplete="username"
                  style={{ backgroundColor: '#020617', borderColor: '#334155' }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{isVi ? 'Mật khẩu' : 'Password'}</span>}
                name="password"
                rules={[{ required: true, message: isVi ? 'Vui lòng nhập mật khẩu' : 'Please enter password' }]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined style={{ color: '#64748b' }} />}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ backgroundColor: '#020617', borderColor: '#334155' }}
                />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox style={{ color: '#94a3b8', fontSize: 12 }}>
                    {isVi ? 'Ghi nhớ phiên đăng nhập' : 'Remember session'}
                  </Checkbox>
                </Form.Item>
                <Text style={{ color: '#64748b', fontSize: 12, cursor: 'pointer' }} title="Liên hệ Admin để mở khóa">
                  {isVi ? 'Quên mật khẩu?' : 'Forgot password?'}
                </Text>
              </div>

              <Form.Item style={{ marginBottom: 8 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={isLoading}
                  icon={<LoginOutlined />}
                  style={{
                    backgroundColor: '#10b981',
                    borderColor: '#10b981',
                    fontWeight: 600,
                    height: 42,
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                  }}
                >
                  {isVi ? 'Đăng nhập' : 'Sign In'}
                </Button>
              </Form.Item>
            </Form>

            {/* Quick Demo Accounts Selection */}
            <Divider style={{ borderColor: '#334155', margin: '20px 0 16px 0' }}>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {isVi ? 'Tài khoản thử nghiệm nhanh' : 'Demo Test Accounts'}
              </span>
            </Divider>

            <Row gutter={[8, 8]}>
              <Col span={12}>
                <div
                  onClick={() => handleSelectDemo('admin', 'Admin@123456')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#020617',
                    border: '1px solid #1e293b',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.background = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1e293b';
                    e.currentTarget.style.background = '#020617';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#34d399' }}>admin</span>
                    <Tag color="green" style={{ fontSize: 10, margin: 0, lineHeight: '16px', height: 18 }}>*</Tag>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Super Admin</div>
                </div>
              </Col>

              <Col span={12}>
                <div
                  onClick={() => handleSelectDemo('loi', 'Password123!')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#020617',
                    border: '1px solid #1e293b',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.background = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1e293b';
                    e.currentTarget.style.background = '#020617';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa' }}>loi</span>
                    <Tag color="blue" style={{ fontSize: 10, margin: 0, lineHeight: '16px', height: 18 }}>DBA</Tag>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>DB Admin + Audit</div>
                </div>
              </Col>

              <Col span={12}>
                <div
                  onClick={() => handleSelectDemo('editor', 'Password123!')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#020617',
                    border: '1px solid #1e293b',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#f59e0b';
                    e.currentTarget.style.background = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1e293b';
                    e.currentTarget.style.background = '#020617';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>editor</span>
                    <Tag color="orange" style={{ fontSize: 10, margin: 0, lineHeight: '16px', height: 18 }}>Edit</Tag>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Data Editor</div>
                </div>
              </Col>

              <Col span={12}>
                <div
                  onClick={() => handleSelectDemo('viewer', 'Password123!')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#020617',
                    border: '1px solid #1e293b',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#a855f7';
                    e.currentTarget.style.background = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1e293b';
                    e.currentTarget.style.background = '#020617';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#c084fc' }}>viewer</span>
                    <Tag color="purple" style={{ fontSize: 10, margin: 0, lineHeight: '16px', height: 18 }}>View</Tag>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Data Viewer</div>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      </ConfigProvider>
    </div>
  );
};
