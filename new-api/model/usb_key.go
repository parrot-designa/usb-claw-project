package model

import (
	"errors"

	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
)

type USBKey struct {
	Id              int            `json:"id"`
	Name            string         `json:"name" gorm:"index"`
	SerialNumber    *string        `json:"serial_number" gorm:"type:varchar(64);uniqueIndex"`
	ActivationCode  string         `json:"activation_code" gorm:"type:varchar(64)"`
	IsActivated     bool           `json:"is_activated" gorm:"default:false"`
	IsBound         bool           `json:"is_bound" gorm:"default:false"`
	UserId          int            `json:"user_id" gorm:"default:0"`
	TokenKey        string         `json:"token_key" gorm:"type:varchar(128)"`
	Status          int            `json:"status" gorm:"default:1"` // 1=启用, 0=禁用
	CreatedTime     int64          `json:"created_time" gorm:"bigint"`
	ActivatedTime   int64          `json:"activated_time" gorm:"bigint"`
	DeletedAt       gorm.DeletedAt `gorm:"index"`
}

type USBKeyWithUsername struct {
	USBKey
	Username string `json:"username"`
}

func (usb *USBKey) Insert() error {
	var err error
	err = DB.Create(usb).Error
	return err
}

func (usb *USBKey) Update() error {
	var err error
	err = DB.Model(usb).Select("name", "serial_number", "activation_code", "status").Updates(usb).Error
	return err
}

func (usb *USBKey) Delete() error {
	var err error
	err = DB.Unscoped().Delete(usb).Error
	return err
}

func GetAllUSBKeys(startIdx int, num int) ([]*USBKeyWithUsername, int64, error) {
	var results []*USBKeyWithUsername
	var total int64
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	err := tx.Model(&USBKey{}).Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}
	err = tx.Model(&USBKey{}).
		Select("usb_keys.*, users.username").
		Joins("LEFT JOIN users ON users.id = usb_keys.user_id").
		Order("usb_keys.id desc").
		Limit(num).
		Offset(startIdx).
		Scan(&results).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}
	return results, total, nil
}

func SearchUSBKeys(keyword string, startIdx int, num int) ([]*USBKeyWithUsername, int64, error) {
	var results []*USBKeyWithUsername
	var total int64
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	query := tx.Model(&USBKey{}).
		Select("usb_keys.*, users.username").
		Joins("LEFT JOIN users ON users.id = usb_keys.user_id")
	if keyword != "" {
		searchKeyword := "%" + keyword + "%"
		query = query.Where("usb_keys.name LIKE ? OR usb_keys.serial_number LIKE ? OR usb_keys.activation_code LIKE ? OR users.username LIKE ?",
			searchKeyword, searchKeyword, searchKeyword, searchKeyword)
	}
	err := query.Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}
	err = query.Order("usb_keys.id desc").Limit(num).Offset(startIdx).Scan(&results).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}
	return results, total, nil
}

func GetUSBKeyById(id int) (*USBKey, error) {
	if id == 0 {
		return nil, errors.New("id 为空")
	}
	usb := &USBKey{Id: id}
	var err error = nil
	err = DB.First(usb, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return usb, nil
}

func GetUSBKeyByActivationCode(code string) (*USBKey, error) {
	if code == "" {
		return nil, errors.New("activation code 为空")
	}
	usb := &USBKey{}
	err := DB.Where("activation_code = ?", code).First(usb).Error
	if err != nil {
		return nil, err
	}
	return usb, nil
}

func ActivateUSBKey(id int, userId int) error {
	usb, err := GetUSBKeyById(id)
	if err != nil {
		return err
	}
	if usb.IsActivated {
		return errors.New("该激活码已被使用")
	}
	usb.IsActivated = true
	usb.UserId = userId
	usb.ActivatedTime = common.GetTimestamp()
	return DB.Model(usb).Select("is_activated", "user_id", "activated_time").Updates(usb).Error
}

func DeleteUSBKeyById(id int) error {
	if id == 0 {
		return errors.New("id 为空")
	}
	usb := USBKey{Id: id}
	return usb.Delete()
}

// BindSerial 将激活码绑定到指定 USB 序列号
func BindSerial(activationCode string, usbSerial string) (*USBKey, error) {
	if activationCode == "" {
		return nil, errors.New("activation code 为空")
	}
	if usbSerial == "" {
		return nil, errors.New("USB serial 为空")
	}
	usb := &USBKey{}
	err := DB.Where("activation_code = ?", activationCode).First(usb).Error
	if err != nil {
		return nil, errors.New("激活码无效")
	}
	if usb.IsActivated {
		return nil, errors.New("该激活码已被使用")
	}
	if usb.IsBound {
		return nil, errors.New("该激活码已绑定其他设备")
	}
	usb.SerialNumber = &usbSerial
	usb.IsActivated = true
	usb.IsBound = true
	usb.ActivatedTime = common.GetTimestamp()
	err = DB.Model(usb).Select("serial_number", "is_activated", "is_bound", "activated_time").Updates(usb).Error
	if err != nil {
		return nil, err
	}
	return usb, nil
}