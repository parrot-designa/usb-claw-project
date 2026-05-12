<template>
  <div class="contact-contact-view">
 

    <div class="contact-contact-card"> 
      <div class="contact-contact-title">联系客服</div>
      <div class="contact-contact-qr">
        <img src="/wechat-contact.jpg" alt="微信二维码" />
      </div>
      <div class="contact-contact-wechat">
        微信号: <span class="contact-highlight">LunoAi789</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.contact-contact-view {
  display: flex;
  min-height: calc(100vh - 120px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;

  .contact-page-title {
    font-size: 1.5rem;
    font-weight: 400;
    font-family: 'Manrope', sans-serif;
    color: var(--text-primary);
    margin-bottom: 1.5rem;
    align-self: flex-start;
  }

  .contact-contact-card {
    @extend %card-base;
    padding: 1.5rem;
    text-align: center;
    width:400px;
    height: 400px;

    .contact-contact-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 1rem;

      .contact-wrapper {
        width: 300px;
        height: 300px;
        border-radius: 50%;
        background-color: azure;
        display: flex;
        align-items: center;
        justify-content: center;

        img {
          width: 80%;
          height: 80%;
        }
      }
    }

    .contact-contact-title {
      font-size: 1.125rem;
      font-weight: 400;
      font-family: 'Manrope', sans-serif;
      color: var(--text-primary);
      margin-bottom: 1rem;
    }

    .contact-contact-qr {
      display: flex;
      justify-content: center;
      margin-bottom: 1rem;

      img {
        width: 280px;
        height: 280px;
        border-radius: 0.75rem;
        object-fit: cover;
        border: 1px solid var(--border);
      }
    }

    .contact-contact-wechat {
      font-size: 0.875rem;
      color: var(--text-secondary);

      .contact-highlight {
        color: var(--accent);
        font-weight: 400;
      }
    }
  }
}
</style>