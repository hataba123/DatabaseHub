import React from 'react';
import { Empty, Button, Typography } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Found',
  description = 'There are no records matching your criteria or currently available.',
  actionText,
  onAction,
  icon = <DatabaseOutlined style={{ fontSize: 40, color: '#94a3b8' }} />,
}) => {
  return (
    <div
      style={{
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: '#ffffff',
        borderRadius: 8,
        border: '1px dashed #e2e8f0',
      }}
    >
      <div style={{ marginBottom: 16 }}>{icon}</div>
      <Title level={4} style={{ margin: 0, color: '#1e293b', fontSize: 16, fontWeight: 600 }}>
        {title}
      </Title>
      <Text type="secondary" style={{ marginTop: 6, maxWidth: 400, fontSize: 13 }}>
        {description}
      </Text>
      {actionText && onAction && (
        <Button type="primary" onClick={onAction} style={{ marginTop: 20 }}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
