/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useState, useRef } from 'react';
import { Modal, Button, Space, Progress, Typography } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const UploadVersionModal = ({
  visible,
  onCancel,
  record,
  uploadVersionFile,
  refresh,
  t,
}) => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file || !record) return;

    setUploading(true);
    try {
      const success = await uploadVersionFile(record.id, file, setProgress);
      if (success) {
        onCancel();
        setFile(null);
        setProgress(0);
        refresh();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setProgress(0);
    onCancel();
  };

  return (
    <Modal
      title={t('上传发布包')}
      visible={visible}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose}>{t('取消')}</Button>
          <Button
            type="primary"
            onClick={handleUpload}
            disabled={!file || uploading}
            loading={uploading}
          >
            {t('上传')}
          </Button>
        </Space>
      }
    >
      <div className="mb-4">
        <Text type="tertiary">
          {t('版本')}：{record?.version}
        </Text>
      </div>

      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".exe,.zip,.rar,.7z"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <Button onClick={() => fileInputRef.current?.click()}>
          {t('选择文件')}
        </Button>
        {file && (
          <div className="mt-2">
            <Text>{file.name}</Text>
            <br />
            <Text type="tertiary">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </Text>
          </div>
        )}
      </div>

      {uploading && progress > 0 && (
        <Progress percent={progress} showText />
      )}
    </Modal>
  );
};

export default UploadVersionModal;
