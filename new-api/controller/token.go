package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
)

// extractUserIdFromSession 从 session 数据中提取用户 ID，兼容 int、int64、float64 类型
func extractUserIdFromSession(sessionData map[string]any) (int, error) {
	idVal, ok := sessionData["id"]
	if !ok {
		return 0, fmt.Errorf("id not found in session")
	}
	switch v := idVal.(type) {
	case float64:
		return int(v), nil
	case int:
		return v, nil
	case int64:
		return int(v), nil
	case int32:
		return int(v), nil
	default:
		return 0, fmt.Errorf("id has unsupported type: %T", v)
	}
}

func buildMaskedTokenResponse(token *model.Token) *model.Token {
	if token == nil {
		return nil
	}
	maskedToken := *token
	maskedToken.Key = token.GetMaskedKey()
	return &maskedToken
}

func buildMaskedTokenResponses(tokens []*model.Token) []*model.Token {
	maskedTokens := make([]*model.Token, 0, len(tokens))
	for _, token := range tokens {
		maskedTokens = append(maskedTokens, buildMaskedTokenResponse(token))
	}
	return maskedTokens
}

func GetAllTokens(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	tokens, err := model.GetAllUserTokens(userId, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	total, _ := model.CountUserTokens(userId)
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(buildMaskedTokenResponses(tokens))
	common.ApiSuccess(c, pageInfo)
}

func SearchTokens(c *gin.Context) {
	userId := c.GetInt("id")
	keyword := c.Query("keyword")
	token := c.Query("token")

	pageInfo := common.GetPageQuery(c)

	tokens, total, err := model.SearchUserTokens(userId, keyword, token, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(buildMaskedTokenResponses(tokens))
	common.ApiSuccess(c, pageInfo)
}

func GetToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	userId := c.GetInt("id")
	if err != nil {
		common.ApiError(c, err)
		return
	}
	token, err := model.GetTokenByIds(id, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, buildMaskedTokenResponse(token))
}

func GetTokenKey(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	userId := c.GetInt("id")
	if err != nil {
		common.ApiError(c, err)
		return
	}
	token, err := model.GetTokenByIds(id, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"key": token.GetFullKey(),
	})
}

// GetTokenInfoByKey 根据 token key 获取用户和分组信息（公开接口，供 U-Claw 使用）
func GetTokenInfoByKey(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "key 参数不能为空",
		})
		return
	}

	// 去掉 sk- 前缀
	tokenKey := key
	if strings.HasPrefix(key, "sk-") {
		tokenKey = strings.TrimPrefix(key, "sk-")
	}

	token, err := model.GetTokenByKey(tokenKey, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "令牌无效",
		})
		return
	}

	// 获取用户信息
	user, err := model.GetUserById(token.UserId, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户不存在",
		})
		return
	}

	// 获取用户的分组（优先用 token 的分组，因为 USB 激活场景 token 分组更精确）
	groupName := token.Group
	if groupName == "" {
		groupName = user.Group
	}

	// 获取模型列表
	var models []string
	if token.ModelLimitsEnabled {
		models = token.GetModelLimits()
	} else {
		// 根据分组获取所有可用模型
		models = model.GetGroupEnabledModels(groupName)
	}

	// 计算已用余额和剩余余额（美元）- 基于用户个人账户
	usedBalance := float64(user.UsedQuota) / common.QuotaPerUnit
	remainBalance := float64(user.Quota) / common.QuotaPerUnit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user_id":   user.Id,
			"username":  user.Username,
			"group":     groupName,
			"token_id":  token.Id,
			"token_key": key,
			"name":      token.Name,
			"status":    token.Status,
			"remain_quota":        token.RemainQuota,
			"unlimited_quota":      token.UnlimitedQuota,
			"model_limits_enabled": token.ModelLimitsEnabled,
			"models":              models,
			"user_quota":          float64(user.Quota) / common.QuotaPerUnit,
			"used_balance":        usedBalance,
			"remain_balance":      remainBalance,
		},
	})
}

func GetTokenStatus(c *gin.Context) {
	tokenId := c.GetInt("token_id")
	userId := c.GetInt("id")
	token, err := model.GetTokenByIds(tokenId, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	expiredAt := token.ExpiredTime
	if expiredAt == -1 {
		expiredAt = 0
	}
	c.JSON(http.StatusOK, gin.H{
		"object":          "credit_summary",
		"total_granted":   token.RemainQuota,
		"total_used":      0, // not supported currently
		"total_available": token.RemainQuota,
		"expires_at":      expiredAt * 1000,
	})
}

func GetTokenUsage(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "No Authorization header",
		})
		return
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Invalid Bearer token",
		})
		return
	}
	tokenKey := parts[1]

	token, err := model.GetTokenByKey(strings.TrimPrefix(tokenKey, "sk-"), false)
	if err != nil {
		common.SysError("failed to get token by key: " + err.Error())
		common.ApiErrorI18n(c, i18n.MsgTokenGetInfoFailed)
		return
	}

	expiredAt := token.ExpiredTime
	if expiredAt == -1 {
		expiredAt = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    true,
		"message": "ok",
		"data": gin.H{
			"object":               "token_usage",
			"name":                 token.Name,
			"total_granted":        token.RemainQuota + token.UsedQuota,
			"total_used":           token.UsedQuota,
			"total_available":      token.RemainQuota,
			"unlimited_quota":      token.UnlimitedQuota,
			"model_limits":         token.GetModelLimitsMap(),
			"model_limits_enabled": token.ModelLimitsEnabled,
			"expires_at":           expiredAt,
		},
	})
}

func AddToken(c *gin.Context) {
	token := model.Token{}
	err := c.ShouldBindJSON(&token)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if len(token.Name) > 50 {
		common.ApiErrorI18n(c, i18n.MsgTokenNameTooLong)
		return
	}
	// 非无限额度时，检查额度值是否超出有效范围
	if !token.UnlimitedQuota {
		if token.RemainQuota < 0 {
			common.ApiErrorI18n(c, i18n.MsgTokenQuotaNegative)
			return
		}
		maxQuotaValue := int((1000000000 * common.QuotaPerUnit))
		if token.RemainQuota > maxQuotaValue {
			common.ApiErrorI18n(c, i18n.MsgTokenQuotaExceedMax, map[string]any{"Max": maxQuotaValue})
			return
		}
	}
	// 检查用户令牌数量是否已达上限
	maxTokens := operation_setting.GetMaxUserTokens()
	count, err := model.CountUserTokens(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if int(count) >= maxTokens {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("已达到最大令牌数量限制 (%d)", maxTokens),
		})
		return
	}
	key, err := common.GenerateKey()
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgTokenGenerateFailed)
		common.SysLog("failed to generate token key: " + err.Error())
		return
	}
	cleanToken := model.Token{
		UserId:             c.GetInt("id"),
		Name:               token.Name,
		Key:                key,
		CreatedTime:        common.GetTimestamp(),
		AccessedTime:       common.GetTimestamp(),
		ExpiredTime:        token.ExpiredTime,
		RemainQuota:        token.RemainQuota,
		UnlimitedQuota:     token.UnlimitedQuota,
		ModelLimitsEnabled: token.ModelLimitsEnabled,
		ModelLimits:        token.ModelLimits,
		AllowIps:           token.AllowIps,
		Group:              token.Group,
		CrossGroupRetry:    token.CrossGroupRetry,
	}
	err = cleanToken.Insert()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func DeleteToken(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userId := c.GetInt("id")
	err := model.DeleteTokenById(id, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func UpdateToken(c *gin.Context) {
	userId := c.GetInt("id")
	statusOnly := c.Query("status_only")
	token := model.Token{}
	err := c.ShouldBindJSON(&token)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if len(token.Name) > 50 {
		common.ApiErrorI18n(c, i18n.MsgTokenNameTooLong)
		return
	}
	if !token.UnlimitedQuota {
		if token.RemainQuota < 0 {
			common.ApiErrorI18n(c, i18n.MsgTokenQuotaNegative)
			return
		}
		maxQuotaValue := int((1000000000 * common.QuotaPerUnit))
		if token.RemainQuota > maxQuotaValue {
			common.ApiErrorI18n(c, i18n.MsgTokenQuotaExceedMax, map[string]any{"Max": maxQuotaValue})
			return
		}
	}
	cleanToken, err := model.GetTokenByIds(token.Id, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if token.Status == common.TokenStatusEnabled {
		if cleanToken.Status == common.TokenStatusExpired && cleanToken.ExpiredTime <= common.GetTimestamp() && cleanToken.ExpiredTime != -1 {
			common.ApiErrorI18n(c, i18n.MsgTokenExpiredCannotEnable)
			return
		}
		if cleanToken.Status == common.TokenStatusExhausted && cleanToken.RemainQuota <= 0 && !cleanToken.UnlimitedQuota {
			common.ApiErrorI18n(c, i18n.MsgTokenExhaustedCannotEable)
			return
		}
	}
	if statusOnly != "" {
		cleanToken.Status = token.Status
	} else {
		// If you add more fields, please also update token.Update()
		cleanToken.Name = token.Name
		cleanToken.ExpiredTime = token.ExpiredTime
		cleanToken.RemainQuota = token.RemainQuota
		cleanToken.UnlimitedQuota = token.UnlimitedQuota
		cleanToken.ModelLimitsEnabled = token.ModelLimitsEnabled
		cleanToken.ModelLimits = token.ModelLimits
		cleanToken.AllowIps = token.AllowIps
		cleanToken.Group = token.Group
		cleanToken.CrossGroupRetry = token.CrossGroupRetry
	}
	err = cleanToken.Update()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    buildMaskedTokenResponse(cleanToken),
	})
}

type TokenBatch struct {
	Ids []int `json:"ids"`
}

func DeleteTokenBatch(c *gin.Context) {
	tokenBatch := TokenBatch{}
	if err := c.ShouldBindJSON(&tokenBatch); err != nil || len(tokenBatch.Ids) == 0 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	userId := c.GetInt("id")
	count, err := model.BatchDeleteTokens(tokenBatch.Ids, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    count,
	})
}

func GetTokenKeysBatch(c *gin.Context) {
	tokenBatch := TokenBatch{}
	if err := c.ShouldBindJSON(&tokenBatch); err != nil || len(tokenBatch.Ids) == 0 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	if len(tokenBatch.Ids) > 100 {
		common.ApiErrorI18n(c, i18n.MsgBatchTooMany, map[string]any{"Max": 100})
		return
	}
	userId := c.GetInt("id")
	tokens, err := model.GetTokenKeysByIds(tokenBatch.Ids, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	keysMap := make(map[int]string)
	for _, t := range tokens {
		keysMap[t.Id] = t.GetFullKey()
	}
	common.ApiSuccess(c, gin.H{"keys": keysMap})
}

// GetAllTokensByKey 根据令牌key获取该用户的所有令牌列表（公开接口，供 U-Claw 使用）
func GetAllTokensByKey(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "key 参数不能为空",
		})
		return
	}

	// 去掉 sk- 前缀
	tokenKey := key
	if strings.HasPrefix(key, "sk-") {
		tokenKey = strings.TrimPrefix(key, "sk-")
	}

	// 获取令牌信息
	token, err := model.GetTokenByKey(tokenKey, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "令牌无效",
		})
		return
	}

	// 获取该用户的所有令牌
	tokens, err := model.GetAllUserTokens(token.UserId, 0, 1000)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取令牌列表失败",
		})
		return
	}

	// 构建返回数据（返回完整密钥供 U-Claw 内部使用）
	tokenList := make([]gin.H, 0, len(tokens))
	for _, t := range tokens {
		tokenList = append(tokenList, gin.H{
			"id":     t.Id,
			"name":   t.Name,
			"key":    t.GetFullKey(),
			"status": t.Status,
			"group":  t.Group,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user_id":  token.UserId,
			"tokens":   tokenList,
		},
	})
}

// GetAllModelsBySession 获取模型广场所有可用模型（通过 session_cookie 认证，供 U-Claw 主窗口使用）
func GetAllModelsBySession(c *gin.Context) {
	// 从 JSON body 获取 session_cookie
	var body struct {
		SessionCookie string `json:"session_cookie"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		// 尝试从 form data 获取
		body.SessionCookie = c.PostForm("session_cookie")
	}
	sessionCookie := body.SessionCookie
	if sessionCookie == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "未登录或会话已过期",
		})
		return
	}

	// 解码 session cookie
	sessionData, err := decodeSessionCookie(sessionCookie)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "会话无效",
		})
		return
	}

	// 从 session 数据中提取用户 ID（兼容 int、int64、float64 类型）
	userId, err := extractUserIdFromSession(sessionData)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户 ID 解析失败",
		})
		return
	}

	// 获取用户信息以获取其所属分组
	user, err := model.GetUserById(userId, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取用户信息失败",
		})
		return
	}

	// 获取该用户可用的分组
	usableGroups := service.GetUserUsableGroups(user.Group)

	// 获取所有定价数据并按用户分组过滤
	allPricing := model.GetPricing()
	filteredPricing := filterPricingByUsableGroups(allPricing, usableGroups)
	// 过滤 tags 为 "text" 或空
	filteredPricing = filterPricingByTags(filteredPricing, []string{"", "text"})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    filteredPricing,
	})
}

// GetVideoModelsBySession 获取视频模型（通过 session_cookie 认证，供 U-Claw 主窗口使用）
func GetVideoModelsBySession(c *gin.Context) {
	// 从 JSON body 获取 session_cookie
	var body struct {
		SessionCookie string `json:"session_cookie"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		// 尝试从 form data 获取
		body.SessionCookie = c.PostForm("session_cookie")
	}
	sessionCookie := body.SessionCookie
	if sessionCookie == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "未登录或会话已过期",
		})
		return
	}

	// 解码 session cookie
	sessionData, err := decodeSessionCookie(sessionCookie)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "会话无效",
		})
		return
	}

	// 从 session 数据中提取用户 ID（兼容 int、int64、float64 类型）
	userId, err := extractUserIdFromSession(sessionData)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户 ID 解析失败",
		})
		return
	}

	// 获取用户信息以获取其所属分组
	user, err := model.GetUserById(userId, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取用户信息失败",
		})
		return
	}

	// 获取该用户可用的分组
	usableGroups := service.GetUserUsableGroups(user.Group)

	// 获取所有定价数据并按用户分组过滤
	allPricing := model.GetPricing()
	filteredPricing := filterPricingByUsableGroups(allPricing, usableGroups)
	// 过滤 tags 为 "video"
	filteredPricing = filterPricingByTags(filteredPricing, []string{"video"})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    filteredPricing,
	})
}

// GetImageModelsBySession 获取图片模型（通过 session_cookie 认证，供 U-Claw 主窗口使用）
func GetImageModelsBySession(c *gin.Context) {
	// 从 JSON body 获取 session_cookie
	var body struct {
		SessionCookie string `json:"session_cookie"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		// 尝试从 form data 获取
		body.SessionCookie = c.PostForm("session_cookie")
	}
	sessionCookie := body.SessionCookie
	if sessionCookie == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "未登录或会话已过期",
		})
		return
	}

	// 解码 session cookie
	sessionData, err := decodeSessionCookie(sessionCookie)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "会话无效",
		})
		return
	}

	// 从 session 数据中提取用户 ID（兼容 int、int64、float64 类型）
	userId, err := extractUserIdFromSession(sessionData)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户 ID 解析失败",
		})
		return
	}

	// 获取用户信息以获取其所属分组
	user, err := model.GetUserById(userId, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取用户信息失败",
		})
		return
	}

	// 获取该用户可用的分组
	usableGroups := service.GetUserUsableGroups(user.Group)

	// 获取所有定价数据并按用户分组过滤
	allPricing := model.GetPricing()
	filteredPricing := filterPricingByUsableGroups(allPricing, usableGroups)
	// 过滤 tags 为 "image"
	filteredPricing = filterPricingByTags(filteredPricing, []string{"image"})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    filteredPricing,
	})
}
