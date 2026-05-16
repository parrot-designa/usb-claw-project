package controller

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-gonic/gin"
)

// UploadRequest 上传请求结构
type UploadRequest struct {
	Image string `json:"image" binding:"required"`
}

// UploadResponse 上传响应结构
type UploadResponse struct {
	Success bool   `json:"success"`
	URL     string `json:"url"`
	Error   string `json:"error,omitempty"`
}

// Upload 处理图片上传
// POST /api/upload
func Upload(c *gin.Context) {
	var req UploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, UploadResponse{
			Success: false,
			Error:   "invalid request: " + err.Error(),
		})
		return
	}

	// 解析 base64 数据
	imageData := req.Image
	if len(imageData) == 0 {
		c.JSON(http.StatusBadRequest, UploadResponse{
			Success: false,
			Error:   "image is required",
		})
		return
	}

	// 处理 data:image/...;base64,xxx 格式
	if len(imageData) > 5 && imageData[:5] == "data:" {
		commaIdx := -1
		for i := 5; i < len(imageData); i++ {
			if imageData[i] == ',' {
				commaIdx = i
				break
			}
		}
		if commaIdx > 0 {
			imageData = imageData[commaIdx+1:]
		}
	}

	// 解码 base64
	decoded, err := base64.StdEncoding.DecodeString(imageData)
	if err != nil {
		c.JSON(http.StatusBadRequest, UploadResponse{
			Success: false,
			Error:   "invalid base64 data",
		})
		return
	}

	// 检查文件大小 (10MB)
	if len(decoded) > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, UploadResponse{
			Success: false,
			Error:   "file size exceeds 10MB limit",
		})
		return
	}

	// 生成文件名
	filename := fmt.Sprintf("images/%d_%s.png", time.Now().UnixMilli(), common.GetRandomString(8))
	// 假 URL - 实际实现时替换为阿里云 OSS SDK
	ossURL := fmt.Sprintf("https://%s.oss-cn-hangzhou.aliyuncs.com/%s",
		os.Getenv("ALIYUN_OSS_BUCKET"),
		filename)

	c.JSON(http.StatusOK, UploadResponse{
		Success: true,
		URL:     ossURL,
	})
}