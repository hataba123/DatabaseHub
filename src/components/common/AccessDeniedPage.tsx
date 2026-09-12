import React from 'react';
import { Result, Button, Tag, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons';
import { useAppStore } from '@/stores/useAppStore';

interface AccessDeniedPageProps {
  requiredPermission?: string;
  message?: string;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  requiredPermission,
  message,
}) => {
  const navigate = useNavigate();
  const { language } = useAppStore();

  const isVi = language === 'vi';

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', padding: 24 }}>
      <Result
        status="403"
        title="403"
        subTitle={
          message ||
          (isVi
            ? 'Bạn không có quyền thực hiện hành động này hoặc xem tài nguyên được yêu cầu. Vui lòng liên hệ Quản trị viên hệ thống để được cấp quyền.'
            : 'You do not have the required permissions to access this page or perform this action. Please contact your system administrator.')
        }
        extra={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {requiredPermission && (
              <Tag color="orange" style={{ padding: '4px 10px', fontSize: 13, fontFamily: 'monospace' }}>
                {isVi ? 'Quyền cần thiết:' : 'Required Permission:'} <strong>{requiredPermission}</strong>
              </Tag>
            )}
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                {isVi ? 'Quay lại' : 'Go Back'}
              </Button>
              <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/dashboard')}>
                {isVi ? 'Về Trang chủ' : 'Dashboard'}
              </Button>
            </Space>
          </div>
        }
      />
    </div>
  );
};
