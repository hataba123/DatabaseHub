import React, { useState } from 'react';
import { Table, TablePaginationConfig, Alert } from 'antd';
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import { EmptyState } from '@/components/common/EmptyState';

export type TableDensity = 'compact' | 'normal' | 'comfortable';

interface DataTableProps<T = any> {
  columns: ColumnsType<T>;
  dataSource: T[];
  loading?: boolean;
  rowKey: string | ((record: T) => string);
  pagination?: TablePaginationConfig | false;
  rowSelection?: TableRowSelection<T>;
  onRowClick?: (record: T) => void;
  density?: TableDensity;
  scrollX?: number | string;
  scrollY?: number | string;
  emptyText?: string;
  error?: Error | null;
  onRetry?: () => void;
  onChange?: (pagination: TablePaginationConfig, filters: any, sorter: any) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  dataSource,
  loading = false,
  rowKey,
  pagination,
  rowSelection,
  onRowClick,
  density = 'normal',
  scrollX = '100%',
  scrollY,
  emptyText,
  error,
  onRetry,
  onChange,
}: DataTableProps<T>) {
  const getDensityClass = () => {
    switch (density) {
      case 'compact':
        return 'compact-table';
      case 'comfortable':
        return 'comfortable-table';
      case 'normal':
      default:
        return 'normal-table';
    }
  };

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="Error Loading Data"
        description={error.message || 'An unexpected error occurred while fetching table records.'}
        action={
          onRetry ? (
            <button
              onClick={onRetry}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#1677ff',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Retry
            </button>
          ) : undefined
        }
        style={{ margin: '16px 0', borderRadius: 8 }}
      />
    );
  }

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      <Table<T>
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        rowKey={rowKey}
        onChange={onChange}
        pagination={
          pagination === false
            ? false
            : {
                showSizeChanger: true,
                pageSizeOptions: ['10', '25', '50', '100'],
                showTotal: (total, range) =>
                  `Showing ${range[0]}-${range[1]} of ${new Intl.NumberFormat('en-US').format(total)}`,
                size: density === 'compact' ? 'small' : 'default',
                ...pagination,
              }
        }
        rowSelection={rowSelection}
        scroll={{ x: scrollX, y: scrollY }}
        className={getDensityClass()}
        onRow={(record) => ({
          onClick: () => {
            if (onRowClick) onRowClick(record);
          },
          style: {
            cursor: onRowClick ? 'pointer' : 'default',
          },
        })}
        locale={{
          emptyText: <EmptyState title="No Records" description={emptyText || 'No data available in this table view.'} />,
        }}
        size={density === 'compact' ? 'small' : density === 'comfortable' ? 'large' : 'middle'}
      />
    </div>
  );
}
