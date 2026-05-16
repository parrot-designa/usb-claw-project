<template>
  <div
    class="reference-images"
    :class="{ 'drag-over': isDragOver }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
    @paste="onPaste"
  > 
    <!-- 参考图列表 -->
    <div class="ref-images">
      <div v-for="(img, index) in images" :key="index" class="ref-image-item">
        <img :src="img" @click="removeImage(index)" />
        <span class="remove-btn">×</span>
      </div>

      <!-- 添加按钮 -->
      <div class="add-image-btn" @click="triggerFileInput">
        <span>+</span>
        <span>添加参考图</span>
      </div>
    </div>

    <!-- 隐藏的文件输入框 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      style="display: none"
      @change="onFileSelected"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useToast } from '../../composables/useToast';
import { apiRequest } from '@renderer/js/api.js';

const { showToast } = useToast();

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:images']);

const fileInput = ref(null);
const isDragOver = ref(false);

function triggerFileInput() {
  fileInput.value?.click();
}

function onDragOver(e) {
  isDragOver.value = true;
}

function onDragLeave(e) {
  isDragOver.value = false;
}

function onDrop(e) {
  isDragOver.value = false;
  const files = e.dataTransfer.files;
  handleFiles(files);
}

function onPaste(e) {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        handleFiles([file]);
      }
    }
  }
}

function onFileSelected(e) {
  const files = e.target.files;
  if (files) {
    handleFiles(files);
  }
  // Reset input value to allow selecting the same file again
  e.target.value = '';
}

function handleFiles(files) {
  const MAX_SIZE = 10 * 1024 * 1024;
  const newImages = [...props.images];

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;

    // Check file size
    if (file.size > MAX_SIZE) {
      showToast('图片大小不能超过 10MB', true);
      continue;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      try {
        const res = await apiRequest('/api/upload', {
          method: 'POST',
          body: { image: base64 }
        });
        if (res.url) {
          newImages.push(res.url);
        } else {
          showToast('上传失败', true);
          return;
        }
      } catch (err) {
        showToast('上传失败: ' + err.message, true);
        return;
      }
      emit('update:images', newImages);
    };
    reader.readAsDataURL(file);
  }
}

function removeImage(index) {
  const newImages = [...props.images];
  newImages.splice(index, 1);
  emit('update:images', newImages);
}
</script>

<style scoped lang="scss">
.reference-images {
  padding: 12px;
  border-radius: 8px; 
  transition: border-color 0.2s;

  &.drag-over {
    border: 2px dashed #1890ff;
  }
}

.ref-hint {
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
}

.ref-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ref-image-item {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .remove-btn {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    font-size: 24px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover .remove-btn {
    opacity: 1;
  }
}

.add-image-btn {
  width: 72px;
  height: 72px;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: #666;
  font-size: 12px;
  transition: border-color 0.2s, color 0.2s;

  span:first-child {
    font-size: 24px;
    line-height: 1;
  }

  &:hover {
    border-color: #1890ff;
    color: #1890ff;
  }
}
</style>