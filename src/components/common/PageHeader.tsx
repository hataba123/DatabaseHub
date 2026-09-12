import React from 'react';
import { Breadcrumb, Typography, Space } from 'antd';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;

export interface BreadcrumbLink {
  title: React.ReactNode;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbLink[];
  extra?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  extra,
  badge,
}) => {
  return (
    <div style={{ marginBottom: 20 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 8, fontSize: 12 }}
          items={breadcrumbs.map((crumb) => ({
            title: crumb.path ? <Link to={crumb.path}>{crumb.title}</Link> : crumb.title,
          }))}
        />
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Space align="center" size={10}>
            <Title
              level={3}
              style={{
                margin: 0,
                fontWeight: 600,
                color: '#0f172a',
                fontSize: 20,
              }}
            >
              {title}
            </Title>
            {badge}
          </Space>
          {subtitle && (
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {subtitle}
              </Text>
            </div>
          )}
        </div>
        {extra && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{extra}</div>}
      </div>
    </div>
  );
};
