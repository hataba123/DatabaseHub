import React from 'react';
import { Card, Typography, Space } from 'antd';

const { Text, Title } = Typography;

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  tag?: React.ReactNode;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  tag,
  loading = false,
}) => {
  return (
    <Card
      loading={loading}
      styles={{ body: { padding: '16px 20px' } }}
      style={{
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
          {title}
        </Text>
        {icon && (
          <div
            style={{
              padding: 6,
              borderRadius: 6,
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, marginBottom: 4, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 600, color: '#0f172a' }}>
          {value}
        </Title>
        {tag}
      </div>

      {subtitle && (
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {subtitle}
          </Text>
        </div>
      )}
    </Card>
  );
};
