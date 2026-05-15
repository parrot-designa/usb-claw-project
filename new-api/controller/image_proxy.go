package controller

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-gonic/gin"
)

// imageProxyError 返回标准化的 OpenAI 风格错误响应
func imageProxyError(c *gin.Context, status int, errType, message string) {
	c.JSON(status, gin.H{
		"error": gin.H{
			"message": message,
			"type":    errType,
		},
	})
}

// ImageProxy 图片内容透传接口
// GET /v1/images/generations/:task_id/content
func ImageProxy(c *gin.Context) {
	taskID := c.Param("task_id")
	if taskID == "" {
		imageProxyError(c, http.StatusBadRequest, "invalid_request_error", "task_id is required")
		return
	}

	userID := c.GetInt("id")
	task, exists, err := model.GetByTaskId(userID, taskID)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to query task %s: %s", taskID, err.Error()))
		imageProxyError(c, http.StatusInternalServerError, "server_error", "Failed to query task")
		return
	}
	if !exists || task == nil {
		imageProxyError(c, http.StatusNotFound, "invalid_request_error", "Task not found")
		return
	}

	if task.Status != model.TaskStatusSuccess {
		imageProxyError(c, http.StatusBadRequest, "invalid_request_error",
			fmt.Sprintf("Task is not completed yet, current status: %s", task.Status))
		return
	}

	channel, err := model.CacheGetChannel(task.ChannelId)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to get channel for task %s: %s", taskID, err.Error()))
		imageProxyError(c, http.StatusInternalServerError, "server_error", "Failed to retrieve channel information")
		return
	}

	baseURL := channel.GetBaseURL()
	if baseURL == "" {
		baseURL = "https://api.openai.com"
	}

	var imageURL string
	proxy := channel.GetSetting().Proxy
	client, err := service.GetHttpClientWithProxy(proxy)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to create proxy client for task %s: %s", taskID, err.Error()))
		imageProxyError(c, http.StatusInternalServerError, "server_error", "Failed to create proxy client")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "", nil)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to create request: %s", err.Error()))
		imageProxyError(c, http.StatusInternalServerError, "server_error", "Failed to create proxy request")
		return
	}

	// 根据频道类型构建图片 URL
	switch channel.Type {
	case constant.ChannelTypeOpenAI:
		// OpenAI 风格的图片 URL
		imageURL = fmt.Sprintf("%s/v1/images/%s/content", baseURL, task.GetUpstreamTaskID())
		req.Header.Set("Authorization", "Bearer "+channel.Key)
		// DALL-E 3 风格
	default:
		// 图片 URL 存储在 PrivateData.ResultURL（fallback 到 FailReason 兼容旧数据）
		imageURL = task.GetResultURL()
	}

	imageURL = strings.TrimSpace(imageURL)
	if imageURL == "" {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Image URL is empty for task %s", taskID))
		imageProxyError(c, http.StatusBadGateway, "server_error", "Failed to fetch image content")
		return
	}

	// 处理 data URL（base64 内嵌图片）
	if strings.HasPrefix(imageURL, "data:") {
		if err := writeImageDataURL(c, imageURL); err != nil {
			logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to decode image data URL for task %s: %s", taskID, err.Error()))
			imageProxyError(c, http.StatusBadGateway, "server_error", "Failed to fetch image content")
		}
		return
	}

	// URL 安全检查
	fetchSetting := system_setting.GetFetchSetting()
	if err := common.ValidateURLWithFetchSetting(imageURL, fetchSetting.EnableSSRFProtection, fetchSetting.AllowPrivateIp, fetchSetting.DomainFilterMode, fetchSetting.IpFilterMode, fetchSetting.DomainList, fetchSetting.IpList, fetchSetting.AllowedPorts, fetchSetting.ApplyIPFilterForDomain); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Image URL blocked for task %s: %v", taskID, err))
		imageProxyError(c, http.StatusForbidden, "server_error", fmt.Sprintf("request blocked: %v", err))
		return
	}

	req.URL, err = url.Parse(imageURL)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to parse URL %s: %s", imageURL, err.Error()))
		imageProxyError(c, http.StatusInternalServerError, "server_error", "Failed to create proxy request")
		return
	}

	resp, err := client.Do(req)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to fetch image from %s: %s", imageURL, err.Error()))
		imageProxyError(c, http.StatusBadGateway, "server_error", "Failed to fetch image content")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Upstream returned status %d for %s", resp.StatusCode, imageURL))
		imageProxyError(c, http.StatusBadGateway, "server_error",
			fmt.Sprintf("Upstream service returned status %d", resp.StatusCode))
		return
	}

	// 转发响应头
	for key, values := range resp.Header {
		for _, value := range values {
			c.Writer.Header().Add(key, value)
		}
	}

	c.Writer.Header().Set("Cache-Control", "public, max-age=86400")
	c.Writer.WriteHeader(resp.StatusCode)
	if _, err = io.Copy(c.Writer, resp.Body); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to stream image content: %s", err.Error()))
	}
}

// writeImageDataURL 处理 data URL 格式的内嵌图片（base64 编码）
func writeImageDataURL(c *gin.Context, dataURL string) error {
	parts := strings.SplitN(dataURL, ",", 2)
	if len(parts) != 2 {
		return fmt.Errorf("invalid data url")
	}

	header := parts[0]
	payload := parts[1]
	if !strings.HasPrefix(header, "data:") || !strings.Contains(header, ";base64") {
		return fmt.Errorf("unsupported data url")
	}

	mimeType := strings.TrimPrefix(header, "data:")
	mimeType = strings.TrimSuffix(mimeType, ";base64")
	if mimeType == "" {
		mimeType = "image/png"
	}

	imageBytes, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		imageBytes, err = base64.RawStdEncoding.DecodeString(payload)
		if err != nil {
			return err
		}
	}

	c.Writer.Header().Set("Content-Type", mimeType)
	c.Writer.Header().Set("Cache-Control", "public, max-age=86400")
	c.Writer.WriteHeader(http.StatusOK)
	_, err = c.Writer.Write(imageBytes)
	return err
}
