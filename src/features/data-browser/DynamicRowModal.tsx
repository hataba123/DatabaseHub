import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  Button,
  message,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface DynamicRowModalProps {
  open: boolean;
  onClose: () => void;
  record: Record<string, any> | null;
  onSave: (values: any) => Promise<void>;
}

export const DynamicRowModal: React.FC<DynamicRowModalProps> = ({
  open,
  onClose,
  record,
  onSave,
}) => {
  const [form] = Form.useForm();
  const isEdit = !!record;

  useEffect(() => {
    if (open) {
      if (record) {
        form.setFieldsValue({
          ...record,
          BirthDate: record.BirthDate ? dayjs(record.BirthDate) : null,
          JoinedDate: record.JoinedDate ? dayjs(record.JoinedDate) : null,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          MaNhanVien: `AD${Math.floor(39100 + Math.random() * 900)}`,
          Xuong: 2,
          Status: 'Đang Làm',
          IsDisplay: true,
          SalaryGrade: 'A2',
        });
      }
    }
  }, [open, record, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formatted = {
        ...values,
        BirthDate: values.BirthDate ? dayjs(values.BirthDate).format('YYYY-MM-DD') : undefined,
        JoinedDate: values.JoinedDate ? dayjs(values.JoinedDate).format('YYYY-MM-DD') : undefined,
      };
      await onSave(formatted);
      message.success(isEdit ? 'Record updated successfully' : 'Record created successfully');
      onClose();
    } catch (err) {
      // validation error handled by antd
    }
  };

  return (
    <Modal
      title={isEdit ? `Edit Record: ${record?.MaNhanVien}` : 'Create New Row'}
      open={open}
      onCancel={onClose}
      width={600}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>
          {isEdit ? 'Save Changes' : 'Create Record'}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="MaNhanVien"
            label="Mã Nhân Viên (PK)"
            rules={[{ required: true, message: 'Mã nhân viên is required' }]}
          >
            <Input disabled={isEdit} placeholder="e.g. AD38877" />
          </Form.Item>

          <Form.Item
            name="Name"
            label="Họ và Tên"
            rules={[{ required: true, message: 'Họ tên is required' }]}
          >
            <Input placeholder="e.g. Lê Thành Ký" />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <Form.Item
            name="Xuong"
            label="Xưởng (1-5)"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="DeptName0"
            label="Phòng / Nhóm"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="Nhóm SC14-AD">Nhóm SC14-AD</Select.Option>
              <Select.Option value="Nhóm SC15-AD">Nhóm SC15-AD</Select.Option>
              <Select.Option value="Tổ Cơ Khí 1">Tổ Cơ Khí 1</Select.Option>
              <Select.Option value="Tổ Hàn Cắt 2">Tổ Hàn Cắt 2</Select.Option>
              <Select.Option value="Phòng Kỹ Thuật">Phòng Kỹ Thuật</Select.Option>
              <Select.Option value="Phòng KCS / QC">Phòng KCS / QC</Select.Option>
              <Select.Option value="Bộ Phận Kho Vận">Bộ Phận Kho Vận</Select.Option>
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="BirthDate" label="Ngày sinh">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="Tel" label="Số điện thoại">
            <Input placeholder="0901234567" />
          </Form.Item>
        </div>

        <Form.Item name="Address" label="Địa chỉ">
          <Input placeholder="e.g. TP. Hồ Chí Minh" />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Form.Item name="Status" label="Tình trạng">
            <Select>
              <Select.Option value="Đang Làm">Đang Làm</Select.Option>
              <Select.Option value="Nghỉ Phép">Nghỉ Phép</Select.Option>
              <Select.Option value="Thử Việc">Thử Việc</Select.Option>
              <Select.Option value="Đã Nghỉ">Đã Nghỉ</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="SalaryGrade" label="Bậc lương">
            <Select>
              <Select.Option value="A1">A1</Select.Option>
              <Select.Option value="A2">A2</Select.Option>
              <Select.Option value="A3">A3</Select.Option>
              <Select.Option value="B1">B1</Select.Option>
              <Select.Option value="B2">B2</Select.Option>
              <Select.Option value="C1">C1</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="IsDisplay" label="Hiển thị" valuePropName="checked">
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};
