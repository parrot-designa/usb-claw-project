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

import React, { useState } from 'react';
import { Input, Button } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

const VersionsFilters = ({ searchVersions, loadVersions, activePage, pageSize, loading, searching, t }) => {
  const [keyword, setKeyword] = useState('');

  const handleSearch = () => {
    if (keyword.trim()) {
      searchVersions(keyword, 1, pageSize);
    } else {
      loadVersions(1, pageSize);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder={t('搜索版本号或描述')}
        value={keyword}
        onChange={setKeyword}
        onKeyPress={handleKeyPress}
        style={{ width: 200 }}
      />
      <Button onClick={handleSearch} loading={searching}>
        {t('搜索')}
      </Button>
      {keyword && (
        <Button onClick={() => { setKeyword(''); loadVersions(1, pageSize); }}>
          {t('清除')}
        </Button>
      )}
    </div>
  );
};

export default VersionsFilters;
