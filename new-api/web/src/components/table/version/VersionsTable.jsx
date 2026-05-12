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
import { Empty, Button } from '@douyinfe/semi-ui';
import CardTable from '../../common/ui/CardTable';
import CardPro from '../../common/ui/CardPro';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { getVersionsColumns } from './VersionsColumnDefs';
import EditVersionDrawer from './modals/EditVersionDrawer';
import DeleteVersionModal from './modals/DeleteVersionModal';
import UploadVersionModal from './modals/UploadVersionModal';
import VersionsDescription from './VersionsDescription';
import VersionsFilters from './VersionsFilters';
import { useVersionsData } from '../../../hooks/versions/useVersionsData';
import { useIsMobile } from '../../../hooks/common/useIsMobile';
import { createCardProPagination } from '../../../helpers/utils';

const VersionsTable = () => {
  const versionsData = useVersionsData();
  const isMobile = useIsMobile();
  const {
    list,
    loading,
    searching,
    activePage,
    pageSize,
    total,
    selectedKeys,
    setSelectedKeys,
    compactMode,
    setCompactMode,
    showEdit,
    editingVersion,
    showDelete,
    deletingVersion,
    showUpload,
    uploadingVersion,
    openEdit,
    openDelete,
    openUpload,
    deleteVersion,
    publishVersion,
    unpublishVersion,
    uploadVersionFile,
    setEditingVersion,
    setShowEdit,
    closeEdit,
    closeDelete,
    closeUpload,
    showAddDrawer,
    openAddDrawer,
    closeAddDrawer,
    searchVersions,
    loadVersions,
    createVersion,
    updateVersion,
    handlePageChange,
    handlePageSizeChange,
    refresh,
    copyText,
    t,
  } = versionsData;

  // Row selection
  const rowSelection = {
    selectedRowKeys: selectedKeys,
    onChange: (selectedRowKeys) => setSelectedKeys(selectedRowKeys),
  };

  // Handle row click
  const handleRow = () => ({});

  const columns = useMemo(() => {
    return getVersionsColumns({
      t,
      openEdit,
      openDelete,
      openUpload,
      copyText,
    });
  }, [t, openEdit, openDelete, openUpload, copyText]);

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
      <EditVersionDrawer
        visible={showAddDrawer || showEdit}
        handleClose={() => {
          closeAddDrawer();
          closeEdit();
        }}
        editingVersion={showEdit ? editingVersion : null}
        createVersion={createVersion}
        updateVersion={updateVersion}
        refresh={refresh}
        t={t}
      />

      <DeleteVersionModal
        visible={showDelete}
        onCancel={closeDelete}
        record={deletingVersion}
        deleteVersion={deleteVersion}
        publishVersion={publishVersion}
        unpublishVersion={unpublishVersion}
        refresh={refresh}
        t={t}
      />

      <UploadVersionModal
        visible={showUpload}
        onCancel={closeUpload}
        record={uploadingVersion}
        uploadVersionFile={uploadVersionFile}
        refresh={refresh}
        t={t}
      />

      <CardPro
        type='type1'
        descriptionArea={
          <VersionsDescription
            compactMode={compactMode}
            setCompactMode={setCompactMode}
            t={t}
          />
        }
        actionsArea={
          <div className='flex flex-col md:flex-row justify-between items-center gap-2 w-full'>
            <div className='flex gap-2'>
              <Button type='primary' onClick={openAddDrawer} size='small'>
                {t('新建版本')}
              </Button>
            </div>
            <VersionsFilters
              searchVersions={searchVersions}
              loadVersions={loadVersions}
              activePage={activePage}
              pageSize={pageSize}
              loading={loading}
              searching={searching}
              t={t}
            />
          </div>
        }
        searchArea={null}
        t={t}
      >
        <CardTable
          columns={tableColumns}
          dataSource={list}
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

export default VersionsTable;