import React, { useState } from 'react';
import { Button, message, Tooltip } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';

interface JsonViewerProps {
  data: any;
  maxHeight?: number | string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  maxHeight = 350,
}) => {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    message.success('JSON copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'relative' }}>
      <Tooltip title={copied ? 'Copied' : 'Copy JSON'}>
        <Button
          size="small"
          icon={copied ? <CheckOutlined style={{ color: '#10b981' }} /> : <CopyOutlined />}
          onClick={handleCopy}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            background: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            color: '#cbd5e1',
          }}
        />
      </Tooltip>
      <pre
        className="font-mono"
        style={{
          margin: 0,
          padding: 16,
          background: '#0f172a',
          color: '#38bdf8',
          borderRadius: 6,
          fontSize: 12,
          lineHeight: 1.5,
          maxHeight,
          overflow: 'auto',
          border: '1px solid #1e293b',
        }}
      >
        <code>{jsonString}</code>
      </pre>
    </div>
  );
};
