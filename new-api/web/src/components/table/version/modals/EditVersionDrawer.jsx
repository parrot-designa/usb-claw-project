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

const { Text, Title } = Typography;

const EditVersionDrawer = ({
  visible,
  handleClose,
  editingVersion,
  createVersion,
  updateVersion,
  refresh,
  t,
}) => {
  const [formApi, setFormApi] = useState(null);
  const [loading, setLoading] = useState(false);

  const isEditing = editingVersion && editingVersion.id;

  useEffect(() => {
    if (visible && formApi) {
      if (editingVersion) {
        formApi.setValues({
          version: editingVersion.version || '',
          description: editingVersion.description || '',
        });
      } else {
        formApi.reset();
      }
    }
  }, [visible, editingVersion, formApi]);

  const handleSubmit = async () => {
    const values = formApi.getValues();
    setLoading(true);

    let success = false;
    if (isEditing) {
      success = await updateVersion(
        editingVersion.id,
        values.version,
        values.description
      );
    } else {
      const result = await createVersion(values.version, values.description);
      success = result !== null;
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
            {isEditing ? t('编辑版本') : t('新建版本')}
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
                  <Text className='text-lg font-medium'>{t('版本信息')}</Text>
                  <div className='text-xs text-gray-600'>
                    {isEditing ? t('编辑版本信息') : t('创建新版本')}
                  </div>
                </div>
              </div>

              <Row gutter={12}>
                <Col span={24}>
                  <Form.Input
                    field='version'
                    label={t('版本号')}
                    placeholder={t('如: 1.2.3')}
                    disabled={isEditing}
                    showClear
                  />
                </Col>
                <Col span={24}>
                  <Form.TextArea
                    field='description'
                    label={t('版本说明')}
                    placeholder={t('描述此版本的更新内容')}
                    rows={4}
                    showClear
                  />
                </Col>
              </Row>
            </Card>
          </div>
        </Form>
      </Spin>
    </SideSheet>
  );
};

export default EditVersionDrawer;
