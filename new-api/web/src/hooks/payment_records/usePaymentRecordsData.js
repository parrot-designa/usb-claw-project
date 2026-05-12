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

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast, Modal } from '@douyinfe/semi-ui';
import { API } from '../../helpers';
import { ITEMS_PER_PAGE } from '../../constants';

export const usePaymentRecordsData = () => {
  const { t } = useTranslation();

  // Basic state
  const [loading, setLoading] = useState(false);
  const [topups, setTopups] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [keyword, setKeyword] = useState('');

  // Load data
  const loadTopups = useCallback(async (currentPage, currentPageSize) => {
    setLoading(true);
    try {
      const qs =
        `p=${currentPage}&page_size=${currentPageSize}` +
        (keyword ? `&keyword=${encodeURIComponent(keyword)}` : '');
      const res = await API.get(`user/topup?${qs}`);
      const { success, message, data } = res.data;
      if (success) {
        setTopups(data.items || []);
        setTotal(data.total || 0);
      } else {
        Toast.error({ content: message || t('加载失败') });
      }
    } catch (error) {
      Toast.error({ content: t('加载充值记录失败') });
    } finally {
      setLoading(false);
    }
  }, [keyword, t]);

  // Initial load
  useEffect(() => {
    loadTopups(page, pageSize);
  }, [page, pageSize, keyword]);

  // Page change handlers
  const handlePageChange = (currentPage) => {
    setPage(currentPage);
  };

  const handlePageSizeChange = (currentPageSize) => {
    setPageSize(currentPageSize);
    setPage(1);
  };

  // Keyword change handler
  const handleKeywordChange = (value) => {
    setKeyword(value);
    setPage(1);
  };

  // Admin complete (补单)
  const handleAdminComplete = async (tradeNo) => {
    try {
      const res = await API.post('user/topup/complete', {
        trade_no: tradeNo,
      });
      const { success, message } = res.data;
      if (success) {
        Toast.success({ content: t('补单成功') });
        await loadTopups(page, pageSize);
      } else {
        Toast.error({ content: message || t('补单失败') });
      }
    } catch (e) {
      Toast.error({ content: t('补单失败') });
    }
  };

  // Confirm admin complete
  const confirmAdminComplete = (tradeNo) => {
    Modal.confirm({
      title: t('确认补单'),
      content: t('是否将该订单标记为成功并为用户入账？'),
      onOk: () => handleAdminComplete(tradeNo),
    });
  };

  return {
    // State
    loading,
    topups,
    total,
    page,
    pageSize,
    keyword,

    // Functions
    loadTopups,
    handlePageChange,
    handlePageSizeChange,
    handleKeywordChange,
    confirmAdminComplete,

    // Translation
    t,
  };
};