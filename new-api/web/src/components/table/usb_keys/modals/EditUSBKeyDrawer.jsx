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

import React, { useEffect, useState } from 'react';
import {
  Button,
  SideSheet,
  Space,
  Spin,
  Typography,
  Card,
  Tag,
  Avatar,
  Form,
  Row,
  Col,
} from '@douyinfe/semi-ui';
import { IconKey, IconClose } from '@douyinfe/semi-icons';
import { USB_KEY_STATUS } from '../../../../constants/usb_key.constants';

const { Text, Title } = Typography;

const EditUSBKeyDrawer = ({
  visible,
  handleClose,
  editingUSBKey,
  createUSBKey,
  updateUSBKey,
  refresh,
  t,
}) => {
  const [formApi, setFormApi] = useState(null);
  const [loading, setLoading] = useState(false);

  const isEditing = editingUSBKey && editingUSBKey.id;

  const isActivated = editingUSBKey && editingUSBKey.is_activated;

  useEffect(() => {
    if (visible && formApi) {
      if (editingUSBKey) {
        formApi.setValues({
          name: editingUSBKey.name || '',
          serial_number: editingUSBKey.serial_number || '',
          activation_code: editingUSBKey.activation_code || '',
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
        values.serial_number,
        values.activation_code,
        values.status ? USB_KEY_STATUS.ENABLED : USB_KEY_STATUS.DISABLED
      );
    } else {
      success = await createUSBKey(
        values.serial_number,
        values.activation_code
      );
    }

    setLoading(false);
    if (success) {
      handleClose();
      refresh();
    }
  };

  const handleCancel = () => {
    formApi?.reset();
    handleClose();
  };

  return (
    <SideSheet
      placement={'left'}
      title={
        <Space>
          <Tag color={isEditing ? 'blue' : 'green'} shape='circle'>
            {isEditing ? t('编辑') : t('新建')}
          </Tag>
          <Title heading={4} className='m-0'>
            {isEditing ? t('编辑U盘') : t('新建U盘')}
          </Title>
        </Space>
      }
      bodyStyle={{ padding: '0' }}
      visible={visible}
      width={500}
      footer={
        <div className='flex justify-end bg-white'>
          <Space>
            <Button
              theme='solid'
              onClick={handleSubmit}
              loading={loading}
            >
              {t('保存')}
            </Button>
            <Button
              theme='light'
              type='primary'
              onClick={handleCancel}
              icon={<IconClose />}
            >
              {t('取消')}
            </Button>
          </Space>
        </div>
      }
      closeIcon={null}
      onCancel={handleCancel}
    >
      <Spin spinning={loading}>
        <Form
          getFormApi={(api) => setFormApi(api)}
          onSubmit={handleSubmit}
        >
          <div className='p-2'>
            <Card className='!rounded-2xl shadow-sm border-0'>
              <div className='flex items-center mb-2'>
                <Avatar size='small' color='blue' className='mr-2 shadow-md'>
                  <IconKey size={16} />
                </Avatar>
                <div>
                  <Text className='text-lg font-medium'>{t('U盘信息')}</Text>
                  <div className='text-xs text-gray-600'>
                    {isEditing ? t('编辑U盘信息') : t('创建新的U盘密钥')}
                  </div>
                </div>
              </div>

              <Row gutter={12}>
                {isEditing && (
                  <Col span={24}>
                    <Form.Input
                      field='name'
                      label={t('名称')}
                      placeholder={t('请输入名称')}
                      showClear
                    />
                  </Col>
                )}
                {!isEditing && (
                  <Col span={24}>
                    <Form.Input
                      field='activation_code'
                      label={t('激活码')}
                      placeholder={t('请输入激活码')}
                      showClear
                    />
                  </Col>
                )}
                {isEditing && (
                  <>
                    <Col span={24}>
                      <Form.Input
                        field='serial_number'
                        label={t('序列号')}
                        placeholder={t('请输入序列号')}
                        showClear
                        disabled={isActivated}
                      />
                    </Col>
                    <Col span={24}>
                      <Form.Input
                        field='activation_code'
                        label={t('激活码')}
                        placeholder={t('请输入激活码')}
                        showClear
                        disabled={isActivated}
                      />
                    </Col>
                    <Col span={24}>
                      <Form.Switch
                        field='status'
                        label={t('启用状态')}
                      />
                    </Col>
                  </>
                )}
              </Row>
            </Card>
          </div>
        </Form>
      </Spin>
    </SideSheet>
  );
};

export default EditUSBKeyDrawer;