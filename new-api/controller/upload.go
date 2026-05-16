package controller

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

// UploadResponse 上传响应结构
type UploadResponse struct {
	Success bool   `json:"success"`
	URL     string `json:"url"`
	Error   string `json:"error,omitempty"`
}

// Upload 处理图片上传
// POST /api/upload
func Upload(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, UploadResponse{
			Success: false,
			Error:   "invalid request: " + err.Error(),
		})
		return
	}
	defer file.Close()

	// 检查文件大小 (10MB)
	if header.Size > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, UploadResponse{
			Success: false,
			Error:   "file size exceeds 10MB limit",
		})
		return
	}

	// 读取文件内容
	_, err = file.Seek(0, io.SeekStart)
	if err != nil {
		c.JSON(http.StatusInternalServerError, UploadResponse{
			Success: false,
			Error:   "failed to read file",
		})
		return
	}

	// 生成文件名
	filename := fmt.Sprintf("images/%d_%s.png", time.Now().UnixMilli(), common.GetRandomString(8))
	// 使用环境变量配置 region，默认 oss-cn-hangzhou
	region := os.Getenv("ALIYUN_OSS_REGION")
	if region == "" {
		region = "oss-cn-hangzhou"
	}
	ossURL := fmt.Sprintf("https://%s.%s.aliyuncs.com/%s",
		os.Getenv("ALIYUN_OSS_BUCKET"),
		region,
		filename)

	c.JSON(http.StatusOK, UploadResponse{
		Success: true,
		URL:     ossURL,
	})
}