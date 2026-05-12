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

import React from 'react';
import { Modal, Button } from '@douyinfe/semi-ui';

const DeleteUSBKeyModal = ({
  visible,
  onCancel,
  record,
  deleteUSBKey,
  refresh,
  t,
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await deleteUSBKey(record.id);
    setLoading(false);
    onCancel();
    refresh();
  };

  return (
    <Modal
      title={t('确认删除')}
      visible={visible}
      onCancel={onCancel}
      footer={
        <div className='flex gap-2 justify-end'>
          <Button onClick={onCancel}>{t('取消')}</Button>
          <Button type='danger' onClick={handleDelete} loading={loading}>
            {t('删除')}
          </Button>
        </div>
      }
    >
      <p>
        {t('确定要删除')} <strong>{record?.name}</strong> {t('吗？')}
      </p>
      <p style={{ color: 'var(--semi-color-text-2)', marginTop: 8 }}>
        {t('删除后无法恢复')}
      </p>
    </Modal>
  );
};

export default DeleteUSBKeyModal;