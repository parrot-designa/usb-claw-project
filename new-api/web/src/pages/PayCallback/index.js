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
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const PayCallback = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // 3秒后跳转到充值页面
    // const timer = setTimeout(() => {
    //   navigate('/console/topup');
    // }, 3000);

    // return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-50'>
      <div className='text-center'>
        <div className='flex justify-center mb-4'>
          <FaCheckCircle size={32} style={{ color: '#22c55e' }} />
        </div>
        <h1 className='text-2xl font-bold text-gray-800 mb-2'>
          {t('支付成功')}
        </h1>
        <p className='text-gray-600 mb-4'>
          {t('您的充值已成功处理')}
        </p> 
      </div>
    </div>
  );
};

export default PayCallback;


src="https://vip1.zhunfu.cn/submit.php?device=pc&money=1.00&name=TUC1&notify_url=http%3A%2F%2F47.110.87.12%3A3000%2Fpay-callback%2Fapi%2Fuser%2Fepay%2Fnotify&out_trade_no=USR135NOstt7Kz1777284349&pid=1346&return_url=http%3A%2F%2F47.110.87.12%3A3000%2Fpay-callback%2Fconsole%2Flog&sign=94b70401c5a0139602592c843709f7ff&sign_type=MD5&type=alipay"