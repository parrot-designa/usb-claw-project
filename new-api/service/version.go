package service

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
)

func GetAllVersions(startIdx int, num int) ([]*model.Version, int64, error) {
	return model.GetAllVersions(startIdx, num)
}

func SearchVersions(keyword string, startIdx int, num int) ([]*model.Version, int64, error) {
	return model.SearchVersions(keyword, startIdx, num)
}

func GetVersionById(id int) (*model.Version, error) {
	return model.GetVersionById(id)
}

func CreateVersion(req *dto.CreateVersionRequest, createdBy string) (*model.Version, error) {
	version := &model.Version{
		Version:     req.Version,
		Description: req.Description,
		Status:      model.VersionStatusUnpublished,
		CreatedTime: common.GetTimestamp(),
		CreatedBy:   createdBy,
	}
	if err := version.Insert(); err != nil {
		return nil, err
	}
	return version, nil
}

func UpdateVersion(req *dto.UpdateVersionRequest) (*model.Version, error) {
	version, err := model.GetVersionById(req.Id)
	if err != nil {
		return nil, err
	}
	if req.Version != "" {
		version.Version = req.Version
	}
	if req.Description != "" {
		version.Description = req.Description
	}
	if err := version.Update(); err != nil {
		return nil, err
	}
	return version, nil
}

func PublishVersion(id int) (*model.Version, error) {
	version, err := model.GetVersionById(id)
	if err != nil {
		return nil, err
	}
	if err := version.Publish(); err != nil {
		return nil, err
	}
	return version, nil
}

func UnpublishVersion(id int) (*model.Version, error) {
	version, err := model.GetVersionById(id)
	if err != nil {
		return nil, err
	}
	if err := version.Unpublish(); err != nil {
		return nil, err
	}
	return version, nil
}

func DeleteVersion(id int) error {
	return model.DeleteVersionById(id)
}

func CheckVersionUpdate(currentVersion string) (*dto.VersionCheckResponse, error) {
	latest, err := model.GetLatestPublishedVersion()
	if err != nil {
		return &dto.VersionCheckResponse{
			HasUpdate:     false,
			LatestVersion: currentVersion,
		}, nil
	}

	hasUpdate := CompareVersion(currentVersion, latest.Version) < 0

	response := &dto.VersionCheckResponse{
		HasUpdate:         hasUpdate,
		LatestVersion:     latest.Version,
		UpdateDescription: latest.Description,
		FileSize:          latest.FileSize,
	}
	if hasUpdate {
		response.DownloadUrl = fmt.Sprintf("/api/version/%d/download", latest.Id)
	}
	return response, nil
}

func UpdateVersionFile(id int, filePath, fileName string, fileSize int64) error {
	version, err := model.GetVersionById(id)
	if err != nil {
		return err
	}
	version.FilePath = filePath
	version.FileName = fileName
	version.FileSize = fileSize
	return version.Update()
}

func GetVersionFilePath(id int) (string, string, error) {
	version, err := model.GetVersionById(id)
	if err != nil {
		return "", "", err
	}
	return version.FilePath, version.FileName, nil
}

// CompareVersion 比较两个语义化版本号
// 返回值: -1 表示 v1 < v2, 0 表示 v1 == v2, 1 表示 v1 > v2
func CompareVersion(v1, v2 string) int {
	parts1 := parseVersion(v1)
	parts2 := parseVersion(v2)

	for i := 0; i < 3; i++ {
		if i >= len(parts1) && i >= len(parts2) {
			return 0
		}
		p1 := 0
		p2 := 0
		if i < len(parts1) {
			p1 = parts1[i]
		}
		if i < len(parts2) {
			p2 = parts2[i]
		}
		if p1 < p2 {
			return -1
		}
		if p1 > p2 {
			return 1
		}
	}
	return 0
}

func parseVersion(version string) []int {
	parts := strings.Split(version, ".")
	result := make([]int, 0, len(parts))
	for _, part := range parts {
		if num, err := strconv.Atoi(part); err == nil {
			result = append(result, num)
		}
	}
	return result
}
