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
import { Badge, Typography, Tag, Button } from '@douyinfe/semi-ui';
import { User, Coins } from 'lucide-react';
import { timestamp2string } from '../../../helpers';

const { Text } = Typography;

// Status mapping config
const STATUS_CONFIG = {
  success: { type: 'success', key: '成功' },
  pending: { type: 'warning', key: '待支付' },
  failed: { type: 'danger', key: '失败' },
  expired: { type: 'danger', key: '已过期' },
};

// Payment method mapping
const PAYMENT_METHOD_MAP = {
  stripe: 'Stripe',
  creem: 'Creem',
  waffo: 'Waffo',
  alipay: '支付宝',
  wxpay: '微信',
  custom1: '自定义1',
  custom2: '自定义2',
};

export const getPaymentRecordsColumns = ({
  t,
  confirmAdminComplete,
}) => {
  return [
    {
      title: t('用户'),
      dataIndex: 'user_id',
      key: 'user',
      width: 150,
      render: (_, record) => {
        const name = record.display_name || record.username || record.user_id;
        return (
          <span className='flex items-center gap-1'>
            <User size={14} />
            <Text>{name}</Text>
            {record.display_name && record.username && (
              <Text type='tertiary' size='small'>@{record.username}</Text>
            )}
          </span>
        );
      },
    },
    {
      title: t('订单号'),
      dataIndex: 'trade_no',
      key: 'trade_no',
      width: 180,
      render: (text) => <Text copyable size='small'>{text}</Text>,
    },
    {
      title: t('支付方式'),
      dataIndex: 'payment_method',
      key: 'payment_method',
      width: 100,
      render: (pm) => {
        const displayName = PAYMENT_METHOD_MAP[pm];
        return <Text>{displayName ? t(displayName) : pm || '-'}</Text>;
      },
    },
    {
      title: t('充值额度'),
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount, record) => {
        const tradeNo = (record?.trade_no || '').toLowerCase();
        const isSubscription = Number(amount || 0) === 0 && tradeNo.startsWith('sub');
        if (isSubscription) {
          return (
            <Tag color='purple' shape='circle' size='small'>
              {t('订阅套餐')}
            </Tag>
          );
        }
        return (
          <span className='flex items-center gap-1'>
            <Coins size={16} />
            <Text>{amount}</Text>
          </span>
        );
      },
    },
    {
      title: t('支付金额'),
      dataIndex: 'money',
      key: 'money',
      width: 100,
      render: (money) => <Text type='danger'>¥{money?.toFixed(2) || '0.00'}</Text>,
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const config = STATUS_CONFIG[status] || { type: 'primary', key: status };
        return (
          <span className='flex items-center gap-2'>
            <Badge dot type={config.type} />
            <span>{t(config.key)}</span>
          </span>
        );
      },
    },
    {
      title: t('操作'),
      key: 'action',
      width: 100,
      render: (_, record) => {
        if (record.status === 'pending') {
          return (
            <Button
              size='small'
              type='primary'
              theme='outline'
              onClick={() => confirmAdminComplete(record.trade_no)}
            >
              {t('补单')}
            </Button>
          );
        }
        return null;
      },
    },
    {
      title: t('创建时间'),
      dataIndex: 'create_time',
      key: 'create_time',
      width: 160,
      render: (time) => timestamp2string(time),
    },
  ];
};