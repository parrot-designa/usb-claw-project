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

import React, { useMemo } from 'react';
import { Empty, Input } from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { IconSearch } from '@douyinfe/semi-icons';
import { Ticket } from 'lucide-react';
import CardPro from '../../common/ui/CardPro';
import CardTable from '../../common/ui/CardTable';
import { getPaymentRecordsColumns } from './PaymentRecordsColumnDefs';
import { usePaymentRecordsData } from '../../../hooks/payment_records/usePaymentRecordsData';
import { useIsMobile } from '../../../hooks/common/useIsMobile';
import { createCardProPagination } from '../../../helpers/utils';

const PaymentRecordsTable = () => {
  const paymentRecordsData = usePaymentRecordsData();
  const isMobile = useIsMobile();

  const {
    loading,
    topups,
    total,
    page,
    pageSize,
    keyword,
    handlePageChange,
    handlePageSizeChange,
    handleKeywordChange,
    confirmAdminComplete,
    t,
  } = paymentRecordsData;

  const columns = useMemo(() => {
    return getPaymentRecordsColumns({
      t,
      confirmAdminComplete,
    });
  }, [t, confirmAdminComplete]);

  return (
    <CardPro
      type='type1'
      descriptionArea={
        <div className='flex items-center text-blue-500'>
          <Ticket className='mr-2' size={16} />
          <span>{t('充值记录')}</span>
        </div>
      }
      actionsArea={
        <div className='flex justify-end'>
          <Input
            prefix={<IconSearch />}
            placeholder={t('搜索订单号/用户名')}
            value={keyword}
            onChange={handleKeywordChange}
            showClear
            style={{ maxWidth: 300 }}
          />
        </div>
      }
      paginationArea={createCardProPagination({
        currentPage: page,
        pageSize: pageSize,
        total: total,
        onPageChange: handlePageChange,
        onPageSizeChange: handlePageSizeChange,
        isMobile: isMobile,
        t: t,
      })}
      t={t}
    >
      <CardTable
        columns={columns}
        dataSource={topups}
        loading={loading}
        rowKey='id'
        hidePagination={true}
        empty={
          <Empty
            image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
            darkModeImage={
              <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
            }
            description={t('暂无充值记录')}
            style={{ padding: 30 }}
          />
        }
        scroll={{ x: 900 }}
        className='rounded-xl overflow-hidden'
        size='small'
      />
    </CardPro>
  );
};

export default PaymentRecordsTable;