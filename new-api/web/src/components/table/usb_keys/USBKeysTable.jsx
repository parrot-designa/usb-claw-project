/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

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
import { Empty, Button } from '@douyinfe/semi-ui';
import CardTable from '../../common/ui/CardTable';
import CardPro from '../../common/ui/CardPro';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { getUSBKeysColumns } from './USBKeysColumnDefs';
import EditUSBKeyDrawer from './modals/EditUSBKeyDrawer';
import DeleteUSBKeyModal from './modals/DeleteUSBKeyModal';
import USBKeysDescription from './USBKeysDescription';
import USBKeysFilters from './USBKeysFilters';
import { useUSBKeysData } from '../../../hooks/usb_keys/useUSBKeysData';
import { useIsMobile } from '../../../hooks/common/useIsMobile';
import { createCardProPagination } from '../../../helpers/utils';

const USBKeysTable = () => {
  const usbKeysData = useUSBKeysData();
  const isMobile = useIsMobile();
  const {
    list,
    loading,
    searching,
    activePage,
    pageSize,
    tokenCount,
    selectedKeys,
    setSelectedKeys,
    compactMode,
    setCompactMode,
    showEdit,
    editingUSBKey,
    showDelete,
    deletingUSBKey,
    searchUSBKeys,
    loadUSBKeys,
    createUSBKey,
    updateUSBKey,
    batchDeleteUSBKeys,
    handlePageChange,
    handlePageSizeChange,
    refresh,
    copyText,
    openEdit,
    openDelete,
    deleteUSBKey,
    setEditingUSBKey,
    setShowEdit,
    closeEdit,
    closeDelete,
    showAddDrawer,
    openAddDrawer,
    closeAddDrawer,
    t,
  } = usbKeysData;

  // Row selection
  const rowSelection = {
    selectedRowKeys: selectedKeys,
    onChange: (selectedRowKeys) => setSelectedKeys(selectedRowKeys),
  };

  // Handle row click
  const handleRow = () => ({});

  const columns = useMemo(() => {
    return getUSBKeysColumns({
      t,
      openEdit,
      openDelete,
      copyText,
      setEditingUSBKey,
      setShowEdit,
    });
  }, [t, openEdit, openDelete, copyText, setEditingUSBKey, setShowEdit]);

  // Handle compact mode by removing fixed positioning
  const tableColumns = useMemo(() => {
    return compactMode
      ? columns.map((col) => {
          if (col.dataIndex === 'operate') {
            const { fixed, ...rest } = col;
            return rest;
          }
          return col;
        })
      : columns;
  }, [compactMode, columns]);

  return (
    <>
      {/* Drawer and Modal components */}
      <EditUSBKeyDrawer
        visible={showAddDrawer || showEdit}
        handleClose={() => {
          closeAddDrawer();
          closeEdit();
        }}
        editingUSBKey={showEdit ? editingUSBKey : null}
        createUSBKey={createUSBKey}
        updateUSBKey={updateUSBKey}
        refresh={refresh}
        t={t}
      />

      <DeleteUSBKeyModal
        visible={showDelete}
        onCancel={closeDelete}
        record={deletingUSBKey}
        deleteUSBKey={deleteUSBKey}
        refresh={refresh}
        t={t}
      />

      <CardPro
        type='type1'
        descriptionArea={
          <USBKeysDescription
            compactMode={compactMode}
            setCompactMode={setCompactMode}
            t={t}
          />
        }
        actionsArea={
          <div className='flex flex-col md:flex-row justify-between items-center gap-2 w-full'>
            <div className='flex gap-2'>
              <Button type='primary' onClick={openAddDrawer} size='small'>
                {t('新建U盘')}
              </Button>
            </div>
            <USBKeysFilters
              searchUSBKeys={searchUSBKeys}
              loadUSBKeys={loadUSBKeys}
              activePage={activePage}
              pageSize={pageSize}
              loading={loading}
              searching={searching}
              t={t}
            />
          </div>
        }
        searchArea={null}
        paginationArea={createCardProPagination({
          currentPage: activePage,
          pageSize: pageSize,
          total: tokenCount,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
          isMobile: isMobile,
          t: t,
        })}
        t={t}
      >
        <CardTable
          columns={tableColumns}
          dataSource={list}
          scroll={compactMode ? undefined : { x: 'max-content' }}
          hidePagination={true}
          loading={loading}
          rowSelection={rowSelection}
          onRow={handleRow}
          empty={
            <Empty
              image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
              darkModeImage={
                <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
              }
              description={t('搜索无结果')}
              style={{ padding: 30 }}
            />
          }
          className='rounded-xl overflow-hidden'
          size='middle'
        />
      </CardPro>
    </>
  );
};

export default USBKeysTable;