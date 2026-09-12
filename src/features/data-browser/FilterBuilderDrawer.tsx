import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Button,
  Space,
  Select,
  Input,
  InputNumber,
  DatePicker,
  Typography,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { FilterCondition, FilterOperator } from '@/types/table';
import dayjs from 'dayjs';

const { Text } = Typography;

interface FilterBuilderDrawerProps {
  open: boolean;
  onClose: () => void;
  conditions: FilterCondition[];
  onApply: (conditions: FilterCondition[]) => void;
}

interface FieldDef {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date';
}

const availableFields: FieldDef[] = [
  { key: 'MaNhanVien', label: 'MaNhanVien', type: 'string' },
  { key: 'Name', label: 'Name (Họ và Tên)', type: 'string' },
  { key: 'Xuong', label: 'Xuong (Xưởng)', type: 'number' },
  { key: 'DeptName0', label: 'DeptName0 (Phòng/Tổ)', type: 'string' },
  { key: 'Status', label: 'Status (Trạng thái)', type: 'string' },
  { key: 'IsDisplay', label: 'IsDisplay (Hiển thị)', type: 'boolean' },
  { key: 'BirthDate', label: 'BirthDate (Ngày sinh)', type: 'date' },
  { key: 'SalaryGrade', label: 'SalaryGrade (Bậc lương)', type: 'string' },
  { key: 'Tel', label: 'Tel (Số điện thoại)', type: 'string' },
  { key: 'Address', label: 'Address (Tỉnh/Thành)', type: 'string' },
];

export const FilterBuilderDrawer: React.FC<FilterBuilderDrawerProps> = ({
  open,
  onClose,
  conditions: initialConditions,
  onApply,
}) => {
  const [localConditions, setLocalConditions] = useState<FilterCondition[]>([]);

  useEffect(() => {
    if (open) {
      setLocalConditions(
        initialConditions.length > 0
          ? [...initialConditions]
          : [
              {
                id: `fc-${Date.now()}`,
                field: 'Xuong',
                operator: 'eq',
                value: 2,
              },
            ]
      );
    }
  }, [open, initialConditions]);

  const addCondition = () => {
    setLocalConditions([
      ...localConditions,
      {
        id: `fc-${Date.now()}-${Math.random()}`,
        field: 'Name',
        operator: 'contains',
        value: '',
      },
    ]);
  };

  const removeCondition = (id: string) => {
    setLocalConditions(localConditions.filter((c) => c.id !== id));
  };

  const updateCondition = (
    id: string,
    key: keyof FilterCondition,
    val: any
  ) => {
    setLocalConditions(
      localConditions.map((c) => {
        if (c.id === id) {
          const updated = { ...c, [key]: val };
          // If field changed, reset operator to default suitable for that field type
          if (key === 'field') {
            const fieldDef = availableFields.find((f) => f.key === val);
            if (fieldDef?.type === 'number') {
              updated.operator = 'eq';
              updated.value = 1;
            } else if (fieldDef?.type === 'boolean') {
              updated.operator = 'isTrue';
              updated.value = true;
            } else if (fieldDef?.type === 'date') {
              updated.operator = 'dateEquals';
              updated.value = '';
            } else {
              updated.operator = 'contains';
              updated.value = '';
            }
          }
          return updated;
        }
        return c;
      })
    );
  };

  const handleApply = () => {
    // Filter out conditions with empty string or missing values
    const valid = localConditions.filter((c) => {
      if (['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(c.operator)) {
        return true;
      }
      return c.value !== undefined && c.value !== '';
    });
    onApply(valid);
    onClose();
  };

  const handleReset = () => {
    setLocalConditions([]);
    onApply([]);
    onClose();
  };

  const getOperatorsForField = (fieldName: string) => {
    const fieldDef = availableFields.find((f) => f.key === fieldName);
    const type = fieldDef?.type || 'string';

    switch (type) {
      case 'number':
        return [
          { label: '= (Equals)', value: 'eq' },
          { label: '!= (Not Equals)', value: 'neq' },
          { label: '> (Greater Than)', value: 'gt' },
          { label: '>= (Greater or Equal)', value: 'gte' },
          { label: '< (Less Than)', value: 'lt' },
          { label: '<= (Less or Equal)', value: 'lte' },
          { label: 'Between', value: 'between' },
        ];
      case 'boolean':
        return [
          { label: 'Is True', value: 'isTrue' },
          { label: 'Is False', value: 'isFalse' },
        ];
      case 'date':
        return [
          { label: 'Equals Date', value: 'dateEquals' },
          { label: 'Before', value: 'dateBefore' },
          { label: 'After', value: 'dateAfter' },
          { label: 'Between', value: 'dateBetween' },
        ];
      case 'string':
      default:
        return [
          { label: 'Contains', value: 'contains' },
          { label: 'Equals', value: 'equals' },
          { label: 'Not Equals', value: 'notEquals' },
          { label: 'Starts With', value: 'startsWith' },
          { label: 'Ends With', value: 'endsWith' },
          { label: 'Is Empty', value: 'isEmpty' },
          { label: 'Is Not Empty', value: 'isNotEmpty' },
        ];
    }
  };

  const renderValueInput = (cond: FilterCondition) => {
    const fieldDef = availableFields.find((f) => f.key === cond.field);
    const type = fieldDef?.type || 'string';

    if (['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(cond.operator)) {
      return (
        <span style={{ fontSize: 12, color: '#94a3b8', paddingLeft: 8 }}>
          (No value needed)
        </span>
      );
    }

    if (type === 'number') {
      if (cond.operator === 'between') {
        return (
          <Space>
            <InputNumber
              placeholder="Min"
              value={cond.value}
              onChange={(val) => updateCondition(cond.id, 'value', val)}
              style={{ width: 90 }}
            />
            <span>-</span>
            <InputNumber
              placeholder="Max"
              value={cond.value2}
              onChange={(val) => updateCondition(cond.id, 'value2', val)}
              style={{ width: 90 }}
            />
          </Space>
        );
      }
      return (
        <InputNumber
          placeholder="Number value"
          value={cond.value}
          onChange={(val) => updateCondition(cond.id, 'value', val)}
          style={{ width: '100%' }}
        />
      );
    }

    if (type === 'date') {
      return (
        <DatePicker
          placeholder="Select date"
          value={cond.value ? dayjs(cond.value) : null}
          onChange={(_, dateStr) => updateCondition(cond.id, 'value', dateStr)}
          style={{ width: '100%' }}
        />
      );
    }

    return (
      <Input
        placeholder="Enter text..."
        value={cond.value || ''}
        onChange={(e) => updateCondition(cond.id, 'value', e.target.value)}
      />
    );
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FilterOutlined style={{ color: '#1677ff' }} />
          <span>Advanced Table Filter Builder</span>
        </div>
      }
      width={560}
      open={open}
      onClose={onClose}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Reset
          </Button>
          <Button type="primary" onClick={handleApply}>
            Apply Filters
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Construct complex multi-column filter expressions evaluated dynamically on table data.
        </Text>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {localConditions.map((cond, idx) => (
          <div
            key={cond.id}
            style={{
              padding: 12,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong style={{ fontSize: 12, color: '#64748b' }}>
                Condition #{idx + 1}
              </Text>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => removeCondition(cond.id)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <Text style={{ fontSize: 11, color: '#64748b' }}>Field</Text>
                <Select
                  value={cond.field}
                  onChange={(val) => updateCondition(cond.id, 'field', val)}
                  style={{ width: '100%', marginTop: 2 }}
                  options={availableFields.map((f) => ({ label: f.label, value: f.key }))}
                />
              </div>

              <div>
                <Text style={{ fontSize: 11, color: '#64748b' }}>Operator</Text>
                <Select
                  value={cond.operator}
                  onChange={(val) => updateCondition(cond.id, 'operator', val as FilterOperator)}
                  style={{ width: '100%', marginTop: 2 }}
                  options={getOperatorsForField(cond.field)}
                />
              </div>
            </div>

            <div>
              <Text style={{ fontSize: 11, color: '#64748b' }}>Value</Text>
              <div style={{ marginTop: 2 }}>{renderValueInput(cond)}</div>
            </div>
          </div>
        ))}

        {localConditions.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: 6,
              border: '1px dashed #cbd5e1',
            }}
          >
            <Text type="secondary">No active filter conditions.</Text>
          </div>
        )}

        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={addCondition}
          style={{ width: '100%', marginTop: 8 }}
        >
          Add Condition
        </Button>
      </div>

      <Divider style={{ margin: '24px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" onClick={handleApply}>
          Apply Filters ({localConditions.length})
        </Button>
      </div>
    </Drawer>
  );
};
