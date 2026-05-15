package controller

import (
	"fmt"
	"io"
	"net/http"

	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/relay"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/service"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/types"

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

// ImageProxy 图片任务状态/内容透传接口
// GET /v1/images/generations/:task_id
func ImageProxy(c *gin.Context) {
	taskID := c.Param("task_id")
	if taskID == "" {
		imageProxyError(c, http.StatusBadRequest, "invalid_request_error", "task_id is required")
		return
	}

	// 调试日志：打印接收到的 task_id
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("[ImageProxy] 收到 task_id: %s", taskID))

	// 构建 RelayInfo（参考图片生成透传方式）
	relayInfo, err := relaycommon.GenRelayInfo(c, types.RelayFormatTask, nil, nil)
	if err != nil {
		imageProxyError(c, http.StatusInternalServerError, "server_error", fmt.Sprintf("Failed to generate relay info: %s", err.Error()))
		return
	}

	// 设置 channel meta 信息（从 context 中获取，TokenAuth 中间件已设置）
	relayInfo.InitChannelMeta(c)

	// 设置为图片 fetch 模式
	relayInfo.RelayMode = relayconstant.RelayModeImagesFetchByID

	// 构建请求路径，包含 task_id
	relayInfo.RequestURLPath = fmt.Sprintf("/v1/images/generations/%s", taskID)

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("[ImageProxy] channelID: %d, baseURL: %s, channelType: %d, apiType: %d",
		relayInfo.ChannelMeta.ChannelId, relayInfo.ChannelMeta.ChannelBaseUrl, relayInfo.ChannelMeta.ChannelType, relayInfo.ApiType))

	// 获取 adaptor
	adaptor := relay.GetAdaptor(relayInfo.ApiType)
	if adaptor == nil {
		imageProxyError(c, http.StatusInternalServerError, "server_error", fmt.Sprintf("invalid api type: %d", relayInfo.ApiType))
		return
	}
	adaptor.Init(relayInfo)

	// 构建完整 URL
	fullURL, err := adaptor.GetRequestURL(relayInfo)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("[ImageProxy] GetRequestURL failed: %s", err.Error()))
		imageProxyError(c, http.StatusInternalServerError, "server_error", "Failed to build request URL")
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("[ImageProxy] 透传 URL: %s", fullURL))

	// 创建 GET 请求
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, fullURL, nil)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("[ImageProxy] NewRequest failed: %s", err.Error()))
		imageProxyError(c, http.StatusInternalServerError, "server_error", "Failed to create request")
		return
	}

	// 设置请求头
	err = adaptor.SetupRequestHeader(c, &req.Header, relayInfo)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("[ImageProxy] SetupRequestHeader failed: %s", err.Error()))
		imageProxyError(c, http.StatusInternalServerError, "server_error", "Failed to setup request header")
		return
	}

	// 发送请求
	client := service.GetHttpClient()
	resp, err := client.Do(req)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("[ImageProxy] DoRequest failed: %s", err.Error()))
		imageProxyError(c, http.StatusBadGateway, "server_error", "Failed to fetch image")
		return
	}
	defer resp.Body.Close()

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("[ImageProxy] 上游返回 status: %d", resp.StatusCode))

	// 透传响应头
	for key, values := range resp.Header {
		for _, value := range values {
			c.Writer.Header().Add(key, value)
		}
	}

	// 返回上游响应
	c.Writer.WriteHeader(resp.StatusCode)
	if _, err = io.Copy(c.Writer, resp.Body); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("[ImageProxy] io.Copy failed: %s", err.Error()))
	}
}

