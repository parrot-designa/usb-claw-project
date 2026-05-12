import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@douyinfe/semi-ui';
import { API, copy, showError, showSuccess } from '../../helpers';
import { ITEMS_PER_PAGE } from '../../constants';
import { useTableCompactMode } from '../common/useTableCompactMode';

export const useVersionsData = () => {
  const { t } = useTranslation();

  // Basic state
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [total, setTotal] = useState(0);

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editingVersion, setEditingVersion] = useState(null);

  // Add drawer state
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  // Delete modal state
  const [showDelete, setShowDelete] = useState(false);
  const [deletingVersion, setDeletingVersion] = useState(null);

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingVersion, setUploadingVersion] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Compact mode
  const [compactMode, setCompactMode] = useTableCompactMode('versions');

  // Row selection
  const [selectedKeys, setSelectedKeys] = useState([]);

  // Fetch data
  const loadVersions = useCallback(async (page = 1, size = pageSize) => {
    setLoading(true);
    try {
      const res = await API.get('/version', {
        params: { page, page_size: size },
      });
      if (res.data.success) {
        const data = res.data.data;
        setList(data.items || []);
        setTotal(data.total || 0);
        setActivePage(page);
        setPageSize(size);
      } else {
        showError(res.data.message || '获取版本列表失败');
      }
    } catch (error) {
      showError('获取版本列表失败');
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  // Initial load
  useEffect(() => {
    loadVersions(1, pageSize);
  }, []);

  // Search
  const searchVersions = async (keyword, page = 1, size = pageSize) => {
    setSearching(true);
    try {
      const res = await API.get('/version/search', {
        params: { keyword, page, page_size: size },
      });
      if (res.data.success) {
        const data = res.data.data;
        setList(data.items || []);
        setTotal(data.total || 0);
        setActivePage(page);
        setPageSize(size);
      } else {
        showError(res.data.message || '搜索失败');
      }
    } catch (error) {
      showError('搜索失败');
    } finally {
      setSearching(false);
    }
  };

  // Create
  const createVersion = async (version, description) => {
    try {
      const res = await API.post('/version/', {
        version,
        description,
      });
      if (res.data.success) {
        showSuccess(t('创建成功'));
        loadVersions(1, pageSize);
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
  const updateVersion = async (id, version, description) => {
    try {
      const res = await API.put('/version/', {
        id,
        version,
        description,
      });
      if (res.data.success) {
        showSuccess(t('更新成功'));
        loadVersions(activePage, pageSize);
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

  // Publish
  const publishVersion = async (id) => {
    try {
      const res = await API.post(`/version/${id}/publish`);
      if (res.data.success) {
        showSuccess(t('发布成功'));
        loadVersions(activePage, pageSize);
        return true;
      } else {
        showError(res.data.message || '发布失败');
        return false;
      }
    } catch (error) {
      showError('发布失败');
      return false;
    }
  };

  // Unpublish
  const unpublishVersion = async (id) => {
    try {
      const res = await API.post(`/version/${id}/unpublish`);
      if (res.data.success) {
        showSuccess(t('取消发布成功'));
        loadVersions(activePage, pageSize);
        return true;
      } else {
        showError(res.data.message || '取消发布失败');
        return false;
      }
    } catch (error) {
      showError('取消发布失败');
      return false;
    }
  };

  // Delete
  const deleteVersion = async (id) => {
    try {
      const res = await API.delete(`/version/${id}`);
      if (res.data.success) {
        showSuccess(t('删除成功'));
        loadVersions(activePage, pageSize);
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

  // Upload file
  const uploadVersionFile = async (id, file, setProgress) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('id', id);
      formData.append('file', file);

      const res = await API.post('/version/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (setProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        },
      });
      if (res.data.success) {
        showSuccess(t('上传成功'));
        loadVersions(activePage, pageSize);
        return true;
      } else {
        showError(res.data.message || '上传失败');
        return false;
      }
    } catch (error) {
      showError('上传失败');
      return false;
    } finally {
      setUploading(false);
    }
  };

  // Page handlers
  const handlePageChange = (page) => {
    loadVersions(page, pageSize);
  };

  const handlePageSizeChange = (size) => {
    loadVersions(1, size);
  };

  // Refresh
  const refresh = () => {
    loadVersions(activePage, pageSize);
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
  const openEdit = (version = null) => {
    setEditingVersion(version);
    setShowEdit(true);
  };

  const closeEdit = () => {
    setShowEdit(false);
    setEditingVersion(null);
  };

  // Delete handlers
  const openDelete = (version) => {
    setDeletingVersion(version);
    setShowDelete(true);
  };

  const closeDelete = () => {
    setShowDelete(false);
    setDeletingVersion(null);
  };

  // Upload handlers
  const openUpload = (version) => {
    setUploadingVersion(version);
    setShowUpload(true);
  };

  const closeUpload = () => {
    setShowUpload(false);
    setUploadingVersion(null);
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
    total,
    selectedKeys,
    setSelectedKeys,
    compactMode,
    setCompactMode,

    // Modal state
    showEdit,
    setShowEdit,
    editingVersion,
    setEditingVersion,
    showDelete,
    setShowDelete,
    deletingVersion,
    setDeletingVersion,
    showUpload,
    setShowUpload,
    uploadingVersion,
    setUploadingVersion,
    uploading,

    // Add drawer state
    showAddDrawer,
    setShowAddDrawer,
    openAddDrawer,
    closeAddDrawer,

    // Functions
    loadVersions,
    searchVersions,
    createVersion,
    updateVersion,
    publishVersion,
    unpublishVersion,
    deleteVersion,
    uploadVersionFile,
    handlePageChange,
    handlePageSizeChange,
    refresh,
    copyText,
    openEdit,
    closeEdit,
    openDelete,
    closeDelete,
    openUpload,
    closeUpload,

    // Translation
    t,
  };
};
