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
import { VersionStatusPublished, VersionStatusUnpublished } from '../../../constants';

export const getVersionsColumns = ({
  t,
  openEdit,
  openDelete,
  openUpload,
  copyText,
}) => {
  return [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
    },
    {
      title: t('版本号'),
      dataIndex: 'version',
      key: 'version',
      width: 120,
      render: (text, record) => (
        <span className='font-mono font-semibold'>{text}</span>
      ),
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        if (status === VersionStatusPublished) {
          return <Tag color='green'>{t('已发布')}</Tag>;
        }
        return <Tag color='grey'>{t('未发布')}</Tag>;
      },
    },
    {
      title: t('文件名'),
      dataIndex: 'file_name',
      key: 'file_name',
      width: 200,
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: t('文件大小'),
      dataIndex: 'file_size',
      key: 'file_size',
      width: 120,
      render: (size) => {
        if (!size) return '-';
        if (size < 1024) return size + ' B';
        if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
        if (size < 1024 * 1024 * 1024)
          return (size / (1024 * 1024)).toFixed(2) + ' MB';
        return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      },
    },
    {
      title: t('版本说明'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: t('创建人'),
      dataIndex: 'created_by',
      key: 'created_by',
      width: 100,
      render: (text) => text || '-',
    },
    {
      title: t('创建时间'),
      dataIndex: 'created_time',
      key: 'created_time',
      width: 170,
      render: (time) => {
        if (!time) return '-';
        return new Date(time * 1000).toLocaleString();
      },
    },
    {
      title: t('发布时间'),
      dataIndex: 'published_time',
      key: 'published_time',
      width: 170,
      render: (time) => {
        if (!time) return '-';
        return new Date(time * 1000).toLocaleString();
      },
    },
    {
      title: '',
      dataIndex: 'operate',
      key: 'operate',
      fixed: 'right',
      width: 280,
      render: (_, record) => {
        const isPublished = record.status === VersionStatusPublished;
        return (
          <Space>
            <Button type='tertiary' size='small' onClick={() => openUpload(record)}>
              {t('上传')}
            </Button>
            <Button type='tertiary' size='small' onClick={() => openEdit(record)}>
              {t('编辑')}
            </Button>
            {isPublished ? (
              <Button
                type='tertiary'
                size='small'
                onClick={() => openDelete(record, 'unpublish')}
              >
                {t('取消发布')}
              </Button>
            ) : (
              <Button
                type='tertiary'
                size='small'
                onClick={() => openDelete(record, 'publish')}
              >
                {t('发布')}
              </Button>
            )}
            <Button
              type='tertiary'
              size='small'
              danger
              onClick={() => openDelete(record, 'delete')}
            >
              {t('删除')}
            </Button>
          </Space>
        );
      },
    },
  ];
};