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

import React, { useEffect } from 'react';
import { Modal, Form, Input, Switch, Button } from '@douyinfe/semi-ui';
import { USB_KEY_STATUS } from '../../../../constants/usb_key.constants';

const EditUSBKeyModal = ({
  visible,
  handleClose,
  editingUSBKey,
  createUSBKey,
  updateUSBKey,
  refresh,
  t,
}) => {
  const [formApi, setFormApi] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const isEditing = editingUSBKey && editingUSBKey.id;

  useEffect(() => {
    if (visible && formApi) {
      if (editingUSBKey) {
        formApi.setValues({
          name: editingUSBKey.name || '',
          status: editingUSBKey.status === USB_KEY_STATUS.ENABLED,
        });
      } else {
        formApi.reset();
      }
    }
  }, [visible, editingUSBKey, formApi]);

  const handleSubmit = async () => {
    const values = formApi.getValues();
    setLoading(true);

    let success = false;
    if (isEditing) {
      success = await updateUSBKey(
        editingUSBKey.id,
        values.name,
        values.status ? USB_KEY_STATUS.ENABLED : USB_KEY_STATUS.DISABLED
      );
    } else {
      success = await createUSBKey(values.name);
    }

    setLoading(false);
    if (success) {
      handleClose();
      refresh();
    }
  };

  return (
    <Modal
      title={isEditing ? t('编辑U盘') : t('新建U盘')}
      visible={visible}
      onCancel={handleClose}
      footer={null}
    >
      <Form getFormApi={(api) => setFormApi(api)}>
        <Form.Input
          field='name'
          label={t('名称')}
          placeholder={t('请输入名称')}
          rules={[{ required: true, message: t('请输入名称') }]}
        />
        {isEditing && (
          <Form.Switch
            field='status'
            label={t('启用状态')}
            checkedText={t('启用')}
            uncheckedText={t('禁用')}
          />
        )}
        <div className='flex gap-2 justify-end mt-4'>
          <Button onClick={handleClose}>{t('取消')}</Button>
          <Button type='primary' onClick={handleSubmit} loading={loading}>
            {t('保存')}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default EditUSBKeyModal;