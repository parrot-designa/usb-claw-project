package dto

type USBKey struct {
	Id             int    `json:"id"`
	Name           string `json:"name"`
	SerialNumber   string `json:"serial_number"`
	ActivationCode string `json:"activation_code"`
	IsActivated    bool   `json:"is_activated"`
	UserId         int    `json:"user_id"`
	Username       string `json:"username"`
	Status         int    `json:"status"`
	CreatedTime    int64  `json:"created_time"`
	ActivatedTime  int64  `json:"activated_time"`
}

type CreateUSBKeyRequest struct {
	SerialNumber   string `json:"serial_number"`
	ActivationCode string `json:"activation_code"`
}

type UpdateUSBKeyRequest struct {
	Id             int    `json:"id" binding:"required"`
	Name           string `json:"name"`
	SerialNumber   string `json:"serial_number"`
	ActivationCode string `json:"activation_code"`
	Status         *int   `json:"status"`
}

type BindUSBKeyRequest struct {
	ActivationCode string `json:"activation_code" binding:"required"`
	UsbSerial      string `json:"usb_serial" binding:"required"`
}

type BindUSBKeyResponse struct {
	Serial      string `json:"serial"`
	ActivatedAt int64  `json:"activated_at"`
	Signature   string `json:"signature"`
}