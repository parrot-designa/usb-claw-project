<template>
  <button
    class="tech-btn"
    :class="[
      `tech-btn--${variant}`,
      `tech-btn--${size}`,
      { 'tech-btn--loading': loading, 'tech-btn--icon-only': iconOnly }
    ]"
    :disabled="disabled || loading"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <span v-if="loading" class="tech-btn__spinner"></span>
    <span v-else-if="$slots.icon" class="tech-btn__icon">
      <slot name="icon"></slot>
    </span>
    <span v-if="!iconOnly" class="tech-btn__text">
      <slot></slot>
    </span>
  </button>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'ghost'].includes(v)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (v) => ['small', 'medium', 'large'].includes(v)
  },
  disabled: Boolean,
  loading: Boolean,
  iconOnly: Boolean
})

function handleMouseEnter(event) {
  const btn = event.currentTarget
  const rect = btn.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  if (x < rect.width * 0.3) {
    btn.classList.add('enter-left')
  } else if (x > rect.width * 0.7) {
    btn.classList.add('enter-right')
  } else if (y < rect.height * 0.3) {
    btn.classList.add('enter-top')
  } else {
    btn.classList.add('enter-bottom')
  }
}

function handleMouseLeave(event) {
  const btn = event.currentTarget
  btn.classList.remove('enter-left', 'enter-right', 'enter-top', 'enter-bottom')
}
</script>

<style scoped lang="scss">
.tech-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  font-family: 'Manrope', sans-serif;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  border: 1px solid transparent;
  white-space: nowrap;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--primary);
  }

  // Sizes
  &--small {
    padding: 6px 12px;
    font-size: 12px;
  }

  &--medium {
    padding: 8px 16px;
    font-size: 14px;
  }

  &--large {
    padding: 12px 24px;
    font-size: 16px;
  }

  &--icon-only {
    padding: 8px;
    &.tech-btn--small { padding: 6px; }
    &.tech-btn--large { padding: 12px; }
  }

  // Variants
  &--primary {
    // background: linear-gradient(135deg, var(--accent), #00d4ff);
    background: var(--blue);
    color: var(--text);
    box-shadow: 0 4px 16px rgba(79, 140, 255, .3);

    &:hover:not(:disabled) { 
        background: var(--blue2);
        box-shadow: 0 0 32px rgba(79, 140, 255, .25), 0 4px 16px rgba(79, 140, 255, .3);
        transform: translateY(-1px);

    }

    &.enter-left::before {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.2), transparent);
      opacity: 1;
    }
    &.enter-right::before {
      background: linear-gradient(-90deg, rgba(255, 255, 255, 0.2), transparent);
      opacity: 1;
    }
    &.enter-top::before {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent);
      opacity: 1;
    }
    &.enter-bottom::before {
      background: linear-gradient(0deg, rgba(255, 255, 255, 0.2), transparent);
      opacity: 1;
    }
  }

  &--secondary {
    background: var(--surface);
    color: var(--text-primary);
    border-color: rgba(255, 255, 255, 0.15);

    &:hover:not(:disabled) {
      border-color: rgba(255, 255, 255, 0.3);
      background: var(--surface-high);
    }

    &.enter-left::before {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.08), transparent);
      opacity: 1;
    }
    &.enter-right::before {
      background: linear-gradient(-90deg, rgba(255, 255, 255, 0.08), transparent);
      opacity: 1;
    }
    &.enter-top::before {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent);
      opacity: 1;
    }
    &.enter-bottom::before {
      background: linear-gradient(0deg, rgba(255, 255, 255, 0.08), transparent);
      opacity: 1;
    }
  }

  &--danger {
    background: linear-gradient(135deg, #ef4444, #f87171);
    color: white;
    border-color: rgba(239, 68, 68, 0.3);

    &:hover:not(:disabled) {
      box-shadow: 0 8px 20px -5px rgba(239, 68, 68, 0.4);
      border-color: rgba(239, 68, 68, 0.6);
    }

    &.enter-left::before {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.2), transparent);
      opacity: 1;
    }
    &.enter-right::before {
      background: linear-gradient(-90deg, rgba(255, 255, 255, 0.2), transparent);
      opacity: 1;
    }
    &.enter-top::before {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent);
      opacity: 1;
    }
    &.enter-bottom::before {
      background: linear-gradient(0deg, rgba(255, 255, 255, 0.2), transparent);
      opacity: 1;
    }
  }

  &--ghost {
    background: transparent;
    color: var(--text-secondary);
    border-color: transparent;

    &:hover:not(:disabled) {
      background: var(--surface);
      color: var(--text-primary);
      border-color: rgba(255, 255, 255, 0.15);
    }

    &.enter-left::before {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.05), transparent);
      opacity: 1;
    }
    &.enter-right::before {
      background: linear-gradient(-90deg, rgba(255, 255, 255, 0.05), transparent);
      opacity: 1;
    }
    &.enter-top::before {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent);
      opacity: 1;
    }
    &.enter-bottom::before {
      background: linear-gradient(0deg, rgba(255, 255, 255, 0.05), transparent);
      opacity: 1;
    }
  }

  &__spinner {
    width: 1em;
    height: 1em;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;

    .iconfont {
      font-size: 1.25em;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
