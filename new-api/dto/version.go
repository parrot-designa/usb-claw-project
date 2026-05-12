package dto

type Version struct {
	Id            int    `json:"id"`
	Version       string `json:"version"`
	Description   string `json:"description"`
	FilePath      string `json:"file_path"`
	FileName      string `json:"file_name"`
	FileSize      int64  `json:"file_size"`
	Status        int    `json:"status"`
	CreatedTime   int64  `json:"created_time"`
	PublishedTime int64  `json:"published_time"`
	CreatedBy     string `json:"created_by"`
}

type CreateVersionRequest struct {
	Version     string `json:"version" binding:"required"`
	Description string `json:"description"`
}

type UpdateVersionRequest struct {
	Id          int    `json:"id" binding:"required"`
	Version     string `json:"version"`
	Description string `json:"description"`
}

type VersionCheckRequest struct {
	Version string `json:"version" form:"version" binding:"required"`
}

type VersionCheckResponse struct {
	HasUpdate         bool   `json:"has_update"`
	LatestVersion     string `json:"latest_version"`
	UpdateDescription string `json:"update_description"`
	DownloadUrl       string `json:"download_url"`
	FileSize          int64  `json:"file_size"`
}
