package controller

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

func getVersionUploadDir() string {
	// 支持通过环境变量配置上传目录
	if dir := os.Getenv("VERSION_UPLOAD_DIR"); dir != "" {
		return dir
	}
	// 兼容旧配置
	if dir := os.Getenv("VERSION_SAVE_DIR"); dir != "" {
		return dir
	}
	// 默认使用 /var/lib/one-api/versions（适合二进制部署）
	return "/var/lib/one-api/versions"
}

func init() {
	uploadDir := getVersionUploadDir()
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		common.SysLog("failed to create version upload dir: " + err.Error())
	}
}

func GetAllVersions(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	versions, total, err := service.GetAllVersions(pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(versions)
	common.ApiSuccess(c, pageInfo)
}

func SearchVersions(c *gin.Context) {
	keyword := c.Query("keyword")
	pageInfo := common.GetPageQuery(c)
	versions, total, err := service.SearchVersions(keyword, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(versions)
	common.ApiSuccess(c, pageInfo)
}

func GetVersion(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	version, err := service.GetVersionById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, version)
}

func CreateVersion(c *gin.Context) {
	var req dto.CreateVersionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	username := ""
	if u, exists := c.Get("username"); exists {
		username = u.(string)
	}

	version, err := service.CreateVersion(&req, username)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, version)
}

func UpdateVersion(c *gin.Context) {
	var req dto.UpdateVersionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	version, err := service.UpdateVersion(&req)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, version)
}

func PublishVersion(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	version, err := service.PublishVersion(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, version)
}

func UnpublishVersion(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	version, err := service.UnpublishVersion(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, version)
}

func DeleteVersion(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := service.DeleteVersion(id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func UploadVersionFile(c *gin.Context) {
	idStr := c.PostForm("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.ApiErrorMsg(c, "无效的版本ID")
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		common.ApiErrorMsg(c, "请选择要上传的文件")
		return
	}

	ext := filepath.Ext(file.Filename)
	fileName := fmt.Sprintf("v%s_%s%s", idStr, common.GetUUID()[:8], ext)
	uploadDir := getVersionUploadDir()
	filePath := filepath.Join(uploadDir, fileName)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		common.ApiErrorMsg(c, "文件保存失败: "+err.Error())
		return
	}

	if err := service.UpdateVersionFile(id, filePath, file.Filename, file.Size); err != nil {
		os.Remove(filePath)
		common.ApiErrorMsg(c, "更新版本信息失败: "+err.Error())
		return
	}

	common.ApiSuccess(c, gin.H{
		"file_name": file.Filename,
		"file_size": file.Size,
		"file_path": filePath,
	})
}

func DownloadVersion(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	filePath, fileName, err := service.GetVersionFilePath(id)
	if err != nil {
		common.ApiErrorMsg(c, "版本不存在或未上传文件")
		return
	}

	if filePath == "" {
		common.ApiErrorMsg(c, "该版本尚未上传文件")
		return
	}

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+fileName)
	c.Header("Content-Type", "application/octet-stream")
	c.File(filePath)
}

func CheckVersionUpdate(c *gin.Context) {
	version := c.Query("version")
	if version == "" {
		common.ApiErrorMsg(c, "请提供当前版本号")
		return
	}

	result, err := service.CheckVersionUpdate(version)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, result)
}
