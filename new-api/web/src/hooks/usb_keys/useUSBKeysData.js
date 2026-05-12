import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@douyinfe/semi-ui';
import { API, copy, showError, showSuccess } from '../../helpers';
import { ITEMS_PER_PAGE } from '../../constants';
import { useTableCompactMode } from '../common/useTableCompactMode';

export const useUSBKeysData = () => {
  const { t } = useTranslation();

  // Basic state
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [tokenCount, setTokenCount] = useState(0);

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editingUSBKey, setEditingUSBKey] = useState(null);

  // Add drawer state
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  // Delete modal state
  const [showDelete, setShowDelete] = useState(false);
  const [deletingUSBKey, setDeletingUSBKey] = useState(null);

  // Compact mode
  const [compactMode, setCompactMode] = useTableCompactMode('usbKeys');

  // Row selection
  const [selectedKeys, setSelectedKeys] = useState([]);

  // Fetch data
  const loadUSBKeys = useCallback(async (page = 1, size = pageSize) => {
    setLoading(true);
    try {
      const res = await API.get('/usb_key', {
        params: { page, page_size: size },
      });
      if (res.data.success) {
        const data = res.data.data;
        setList(data.items || []);
        setTokenCount(data.total || 0);
        setActivePage(page);
        setPageSize(size);
      } else {
        showError(res.data.message || 'Failed to fetch USB keys');
      }
    } catch (error) {
      showError('Failed to fetch USB keys');
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  // Initial load
  useEffect(() => {
    loadUSBKeys(1, pageSize);
  }, []);

  // Search
  const searchUSBKeys = async (keyword, page = 1, size = pageSize) => {
    setSearching(true);
    try {
      const res = await API.get('/usb_key/search', {
        params: { keyword, page, page_size: size },
      });
      if (res.data.success) {
        const data = res.data.data;
        setList(data.items || []);
        setTokenCount(data.total || 0);
        setActivePage(page);
        setPageSize(size);
      } else {
        showError(res.data.message || 'Search failed');
      }
    } catch (error) {
      showError('Search failed');
    } finally {
      setSearching(false);
    }
  };

  // Create
  const createUSBKey = async (serialNumber, activationCode) => {
    try {
      const res = await API.post('/usb_key/', {
        serial_number: serialNumber || '',
        activation_code: activationCode || '',
      });
      if (res.data.success) {
        showSuccess(t('创建成功'));
        loadUSBKeys(1, pageSize);
        return res.data.data;
      } else {
        showError(res.data.message || '创建失败');
        return null;
      }
    } catch (error) {
      showError('创建失败');
      return null;
    }
  };

  // Add drawer handlers
  const openAddDrawer = () => {
    setShowAddDrawer(true);
  };

  const closeAddDrawer = () => {
    setShowAddDrawer(false);
  };

  // Update
  const updateUSBKey = async (id, name, serialNumber, activationCode, status) => {
    try {
      const res = await API.put('/usb_key/', { id, name, serial_number: serialNumber, activation_code: activationCode, status });
      if (res.data.success) {
        showSuccess(t('更新成功'));
        loadUSBKeys(activePage, pageSize);
        return true;
      } else {
        showError(res.data.message || '更新失败');
        return false;
      }
    } catch (error) {
      showError('更新失败');
      return false;
    }
  };

  // Delete
  const deleteUSBKey = async (id) => {
    try {
      const res = await API.delete(`/usb_key/${id}`);
      if (res.data.success) {
        showSuccess(t('删除成功'));
        loadUSBKeys(activePage, pageSize);
        return true;
      } else {
        showError(res.data.message || '删除失败');
        return false;
      }
    } catch (error) {
      showError('删除失败');
      return false;
    }
  };

  // Batch delete
  const batchDeleteUSBKeys = async (ids) => {
    let successCount = 0;
    for (const id of ids) {
      const res = await API.delete(`/usb_key/${id}`);
      if (res.data.success) {
        successCount++;
      }
    }
    if (successCount > 0) {
      showSuccess(t(`成功删除 ${successCount} 条`));
      setSelectedKeys([]);
      loadUSBKeys(activePage, pageSize);
    }
  };

  // Page handlers
  const handlePageChange = (page) => {
    loadUSBKeys(page, pageSize);
  };

  const handlePageSizeChange = (size) => {
    loadUSBKeys(1, size);
  };

  // Refresh
  const refresh = () => {
    loadUSBKeys(activePage, pageSize);
  };

  // Copy text
  const copyText = async (text) => {
    if (await copy(text)) {
      showSuccess(t('已复制：') + text);
    } else {
      Modal.error({ title: t('无法复制到剪贴板，请手动复制'), content: text });
    }
  };

  // Edit handlers
  const openEdit = (usbKey = null) => {
    setEditingUSBKey(usbKey);
    setShowEdit(true);
  };

  const closeEdit = () => {
    setShowEdit(false);
    setEditingUSBKey(null);
  };

  // Delete handlers
  const openDelete = (usbKey) => {
    setDeletingUSBKey(usbKey);
    setShowDelete(true);
  };

  const closeDelete = () => {
    setShowDelete(false);
    setDeletingUSBKey(null);
  };

  return {
    // State
    list,
    setList,
    loading,
    searching,
    activePage,
    setActivePage,
    pageSize,
    setPageSize,
    tokenCount,
    selectedKeys,
    setSelectedKeys,
    compactMode,
    setCompactMode,

    // Modal state
    showEdit,
    setShowEdit,
    editingUSBKey,
    setEditingUSBKey,
    showDelete,
    setShowDelete,
    deletingUSBKey,
    setDeletingUSBKey,

    // Add drawer state
    showAddDrawer,
    setShowAddDrawer,
    openAddDrawer,
    closeAddDrawer,

    // Functions
    loadUSBKeys,
    searchUSBKeys,
    createUSBKey,
    updateUSBKey,
    deleteUSBKey,
    batchDeleteUSBKeys,
    handlePageChange,
    handlePageSizeChange,
    refresh,
    copyText,
    openEdit,
    closeEdit,
    openDelete,
    closeDelete,

    // Translation
    t,
  };
};