package controller

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/aliyun/aliyun-oss-go-sdk/oss"
	"github.com/gin-gonic/gin"
)

// UploadResponse 上传响应结构
type UploadResponse struct {
	Success bool   `json:"success"`
	URL     string `json:"url"`
	Error   string `json:"error,omitempty"`
}

func init() {
	// 检查 OSS 配置是否完整
	bucket := os.Getenv("ALIYUN_OSS_BUCKET")
	region := os.Getenv("ALIYUN_OSS_REGION")
	if bucket == "" || region == "" {
		fmt.Println("⚠️ 阿里云 OSS 配置不完整，部分上传功能可能不可用")
		fmt.Printf("   ALIYUN_OSS_BUCKET: %s\n", bucket)
		fmt.Printf("   ALIYUN_OSS_REGION: %s\n", region)
	} else {
		fmt.Printf("✅ 阿里云 OSS 已配置: %s.%s\n", bucket, region)
	}
}

// getOSSBucket 获取 OSS Bucket 实例
func getOSSBucket() (*oss.Bucket, error) {
	bucketName := os.Getenv("ALIYUN_OSS_BUCKET")
	region := os.Getenv("ALIYUN_OSS_REGION")
	if bucketName == "" || region == "" {
		return nil, fmt.Errorf("OSS 配置不完整，请设置 ALIYUN_OSS_BUCKET 和 ALIYUN_OSS_REGION 环境变量")
	}

	// 获取访问凭证
	accessKeyID := os.Getenv("ALIYUN_ACCESS_KEY_ID")
	accessKeySecret := os.Getenv("ALIYUN_ACCESS_KEY_SECRET")
	if accessKeyID == "" || accessKeySecret == "" {
		return nil, fmt.Errorf("OSS 访问凭证不完整，请设置 ALIYUN_ACCESS_KEY_ID 和 ALIYUN_ACCESS_KEY_SECRET 环境变量")
	}

	// 创建 OSS 客户端
	endpoint := fmt.Sprintf("https://oss-%s.aliyuncs.com", region)
	client, err := oss.New(endpoint, accessKeyID, accessKeySecret)
	if err != nil {
		return nil, fmt.Errorf("创建 OSS 客户端失败: %w", err)
	}

	// 获取 Bucket
	bucket, err := client.Bucket(bucketName)
	if err != nil {
		return nil, fmt.Errorf("获取 Bucket 失败: %w", err)
	}

	return bucket, nil
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
	fileData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, UploadResponse{
			Success: false,
			Error:   "failed to read file",
		})
		return
	}

	// 生成文件名
	filename := fmt.Sprintf("images/%d_%s.png", time.Now().UnixMilli(), common.GetRandomString(8))

	// 获取 OSS Bucket
	bucket, err := getOSSBucket()
	if err != nil {
		c.JSON(http.StatusInternalServerError, UploadResponse{
			Success: false,
			Error:   "OSS 配置错误: " + err.Error(),
		})
		return
	}

	// 上传到 OSS
	err = bucket.PutObject(filename, bytes.NewReader(fileData))
	if err != nil {
		c.JSON(http.StatusInternalServerError, UploadResponse{
			Success: false,
			Error:   "failed to upload to OSS: " + err.Error(),
		})
		return
	}

	// 构建返回的 URL
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