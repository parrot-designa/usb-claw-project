package model

type Setup struct {
	ID            uint   `json:"id" gorm:"primaryKey"`
	Version       string `json:"version" gorm:"type:varchar(50);not null"`
	InitializedAt int64  `json:"initialized_at" gorm:"type:bigint;not null"`
}

func GetSetup() *Setup {
	var setup Setup                         // 声明 Setup 类型变量，用于接收查询结果
	err := DB.First(&setup).Error           // 从数据库获取第一条 Setup 记录
	if err != nil {                         // 如果查询出错（记录不存在或其他错误）
		return nil                            // 返回 nil
	}
	return &setup                           // 查询成功，返回 setup 指针
}
