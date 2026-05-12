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
  Input,
} from '@douyinfe/semi-ui';
import { IconKey, IconClose, IconPlus } from '@douyinfe/semi-icons';
import { copy, showSuccess } from '../../../../helpers';

const { Text, Title } = Typography;

const AddUSBKeyDrawer = ({
  visible,
  handleClose,
  createUSBKey,
  refresh,
  t,
}) => {
  const formApiRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [createdUSBKey, setCreatedUSBKey] = useState(null);

  const getInitValues = () => ({
    name: '',
    serial_number: '',
    activation_code: '',
  });

  const submit = async (values) => {
    setLoading(true);
    const result = await createUSBKey(
      values.name,
      values.serial_number,
      values.activation_code
    );
    setLoading(false);
    if (result) {
      setCreatedUSBKey(result);
    }
  };

  const handleCancel = () => {
    setCreatedUSBKey(null);
    formApiRef.current?.reset();
    handleClose();
  };

  const handleCopy = async (text, label) => {
    if (await copy(text)) {
      showSuccess(t('已复制：') + label);
    }
  };

  const handleCloseAndRefresh = () => {
    setCreatedUSBKey(null);
    formApiRef.current?.reset();
    refresh();
    handleClose();
  };

  return (
    <SideSheet
      placement={'left'}
      title={
        <Space>
          <Tag color='green' shape='circle'>
            {t('新建')}
          </Tag>
          <Title heading={4} className='m-0'>
            {t('添加U盘')}
          </Title>
        </Space>
      }
      bodyStyle={{ padding: '0' }}
      visible={visible}
      width={500}
      footer={
        !createdUSBKey ? (
          <div className='flex justify-end bg-white'>
            <Space>
              <Button
                theme='solid'
                onClick={() => formApiRef.current?.submitForm()}
                icon={<IconPlus />}
                loading={loading}
              >
                {t('创建')}
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
        ) : (
          <div className='flex justify-end bg-white'>
            <Button
              theme='solid'
              type='primary'
              onClick={handleCloseAndRefresh}
            >
              {t('完成')}
            </Button>
          </div>
        )
      }
      closeIcon={null}
      onCancel={() => handleCancel()}
    >
      <Spin spinning={loading}>
        <Form
          initValues={getInitValues()}
          getFormApi={(api) => (formApiRef.current = api)}
          onSubmit={submit}
          onSubmitFail={(errs) => {
            const first = Object.values(errs)[0];
            if (first) {
              // Error handling done in form
            }
          }}
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
                    {t('创建新的U盘密钥')}
                  </div>
                </div>
              </div>

              <Row gutter={12}>
                <Col span={24}>
                  <Form.Input
                    field='name'
                    label={t('名称')}
                    placeholder={t('请输入U盘名称')}
                    rules={[{ required: true, message: t('请输入U盘名称') }]}
                    showClear
                    disabled={!!createdUSBKey}
                  />
                </Col>
                <Col span={24}>
                  <Form.Input
                    field='serial_number'
                    label={t('序列号')}
                    placeholder={t('请输入序列号（可选，不填则自动生成）')}
                    showClear
                    disabled={!!createdUSBKey}
                  />
                </Col>
                <Col span={24}>
                  <Form.Input
                    field='activation_code'
                    label={t('激活码')}
                    placeholder={t('请输入激活码（可选，不填则自动生成）')}
                    showClear
                    disabled={!!createdUSBKey}
                  />
                </Col>
              </Row>
            </Card>

            {createdUSBKey && (
              <Card className='!rounded-2xl shadow-sm border-0 mt-4'>
                <div className='flex items-center mb-2'>
                  <Avatar size='small' color='green' className='mr-2 shadow-md'>
                    <IconKey size={16} />
                  </Avatar>
                  <div>
                    <Text className='text-lg font-medium'>
                      {t('激活码信息')}
                    </Text>
                    <div className='text-xs text-gray-600'>
                      {t('请妥善保存以下信息')}
                    </div>
                  </div>
                </div>

                <Row gutter={12}>
                  <Col span={24}>
                    <div className='mb-4'>
                      <Text type='tertiary' className='mb-1 block'>
                        {t('序列号')}
                      </Text>
                      <Input
                        value={createdUSBKey.serial_number}
                        readOnly
                        onClick={() =>
                          handleCopy(
                            createdUSBKey.serial_number,
                            t('序列号')
                          )
                        }
                        suffix={
                          <Button
                            size='small'
                            onClick={() =>
                              handleCopy(
                                createdUSBKey.serial_number,
                                t('序列号')
                              )
                            }
                          >
                            {t('复制')}
                          </Button>
                        }
                      />
                    </div>
                  </Col>
                  <Col span={24}>
                    <div className='mb-4'>
                      <Text type='tertiary' className='mb-1 block'>
                        {t('激活码')}
                      </Text>
                      <Input
                        value={createdUSBKey.activation_code}
                        readOnly
                        onClick={() =>
                          handleCopy(
                            createdUSBKey.activation_code,
                            t('激活码')
                          )
                        }
                        suffix={
                          <Button
                            size='small'
                            onClick={() =>
                              handleCopy(
                                createdUSBKey.activation_code,
                                t('激活码')
                              )
                            }
                          >
                            {t('复制')}
                          </Button>
                        }
                      />
                    </div>
                  </Col>
                </Row>
              </Card>
            )}
          </div>
        </Form>
      </Spin>
    </SideSheet>
  );
};

export default AddUSBKeyDrawer;