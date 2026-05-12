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

import React, { useState } from 'react';
import { Modal, Button, Space } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { showError } from '../../../../helpers';

const DeleteVersionModal = ({
  visible,
  onCancel,
  record,
  deleteVersion,
  publishVersion,
  unpublishVersion,
  refresh,
  t,
}) => {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState('delete');

  const handleOk = async () => {
    setLoading(true);
    try {
      let success;
      switch (actionType) {
        case 'publish':
          success = await publishVersion(record.id);
          break;
        case 'unpublish':
          success = await unpublishVersion(record.id);
          break;
        case 'delete':
        default:
          success = await deleteVersion(record.id);
          break;
      }
      if (success) {
        onCancel();
        refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (actionType) {
      case 'publish':
        return t('确认发布');
      case 'unpublish':
        return t('确认取消发布');
      case 'delete':
      default:
        return t('确认删除');
    }
  };

  const getContent = () => {
    switch (actionType) {
      case 'publish':
        return t('确定要发布版本 {version} 吗？发布后用户可以下载此版本。', { version: record?.version });
      case 'unpublish':
        return t('确定要取消发布版本 {version} 吗？取消后用户将无法下载此版本。', { version: record?.version });
      case 'delete':
      default:
        return t('确定要删除版本 {version} 吗？此操作不可恢复。', { version: record?.version });
    }
  };

  return (
    <Modal
      title={getTitle()}
      visible={visible}
      onCancel={onCancel}
      footer={
        <Space>
          <Button onClick={onCancel}>{t('取消')}</Button>
          <Button type="danger" onClick={handleOk} loading={loading}>
            {t('确认')}
          </Button>
        </Space>
      }
    >
      <p>{getContent()}</p>
    </Modal>
  );
};

export default DeleteVersionModal;
