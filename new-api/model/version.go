package model

import (
	"errors"

	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
)

type Version struct {
	Id            int            `json:"id"`
	Version       string         `json:"version" gorm:"type:varchar(32);uniqueIndex"`
	Description   string         `json:"description" gorm:"type:text"`
	FilePath      string         `json:"file_path" gorm:"type:varchar(512)"`
	FileName      string         `json:"file_name" gorm:"type:varchar(255)"`
	FileSize      int64          `json:"file_size" gorm:"default:0"`
	Status        int            `json:"status" gorm:"default:0"` // 0=未发布, 1=已发布
	CreatedTime   int64          `json:"created_time" gorm:"bigint"`
	PublishedTime int64          `json:"published_time" gorm:"bigint;default:0"`
	CreatedBy     string         `json:"created_by" gorm:"type:varchar(64)"`
	DeletedAt     gorm.DeletedAt `gorm:"index"`
}

const (
	VersionStatusUnpublished = 0
	VersionStatusPublished  = 1
)

func (v *Version) Insert() error {
	return DB.Create(v).Error
}

func (v *Version) Update() error {
	return DB.Model(v).Updates(v).Error
}

func (v *Version) Delete() error {
	return DB.Unscoped().Delete(v).Error
}

func GetAllVersions(startIdx int, num int) ([]*Version, int64, error) {
	var versions []*Version
	var total int64
	err := DB.Model(&Version{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = DB.Model(&Version{}).
		Order("id desc").
		Limit(num).
		Offset(startIdx).
		Find(&versions).Error
	if err != nil {
		return nil, 0, err
	}
	return versions, total, nil
}

func SearchVersions(keyword string, startIdx int, num int) ([]*Version, int64, error) {
	var versions []*Version
	var total int64
	query := DB.Model(&Version{})
	if keyword != "" {
		searchKeyword := "%" + keyword + "%"
		query = query.Where("version LIKE ? OR description LIKE ?", searchKeyword, searchKeyword)
	}
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = query.Order("id desc").Limit(num).Offset(startIdx).Find(&versions).Error
	if err != nil {
		return nil, 0, err
	}
	return versions, total, nil
}

func GetVersionById(id int) (*Version, error) {
	if id == 0 {
		return nil, errors.New("id 为空")
	}
	version := &Version{Id: id}
	err := DB.First(version, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return version, nil
}

func GetVersionByVersionNum(version string) (*Version, error) {
	if version == "" {
		return nil, errors.New("version 为空")
	}
	v := &Version{}
	err := DB.Where("version = ?", version).First(v).Error
	if err != nil {
		return nil, err
	}
	return v, nil
}

func DeleteVersionById(id int) error {
	if id == 0 {
		return errors.New("id 为空")
	}
	version := Version{Id: id}
	return version.Delete()
}

func GetLatestPublishedVersion() (*Version, error) {
	v := &Version{}
	err := DB.Where("status = ?", VersionStatusPublished).
		Order("published_time desc").
		First(v).Error
	if err != nil {
		return nil, err
	}
	return v, nil
}

func (v *Version) Publish() error {
	v.Status = VersionStatusPublished
	v.PublishedTime = common.GetTimestamp()
	return DB.Model(v).Select("status", "published_time").Updates(v).Error
}

func (v *Version) Unpublish() error {
	v.Status = VersionStatusUnpublished
	v.PublishedTime = 0
	return DB.Model(v).Select("status", "published_time").Updates(v).Error
}
