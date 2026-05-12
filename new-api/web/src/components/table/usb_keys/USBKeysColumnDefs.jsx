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
import { Tag, Button, Space } from '@douyinfe/semi-ui';
import { timestamp2string } from '../../../helpers';
import { USB_KEY_STATUS_MAP } from '../../../constants/usb_key.constants';

export const getUSBKeysColumns = ({
  t,
  openEdit,
  openDelete,
  copyText,
  setEditingUSBKey,
  setShowEdit,
}) => {
  return [
    {
      title: t('序号'),
      key: 'index',
      width: 80,
      render: (text, record, index) => index + 1,
    },
    {
      title: t('名称'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('序列号'),
      dataIndex: 'serial_number',
      key: 'serial_number',
      width: 200,
      ellipsis: true,
    },
    {
      title: t('激活码'),
      dataIndex: 'activation_code',
      key: 'activation_code',
      width: 200,
      ellipsis: true,
    },
    {
      title: t('是否激活'),
      dataIndex: 'is_activated',
      key: 'is_activated',
      render: (text) => {
        return text ? (
          <Tag color='green' shape='circle'>
            {t('已激活')}
          </Tag>
        ) : (
          <Tag color='grey' shape='circle'>
            {t('未激活')}
          </Tag>
        );
      },
    },
    {
      title: t('关联用户'),
      dataIndex: 'username',
      key: 'username',
      render: (text, record) => {
        return !text || record.user_id === 0 ? t('无') : text;
      },
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      render: (text) => {
        const statusConfig = USB_KEY_STATUS_MAP[text];
        if (statusConfig) {
          return (
            <Tag color={statusConfig.color} shape='circle'>
              {t(statusConfig.text)}
            </Tag>
          );
        }
        return <Tag color='black' shape='circle'>{t('未知')}</Tag>;
      },
    },
    {
      title: t('创建时间'),
      dataIndex: 'created_time',
      key: 'created_time',
      render: (text) => {
        return <>{timestamp2string(text)}</>;
      },
    },
    {
      title: t('激活时间'),
      dataIndex: 'activated_time',
      key: 'activated_time',
      render: (text) => {
        return !text || text === 0 ? t('无') : <>{timestamp2string(text)}</>;
      },
    },
    {
      title: '',
      dataIndex: 'operate',
      key: 'operate',
      fixed: 'right',
      width: 200,
      render: (text, record) => {
        return (
          <Space>
            <Button
              type='tertiary'
              size='small'
              onClick={() => copyText(record.serial_number)}
            >
              {t('复制序列号')}
            </Button>
            <Button
              type='tertiary'
              size='small'
              onClick={() => copyText(record.activation_code)}
            >
              {t('复制激活码')}
            </Button>
            <Button
              type='tertiary'
              size='small'
              danger
              onClick={() => openDelete(record)}
            >
              {t('删除')}
            </Button>
          </Space>
        );
      },
    },
  ];
};