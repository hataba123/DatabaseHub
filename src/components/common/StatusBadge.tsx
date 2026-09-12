import React from 'react';
import { Tag } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { DatabaseStatus } from '@/types/database';

interface StatusBadgeProps {
  status: DatabaseStatus | 'Active' | 'Inactive' | 'Suspended' | 'Success' | 'Failed' | string;
  showIcon?: boolean;
  size?: 'small' | 'middle';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
}) => {
  switch (status) {
    case 'Online':
    case 'Active':
    case 'Success':
      return (
        <Tag
          color="success"
          icon={showIcon ? <CheckCircleOutlined /> : undefined}
          style={{ borderRadius: 4, fontWeight: 500 }}
        >
          {status}
        </Tag>
      );
    case 'Warning':
    case 'Suspended':
      return (
        <Tag
          color="warning"
          icon={showIcon ? <ExclamationCircleOutlined /> : undefined}
          style={{ borderRadius: 4, fontWeight: 500 }}
        >
          {status}
        </Tag>
      );
    case 'Offline':
    case 'Inactive':
    case 'Failed':
      return (
        <Tag
          color="error"
          icon={showIcon ? <CloseCircleOutlined /> : undefined}
          style={{ borderRadius: 4, fontWeight: 500 }}
        >
          {status}
        </Tag>
      );
    default:
      return (
        <Tag style={{ borderRadius: 4, fontWeight: 500 }}>
          {status}
        </Tag>
      );
  }
};
