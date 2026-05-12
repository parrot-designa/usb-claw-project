package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetAllUSBKeys(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	usbKeys, total, err := model.GetAllUSBKeys(pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(usbKeys)
	common.ApiSuccess(c, pageInfo)
}

func SearchUSBKeys(c *gin.Context) {
	keyword := c.Query("keyword")
	pageInfo := common.GetPageQuery(c)
	usbKeys, total, err := model.SearchUSBKeys(keyword, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(usbKeys)
	common.ApiSuccess(c, pageInfo)
}

func GetUSBKey(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	usbKey, err := model.GetUSBKeyById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    usbKey,
	})
}

func CreateUSBKey(c *gin.Context) {
	var req dto.CreateUSBKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	var serialNumber *string
	if req.SerialNumber != "" {
		serialNumber = &req.SerialNumber
	}

	activationCode := req.ActivationCode
	if activationCode == "" {
		activationCode = common.GetUUID()
	}

	// 自动生成名称：U盘-激活码前8位（不足8位则用全部）
	name := "U盘-" + activationCode
	if len(activationCode) > 8 {
		name = "U盘-" + activationCode[:8]
	}

	usbKey := model.USBKey{
		Name:           name,
		SerialNumber:   serialNumber,
		ActivationCode: activationCode,
		Status:         1,
		CreatedTime:    common.GetTimestamp(),
	}

	if err := usbKey.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    usbKey,
	})
}

func UpdateUSBKey(c *gin.Context) {
	var req dto.UpdateUSBKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	usbKey, err := model.GetUSBKeyById(req.Id)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	if req.Name != "" {
		usbKey.Name = req.Name
	}
	if req.SerialNumber != "" {
		usbKey.SerialNumber = &req.SerialNumber
	}
	if req.ActivationCode != "" {
		usbKey.ActivationCode = req.ActivationCode
	}
	if req.Status != nil {
		usbKey.Status = *req.Status
	}

	if err := usbKey.Update(); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    usbKey,
	})
}

func DeleteUSBKey(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := model.DeleteUSBKeyById(id); err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func BindUSBKey(c *gin.Context) {
	var req dto.BindUSBKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	// 根据激活码查找 USB Key
	usbKey, err := model.GetUSBKeyByActivationCode(req.ActivationCode)
	if err != nil {
		common.ApiErrorMsg(c, "该激活码不存在")
		return
	}

	// 校验序列号是否匹配（仅当USB Key已绑定过序列号时才校验）
	if usbKey.SerialNumber != nil && *usbKey.SerialNumber != "" && *usbKey.SerialNumber != req.UsbSerial {
		fmt.Printf("[BindUSBKey] DB序列号: %q, 请求序列号: %q\n", *usbKey.SerialNumber, req.UsbSerial)
		common.ApiErrorMsg(c, "该激活码已被使用")
		return
	}

	// 如果USB Key尚未绑定序列号，自动绑定传入的序列号
	if usbKey.SerialNumber == nil {
		usbKey.SerialNumber = &req.UsbSerial
	}

	// 校验是否已激活
	if usbKey.IsActivated {
		common.ApiErrorMsg(c, "该激活码已被使用")
		return
	}

	// 创建用户：用户名 = "用户{uuid前8位}", 密码 = "123456"
	username := "用户" + common.GetUUID()[:8]

	user := &model.User{
		Username: username,
		Password: "123456",
		Role:     1,
		Status:   1,
		Group:    "vip",
	}
	if err := user.Insert(0); err != nil {
		common.ApiErrorMsg(c, "创建用户失败: "+err.Error())
		return
	}

	// USB 激活赠送 5 元余额，走充值流程
	{
		tradeNo := common.GetUUID()
		topUp := &model.TopUp{
			UserId:        user.Id,
			TradeNo:       tradeNo,
			Money:         5,
			Amount:        5,
			PaymentMethod: "system",
			Status:        common.TopUpStatusSuccess,
			CreateTime:    common.GetTimestamp(),
			CompleteTime:  common.GetTimestamp(),
		}
		if err := model.DB.Create(topUp).Error; err != nil {
			common.SysLog("USB激活赠送余额创建失败: " + err.Error())
		} else {
			quotaToAdd := int(5 * common.QuotaPerUnit)
			model.DB.Model(&model.User{}).Where("id = ?", user.Id).Update("quota", gorm.Expr("quota + ?", quotaToAdd))
			model.RecordLog(user.Id, model.LogTypeTopup, fmt.Sprintf("初始化用户时赠送余额: %s", logger.FormatQuota(quotaToAdd)))
		}
	}

	// 创建 Token，分组为 default
	tokenKey, err := common.GenerateKey()
	if err != nil {
		common.ApiErrorMsg(c, "创建令牌失败")
		return
	}
	token := &model.Token{
		UserId:             user.Id,
		Key:                tokenKey,
		Status:             1,
		Name:               "USB激活令牌",
		Group:              "vip",
		ExpiredTime:        -1,       // 永不过期
		RemainQuota:        500000,   // 示例额度
		UnlimitedQuota:     true,      // 无限额度
		ModelLimitsEnabled: false,
	}
	if err := token.Insert(); err != nil {
		common.ApiErrorMsg(c, "创建令牌失败: "+err.Error())
		return
	}

	// 激活 USB Key（关联用户）
	usbKey.IsActivated = true
	usbKey.UserId = user.Id
	usbKey.TokenKey = tokenKey
	usbKey.ActivatedTime = common.GetTimestamp()
	DB := model.DB
	if err := DB.Model(usbKey).Select("is_activated", "user_id", "token_key", "activated_time", "serial_number").Updates(usbKey).Error; err != nil {
		common.ApiErrorMsg(c, "激活失败: "+err.Error())
		return
	}

	// 设置 session 并返回 session_cookie
	sessionData := map[string]any{
		"id":       user.Id,
		"username": user.Username,
		"role":     user.Role,
		"status":   user.Status,
		"group":    user.Group,
	}
	sessionCookie, err := encodeSessionCookie(sessionData)
	if err != nil {
		common.ApiErrorMsg(c, "创建会话失败")
		return
	}
	session := sessions.Default(c)
	session.Set("id", user.Id)
	session.Set("username", user.Username)
	session.Set("role", user.Role)
	session.Set("status", user.Status)
	session.Set("group", user.Group)
	err = session.Save()
	if err != nil {
		common.ApiErrorMsg(c, "创建会话失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"token":          "sk-" + tokenKey,
			"session_cookie": sessionCookie,
		},
	})
}

// LoginUSBKey 统一登录接口：支持序列号+激活码登录，也支持密码验证登录，返回权限token信息
func LoginUSBKey(c *gin.Context) {

	var req struct {
		SerialNumber   string `json:"serial_number" binding:"required"`
		ActivationCode string `json:"activation_code" binding:"required"`
		Password       string `json:"password"` // 可选，传入则进行密码验证
	} 
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	// 根据激活码查找 USB Key
	usbKey, err := model.GetUSBKeyByActivationCode(req.ActivationCode)
	if err != nil {
		common.ApiErrorMsg(c, "激活码无效")
		return
	}

	// 校验序列号是否匹配
	if usbKey.SerialNumber == nil || *usbKey.SerialNumber != req.SerialNumber {
		if usbKey.SerialNumber != nil {
			fmt.Printf("[LoginUSBKey] DB序列号: %q, 请求序列号: %q\n", *usbKey.SerialNumber, req.SerialNumber)
		}
		common.ApiErrorMsg(c, "序列号不匹配")
		return
	}

	// 校验是否已激活
	if !usbKey.IsActivated {
		common.ApiErrorMsg(c, "该激活码尚未激活")
		return
	}

	// 如果传入了密码，进行密码验证
	if req.Password != "" {
		if req.Password != "123456" {
			common.ApiErrorMsg(c, "密码错误")
			return
		}

		// 获取关联的用户
		if usbKey.UserId == 0 {
			common.ApiErrorMsg(c, "未找到关联的用户")
			return
		}

		user, err := model.GetUserById(usbKey.UserId, false)
		if err != nil {
			common.ApiErrorMsg(c, "用户不存在")
			return
		}

		// 检查用户状态
		if user.Status != 1 {
			common.ApiErrorMsg(c, "用户已被禁用")
			return
		}

		// 执行session登录
		setupLogin(user, c)
		return
	}

	// 构建返回数据
	responseData := gin.H{ 
		"has_password": usbKey.UserId > 0,
	}

	// 如果有关联用户，生成 session 并返回用户信息
	var sessionCookie string
	if usbKey.UserId > 0 {
		user, err := model.GetUserById(usbKey.UserId, false)
		if err == nil && user.Status == 1 {
			sessionData := map[string]any{
				"id":       user.Id,
				"username": user.Username,
				"role":     user.Role,
				"status":   user.Status,
				"group":    user.Group,
			}
			sessionCookie, _ = encodeSessionCookie(sessionData)

			responseData["user"] = gin.H{
				"id":           user.Id,
				"username":     user.Username,
				"display_name": user.DisplayName,
				"role":         user.Role,
				"status":       user.Status,
				"group":        user.Group,
			}
		}

		// 设置 session cookie（兼容浏览器自动 cookie）
		session := sessions.Default(c)
		session.Set("id", user.Id)
		session.Set("username", user.Username)
		session.Set("role", user.Role)
		session.Set("status", user.Status)
		session.Set("group", user.Group)
		session.Save()
	}

	// 返回完整的权限 token 信息和 session
	responseData["session_cookie"] = sessionCookie
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    responseData,
	})
}

// ValidateActivation 验证激活文件中的信息是否有效
func ValidateActivation(c *gin.Context) {
	var req struct {
		UserId         int    `json:"user_id"`
		Username       string `json:"username"`
		SerialNumber   string `json:"serial_number"`
		ActivationCode string `json:"activation_code"`
		Key            string `json:"key"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	// 验证用户是否存在
	user, err := model.GetUserById(req.UserId, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户不存在",
		})
		return
	}

	// 验证用户名是否匹配
	if user.Username != req.Username {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户名不匹配",
		})
		return
	}

	// 验证 USB Key 是否绑定到该用户
	usbKey, err := model.GetUSBKeyByActivationCode(req.ActivationCode)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "激活码无效",
		})
		return
	}

	if usbKey.SerialNumber == nil || *usbKey.SerialNumber != req.SerialNumber {
		if usbKey.SerialNumber != nil {
			fmt.Printf("[ValidateActivation] DB序列号: %q, 请求序列号: %q\n", *usbKey.SerialNumber, req.SerialNumber)
		}
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "序列号不匹配1",
		})
		return
	}

	if usbKey.UserId != req.UserId || !usbKey.IsActivated {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "激活信息无效",
		})
		return
	}

	// 验证 token 是否有效
	// 去掉 sk- 前缀进行验证
	tokenKey := req.Key
	if strings.HasPrefix(tokenKey, "sk-") {
		tokenKey = strings.TrimPrefix(tokenKey, "sk-")
	}
	token, err := model.GetTokenByKey(tokenKey, false)
	if err != nil || token.UserId != req.UserId {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "令牌无效",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func CheckUSBKey(c *gin.Context) {
	serial := c.Query("serial")
	if serial == "" {
		common.ApiErrorMsg(c, "serial 参数不能为空")
		return
	}
	usb := &model.USBKey{}
	err := model.DB.Where("serial_number = ? AND is_bound = ?", serial, true).First(usb).Error
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "未找到绑定的 USB key",
			"data":    nil,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"is_activated": usb.IsActivated,
			"is_bound":     usb.IsBound,
			"activated_at":  usb.ActivatedTime,
		},
	})
}
