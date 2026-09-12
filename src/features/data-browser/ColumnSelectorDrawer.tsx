import React from 'react';
import { Drawer, Checkbox, Button, Space, Typography, Divider } from 'antd';
import { EyeOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface ColumnItem {
  key: string;
  title: string;
  visible: boolean;
  required?: boolean;
}

interface ColumnSelectorDrawerProps {
  open: boolean;
  onClose: () => void;
  columns: ColumnItem[];
  onChange: (columns: ColumnItem[]) => void;
  onReset: () => void;
}

export const ColumnSelectorDrawer: React.FC<ColumnSelectorDrawerProps> = ({
  open,
  onClose,
  columns,
  onChange,
  onReset,
}) => {
  const toggleColumn = (key: string) => {
    const updated = columns.map((col) =>
      col.key === key ? { ...col, visible: !col.visible } : col
    );
    onChange(updated);
  };

  const handleSelectAll = (checked: boolean) => {
    const updated = columns.map((col) =>
      col.required ? col : { ...col, visible: checked }
    );
    onChange(updated);
  };

  const visibleCount = columns.filter((c) => c.visible).length;

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EyeOutlined style={{ color: '#1677ff' }} />
          <span>Customize Columns ({visibleCount}/{columns.length})</span>
        </div>
      }
      width={360}
      open={open}
      onClose={onClose}
      extra={
        <Button size="small" onClick={onReset}>
          Reset Default
        </Button>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Toggle visible columns in the data grid. Changes apply immediately.
        </Text>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Checkbox
          indeterminate={visibleCount > 0 && visibleCount < columns.length}
          checked={visibleCount === columns.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
        >
          <Text strong>Select All Columns</Text>
        </Checkbox>
      </div>

      <Divider style={{ margin: '8px 0 16px 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {columns.map((col) => (
          <div
            key={col.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              borderRadius: 4,
              backgroundColor: col.visible ? '#f8fafc' : 'transparent',
            }}
          >
            <Checkbox
              checked={col.visible}
              disabled={col.required}
              onChange={() => toggleColumn(col.key)}
            >
              <span style={{ fontWeight: col.required ? 600 : 400 }}>
                {col.title}
              </span>
            </Checkbox>
            {col.required && (
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Required</span>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Button type="primary" onClick={onClose} style={{ width: '100%' }}>
          Done
        </Button>
      </div>
    </Drawer>
  );
};
