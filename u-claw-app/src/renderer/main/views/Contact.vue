<template>
  <div class="contact-contact-view">
 

    <div class="contact-contact-card"> 
      <div class="contact-contact-title">联系客服</div>
      <div class="contact-contact-qr">
        <img src="@assets/wechat-contact.jpg" alt="微信二维码" />
      </div>
      <div class="contact-contact-wechat">
        微信号: <span class="contact-highlight">xingnanhhh</span>
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
  padding: 16px;

  .contact-page-title {
    font-size: 24px;
    font-weight: 400;
    font-family: 'Manrope', sans-serif;
    color: var(--text-primary);
    margin-bottom: 24px;
    align-self: flex-start;
  }

  .contact-contact-card {
    @extend %card-base;
    padding: 24px;
    text-align: center;
    width:400px;
    height: 400px;

    .contact-contact-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;

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
      font-size: 18px;
      font-weight: 400;
      font-family: 'Manrope', sans-serif;
      color: var(--text-primary);
      margin-bottom: 16px;
    }

    .contact-contact-qr {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;

      img {
        width: 280px;
        height: 280px;
        border-radius: 12px;
        object-fit: cover;
        border: 1px solid var(--border);
      }
    }

    .contact-contact-wechat {
      font-size: 14px;
      color: var(--text-secondary);

      .contact-highlight {
        color: var(--accent);
        font-weight: 400;
      }
    }
  }
}
</style>