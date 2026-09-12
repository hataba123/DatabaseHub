import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Switch,
  Button,
  Tag,
  Space,
  Typography,
  message,
} from 'antd';
import { SaveOutlined, KeyOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { DatabaseColumn } from '@/types/table';

const { Text } = Typography;

interface DynamicRowModalProps {
  open: boolean;
  onClose: () => void;
  record: Record<string, any> | null;
  columns: DatabaseColumn[];
  primaryKeys?: string[];
  tableName?: string;
  onSave: (values: Record<string, any>, isEdit: boolean, originalRecord: Record<string, any> | null) => Promise<void>;
}

export const DynamicRowModal: React.FC<DynamicRowModalProps> = ({
  open,
  onClose,
  record,
  columns,
  primaryKeys = [],
  tableName = 'Table',
  onSave,
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!record;

  const effectivePkCols = useMemo(() => {
    if (primaryKeys.length > 0) return primaryKeys;
    return columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
  }, [primaryKeys, columns]);

  // Determine which columns are editable/writable
  const formColumns = useMemo(() => {
    return columns.filter((col) => {
      // Always exclude RowVersion and Computed columns
      if (col.isRowVersion || col.isComputed) return false;
      // Exclude identity column on Create mode if auto-generated
      if (!isEdit && col.isIdentity) return false;
      return true;
    });
  }, [columns, isEdit]);

  useEffect(() => {
    if (open) {
      if (record) {
        const initialValues: Record<string, any> = { ...record };

        // Convert date columns to Dayjs
        columns.forEach((col) => {
          const rawVal = record[col.name];
          if (rawVal && isDateType(col.dataType)) {
            const parsed = dayjs(rawVal);
            initialValues[col.name] = parsed.isValid() ? parsed : null;
          } else if (isBitType(col.dataType)) {
            initialValues[col.name] = Boolean(rawVal);
          }
        });

        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
        // Set defaults for boolean or specified default values
        const defaults: Record<string, any> = {};
        columns.forEach((col) => {
          if (isBitType(col.dataType)) {
            defaults[col.name] = false;
          }
        });
        form.setFieldsValue(defaults);
      }
    }
  }, [open, record, columns, form]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const rawValues = await form.validateFields();
      const formatted: Record<string, any> = {};

      Object.entries(rawValues).forEach(([key, val]) => {
        const col = columns.find((c) => c.name === key);
        if (!col) {
          formatted[key] = val;
          return;
        }

        if (dayjs.isDayjs(val)) {
          if (isDateTimeType(col.dataType)) {
            formatted[key] = val.format('YYYY-MM-DDTHH:mm:ss');
          } else {
            formatted[key] = val.format('YYYY-MM-DD');
          }
        } else {
          formatted[key] = val;
        }
      });

      await onSave(formatted, isEdit, record);
      message.success(isEdit ? 'Bản ghi đã được cập nhật thành công.' : 'Bản ghi mới đã được tạo thành công.');
      onClose();
    } catch (err: any) {
      if (err?.errorFields) {
        // Ant Design form validation error
        return;
      }
      message.error(err?.response?.data?.message || err?.message || 'Thao tác không thành công.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pkSummary = useMemo(() => {
    if (!record) return '';
    return effectivePkCols.map((pk) => `${pk}: ${record[pk]}`).join(', ');
  }, [record, effectivePkCols]);

  return (
    <Modal
      title={
        <Space size={8}>
          {isEdit ? (
            <>
              <span>Chỉnh sửa bản ghi</span>
              <Tag color="blue">{pkSummary || tableName}</Tag>
            </>
          ) : (
            <>
              <span>Thêm dòng mới vào</span>
              <Tag color="green">dbo.{tableName}</Tag>
            </>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={720}
      destroyOnClose
      footer={[
        <Button key="cancel" icon={<CloseOutlined />} onClick={onClose} disabled={isSubmitting}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SaveOutlined />}
          loading={isSubmitting}
          onClick={handleSubmit}
        >
          {isEdit ? 'Lưu thay đổi' : 'Tạo bản ghi'}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 16px' }}>
          {formColumns.map((col) => {
            const isPk = effectivePkCols.includes(col.name);
            const isRequired = !col.nullable && !col.hasDefault && !col.isIdentity;
            const isFullWidth = isTextAreaType(col);

            return (
              <div
                key={col.name}
                style={{
                  gridColumn: isFullWidth ? 'span 2' : 'span 1',
                }}
              >
                <Form.Item
                  name={col.name}
                  valuePropName={isBitType(col.dataType) ? 'checked' : 'value'}
                  label={
                    <Space size={6}>
                      <Text strong style={{ fontSize: 13 }}>
                        {col.name}
                      </Text>
                      {isPk && (
                        <Tag color="gold" icon={<KeyOutlined />} style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>
                          PK
                        </Tag>
                      )}
                      {col.isIdentity && (
                        <Tag color="purple" style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>
                          Identity
                        </Tag>
                      )}
                      {col.isForeignKey && (
                        <Tag color="cyan" style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>
                          FK
                        </Tag>
                      )}
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        ({col.dataType})
                      </Text>
                    </Space>
                  }
                  rules={[
                    {
                      required: isRequired && (!isEdit || !isPk),
                      message: `Trường ${col.name} không được để trống`,
                    },
                    ...(col.maxLength && col.maxLength > 0 && isStringType(col.dataType)
                      ? [
                          {
                            max: col.maxLength,
                            message: `Độ dài tối đa là ${col.maxLength} ký tự`,
                          },
                        ]
                      : []),
                  ]}
                >
                  {renderInputField(col, isEdit && isPk)}
                </Form.Item>
              </div>
            );
          })}
        </div>
      </Form>
    </Modal>
  );
};

// Helper function to render appropriate form input based on SQL datatype
function renderInputField(col: DatabaseColumn, disabled: boolean) {
  const dt = col.dataType.toLowerCase();

  // Boolean / bit
  if (isBitType(dt)) {
    return <Switch checkedChildren="True" unCheckedChildren="False" disabled={disabled} />;
  }

  // Date and DateTime
  if (isDateTimeType(dt)) {
    return (
      <DatePicker
        showTime
        format="YYYY-MM-DD HH:mm:ss"
        style={{ width: '100%' }}
        disabled={disabled}
        placeholder="Chọn ngày giờ"
      />
    );
  }

  if (isDateType(dt)) {
    return (
      <DatePicker
        format="YYYY-MM-DD"
        style={{ width: '100%' }}
        disabled={disabled}
        placeholder="Chọn ngày"
      />
    );
  }

  // Integer numbers
  if (dt === 'int' || dt === 'bigint' || dt === 'smallint' || dt === 'tinyint') {
    return (
      <InputNumber
        style={{ width: '100%' }}
        precision={0}
        disabled={disabled}
        placeholder={`Nhập số nguyên (${col.name})`}
      />
    );
  }

  // Decimals & Floats
  if (
    dt.includes('decimal') ||
    dt.includes('numeric') ||
    dt.includes('float') ||
    dt.includes('money') ||
    dt.includes('real')
  ) {
    return (
      <InputNumber
        style={{ width: '100%' }}
        step={0.01}
        disabled={disabled}
        placeholder={`Nhập số thập phân (${col.name})`}
      />
    );
  }

  // UniqueIdentifier / GUID
  if (dt === 'uniqueidentifier') {
    return (
      <Input
        disabled={disabled}
        placeholder="00000000-0000-0000-0000-000000000000"
      />
    );
  }

  // Long text / Textarea
  if (isTextAreaType(col)) {
    return (
      <Input.TextArea
        rows={3}
        disabled={disabled}
        placeholder={`Nhập văn bản cho ${col.name}`}
        maxLength={col.maxLength && col.maxLength > 0 ? col.maxLength : undefined}
      />
    );
  }

  // Default text input
  return (
    <Input
      disabled={disabled}
      placeholder={`Nhập ${col.name}`}
      maxLength={col.maxLength && col.maxLength > 0 ? col.maxLength : undefined}
    />
  );
}

function isBitType(dataType: string): boolean {
  return dataType.toLowerCase() === 'bit';
}

function isDateType(dataType: string): boolean {
  const dt = dataType.toLowerCase();
  return dt === 'date' || dt.includes('datetime') || dt.includes('smalldatetime');
}

function isDateTimeType(dataType: string): boolean {
  const dt = dataType.toLowerCase();
  return dt.includes('datetime') || dt.includes('smalldatetime');
}

function isStringType(dataType: string): boolean {
  const dt = dataType.toLowerCase();
  return dt.includes('char') || dt.includes('text');
}

function isTextAreaType(col: DatabaseColumn): boolean {
  const dt = col.dataType.toLowerCase();
  if (dt.includes('max') || dt.includes('text')) return true;
  if (col.maxLength && col.maxLength > 200) return true;
  return false;
}
