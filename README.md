# 🖥️ Network 3D Scanner

Một công cụ quét mạng chuyên nghiệp với giao diện 3D trực quan, được xây dựng bằng **Wails** (Go + React + Three.js).

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-green)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## ✨ Tính năng

### 🔍 Quét mạng
- **Quét CIDR Range** - Tự động phát hiện thiết bị trong mạng LAN
- **Hiển thị 3D/2D** - Trực quan hóa topology mạng dưới dạng đồ thị 3D hoặc 2D
- **Theo dõi trạng thái** - Cập nhật real-time thiết bị Online/Offline

### 🌐 Công cụ mạng
- **Ping Tool** - Ping đơn hoặc nhiều host đồng thời
- **Traceroute** - Truy vết đường đi đến destination
- **Port Scanner** - Quét cổng TCP trên thiết bị mục tiêu

### 📦 Quản lý
- **Device Groups** - Phân nhóm thiết bị theo mục đích
- **Backup & Restore** - Xuất/nhập dữ liệu cấu hình
- **Settings** - Tùy chỉnh giao diện và hành vi ứng dụng

---

## 📋 Yêu cầu hệ thống

### Windows
- **OS**: Windows 10/11 (64-bit)
- **Runtime**: [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (đã có sẵn trên Windows 11)
- **Go**: 1.21+ ([Download](https://go.dev/dl/))
- **Node.js**: 18+ ([Download](https://nodejs.org/))
- **Wails CLI**: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

### Linux
- **OS**: Ubuntu 20.04+ / Debian 11+
- **GTK3**: `sudo apt install libgtk-3-dev`
- **Go**: 1.21+
- **Node.js**: 18+
- **Wails CLI**: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

### macOS
- **OS**: macOS 10.15+
- **Xcode Command Line Tools**: `xcode-select --install`
- **Go**: 1.21+
- **Node.js**: 18+
- **Wails CLI**: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

---

## 🚀 Cài đặt nhanh

### 1. Cài đặt dependencies

```bash
# Windows (PowerShell as Administrator)
winget install Go.Go
winget install OpenJS.NodeJS

# Linux
sudo apt update && sudo apt install golang-go nodejs npm libgtk-3-dev

# macOS
brew install go node
```

### 2. Cài đặt Wails CLI

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 3. Clone và chạy

```bash
# Clone project
git clone <repository-url>
cd network-3d-scanner

# Cài đặt frontend dependencies
cd frontend && npm install && cd ..

# Chạy chế độ development
wails dev
```

---

## 🔨 Build cho Windows

### Sử dụng script (Khuyến nghị)

```bash
# Development mode
.\dev.bat

# Build production
.\build.bat
```

### Build thủ công

```bash
# Build frontend
cd frontend
npm install
npm run build
cd ..

# Build Windows executable
wails build -platform windows/amd64 -nsis

# Output: build/bin/network-3d-scanner.exe
```

### Build options

```bash
# Build với icon tùy chỉnh
wails build -platform windows/amd64 -nsis -icon ./app-icon.ico

# Build portable (không cần cài đặt)
wails build -platform windows/amd64

# Build cho distribution
wails build -platform windows/amd64 -nsis -tags "production"
```

---

## 📁 Cấu trúc dự án

```
network-3d-scanner/
├── main.go                 # Entry point, Wails configuration
├── app.go                  # Go backend logic (network scanning)
├── wails.json              # Wails project configuration
├── go.mod / go.sum         # Go dependencies
├── README.md               # Documentation
├── dev.bat                 # Windows development script
├── build.bat               # Windows production build script
├── frontend/
│   ├── package.json        # Node dependencies
│   ├── vite.config.js      # Vite configuration
│   ├── index.html          # HTML entry
│   └── src/
│       ├── App.jsx         # Main React component
│       ├── App.css         # Global styles
│       ├── main.jsx        # React entry point
│       ├── Network2D.jsx   # 2D visualization
│       ├── Scene3D.jsx     # 3D visualization (Three.js)
│       ├── PingTool.jsx    # Ping utility
│       ├── TracerouteTool.jsx
│       ├── PortScanTool.jsx
│       ├── SettingsTool.jsx
│       ├── GroupsTool.jsx
│       ├── BackupTool.jsx
│       └── utils/
│           └── hashToPos.js # Position mapping utilities
└── build/
    └── bin/                 # Build output directory
```

---

## 🎮 Hướng dẫn sử dụng

### Quét mạng
1. Nhập CIDR range (ví dụ: `192.168.1.0/24`)
2. Nhấn **START 3D SCAN**
3. Chờ quá trình quét hoàn tất
4. Xem kết quả trong panel bên phải

### Sử dụng công cụ
- **Ping**: Nhập IP/hostname → nhấn Ping
- **Traceroute**: Nhập destination → xem các hop
- **Port Scan**: Chọn host → chọn port range → Scan

### Chuyển đổi chế độ hiển thị
- **Auto**: Tự động chọn tốt nhất (2D/3D)
- **2D**: Chế độ 2D (khuyến nghị nếu gặp lỗi 3D)
- **3D**: Chế độ 3D với Three.js

---

## ⚙️ Cấu hình

### wails.json

```json
{
  "name": "network-3d-scanner",
  "outputfilename": "network-3d-scanner",
  "frontend:dir": "./frontend",
  "author": {
    "name": "mrbuivan.vn",
    "email": "mr.buivan.vn@gmail.com"
  }
}
```

### Settings (trong ứng dụng)
- **Theme**: Dark mode (mặc định)
- **Refresh Interval**: Thời gian refresh tự động (giây)
- **Notify on New Device**: Thông báo khi phát hiện thiết bị mới
- **Auto Scan**: Tự động quét khi khởi động

---

## 🔧 Troubleshooting

### Lỗi "WebView2 not found"
```powershell
# Cài đặt WebView2 Runtime
winget install Microsoft.WebView2
```

### Lỗi permission khi quét mạng
- Chạy với quyền Administrator (Windows)
- Kiểm tra firewall settings

### Lỗi 3D renderer
- Chuyển sang chế độ **2D** trong header
- Cập nhật drivers đồ họa

### Build failed
```bash
# Clean và rebuild
wails doctor  # Kiểm tra dependencies
go clean -cache
wails build
```

---

## 📄 License

MIT License - Copyright (c) 2024 [mrbuivan.vn](https://mrbuivan.vn)

---

## 👤 Tác giả

**Bui Van**
- Website: https://mrbuivan.vn
- Email: mr.buivan.vn@gmail.com
- GitHub: [@mrbuivan](https://github.com/mrbuivan)
