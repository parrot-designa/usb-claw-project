<template>
  <div class="image-grid">
    <div v-if="images.length === 0" class="grid-empty">
      <span>暂无历史作品</span>
      <p>生成的图片将保存在这里</p>
    </div>
    <div
      v-for="image in images"
      :key="image.id"
      class="image-card"
      @click="previewImage(image)"
    >
      <img :src="image.url" :alt="image.prompt" />
      <div class="card-overlay">
        <button @click.stop="downloadImage(image.url)">↓</button>
        <button @click.stop="copyImage(image.url)">📋</button>
        <button @click.stop="deleteImage(image.id)">🗑</button>
      </div>
    </div>

    <!-- 大图预览 Modal -->
    <div v-if="previewUrl" class="preview-modal" @click="previewUrl = null">
      <div class="preview-content" @click.stop>
        <img :src="previewUrl" alt="Preview" />
        <button @click="previewUrl = null" class="preview-close">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['preview', 'download', 'copy', 'delete']);

const previewUrl = ref(null);

function previewImage(image) {
  const url = typeof image === 'string' ? image : image.url;
  previewUrl.value = url;
  emit('preview', image);
}

function downloadImage(url) {
  emit('download', url);
}

function copyImage(url) {
  emit('copy', url);
}

function deleteImage(id) {
  emit('delete', id);
}
</script>

<style scoped lang="scss">
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  padding: 16px;

  .grid-empty {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    color: #999;
    font-size: 14px;

    span {
      font-size: 16px;
      margin-bottom: 8px;
    }

    p {
      margin: 0;
      font-size: 12px;
    }
  }

  .image-card {
    position: relative;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    background: #f0f0f0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.2s;
    }

    &:hover {
      img {
        transform: scale(1.05);
      }

      .card-overlay {
        opacity: 1;
      }
    }

    .card-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      opacity: 0;
      transition: opacity 0.2s;

      button {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, background 0.2s;

        &:hover {
          transform: scale(1.1);
          background: #fff;
        }
      }
    }
  }

  .preview-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;

    .preview-content {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;

      img {
        max-width: 100%;
        max-height: 90vh;
        border-radius: 8px;
      }

      .preview-close {
        position: absolute;
        top: -16px;
        right: -16px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: #fff;
          transform: scale(1.1);
        }
      }
    }
  }
}
</style>