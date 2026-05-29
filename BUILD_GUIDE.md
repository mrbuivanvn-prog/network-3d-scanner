# 🔧 Windows Build Guide

Hướng dẫn chi tiết cách build ứng dụng Network 3D Scanner trên Windows.

---

## 📋 Mục lục

1. [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
2. [Cài đặt môi trường](#-cài-đặt-môi-trường)
3. [Build nhanh](#-build-nhanh)
4. [Build chi tiết](#-build-chi-tiết)
5. [Cài đặt và chạy](#-cài-đặt-và-chạy)
6. [Giải quyết lỗi thường gặp](#-giải-quyết-lỗi-thường-gặp)

---

## 🖥️ Yêu cầu hệ thống

| Thành phần | Phiên bản tối thiểu | Khuyến nghị |
|------------|---------------------|-------------|
| Windows | 10 (64-bit) | 11 (64-bit) |
| RAM | 4 GB | 8 GB |
| Dung lượng trống | 2 GB | 5 GB |
| WebView2 | Có sẵn | Luôn có |

### Kiểm tra WebView2 Runtime

```powershell
# PowerShell - Kiểm tra WebView2
Get-ItemProperty HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5} -ErrorAction SilentlyContinue | Select-Object pv

# Hoặc kiểm tra bằng winget
winget list Microsoft.WebView2
```

---

## 📦 Cài đặt môi trường

### Bước 1: Cài đặt Go

**Phương pháp 1: winget (Khuyến nghị)**

```powershell
# Mở PowerShell với quyền Administrator
winget install Go.Go

# Xác minh cài đặt
go version
```

**Phương pháp 2: Download trực tiếp**

1. Truy cập: https://go.dev/dl/
2. Tải file `go1.XX.windows-amd64.msi`
3. Chạy installer và làm theo hướng dẫn
4. Restart terminal

### Bước 2: Cài đặt Node.js

**Phương pháp 1: winget (Khuyến nghị)**

```powershell
winget install OpenJS.NodeJS

# Xác minh cài đặt
node --version
npm --version
```

**Phương pháp 2: Download trực tiếp**

1. Truy cập: https://nodejs.org/
2. Tải phiên bản LTS (18.x hoặc 20.x)
3. Chạy installer

### Bước 3: Cài đặt Wails CLI

```powershell
# Cài đặt Wails v2
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Thêm GOPATH vào PATH nếu chưa có
# Windows 11/10: Thêm vào User PATH
$env:PATH += ";$env:USERPROFILE\go\bin"

# Xác minh cài đặt
wails doctor
```

### Bước 4: Cài đặt Visual Studio Build Tools (nếu cần)

```powershell
# Tải và cài đặt Visual Studio Build Tools
# https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio

# Chọn các thành phần:
# ✓ "C++ CMake tools for Windows"
# ✓ "Windows 10/11 SDK"
```

---

## 🚀 Build nhanh

### Sử dụng script có sẵn (Đơn giản nhất)

```powershell
# 1. Clone project
git clone <repository-url>
cd network-3d-scanner

# 2. Development mode
.\dev.bat

# 3. Production build
.\build.bat
```

### Chạy trực tiếp với Wails

```powershell
# Development mode
wails dev

# Production build
wails build -platform windows/amd64
```

---

## 🔨 Build chi tiết

### 1. Build Frontend

```powershell
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt dependencies
npm install

# Build production
npm run build

# Quay lại thư mục gốc
cd ..
```

### 2. Build Windows Executable

```powershell
# Build portable (không cần cài đặt)
wails build -platform windows/amd64

# Build với NSIS installer
wails build -platform windows/amd64 -nsis

# Build với icon tùy chỉnh
wails build -platform windows/amd64 -nsis -icon app-icon.ico
```

### 3. Các tùy chọn build khác

```powershell
# Build với verbose output
wails build -v

# Build với tags
wails build -tags "production"

# Skip frontend build (đã build sẵn)
wails build -skipbuild

# Output directory tùy chỉnh
wails build -output ./my-output-dir
```

---

## 📥 Cài đặt và chạy

### Cách 1: Chạy Portable

```powershell
# Di chuyển vào thư mục build
cd build\bin

# Chạy trực tiếp
.\network-3d-scanner.exe
```

### Cách 2: Cài đặt qua NSIS

```powershell
# Chạy file setup
.\build\bin\network-3d-scanner_setup.exe

# Hoặc cài đặt silent
.\build\bin\network-3d-scanner_setup.exe /S
```

### Cách 3: Tạo Shortcut

```powershell
# Tạo shortcut trên Desktop
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Network 3D Scanner.lnk")
$Shortcut.TargetPath = ".\build\bin\network-3d-scanner.exe"
$Shortcut.WorkingDirectory = ".\build\bin"
$Shortcut.Description = "Network 3D Scanner"
$Shortcut.Save()
```

---

## ❓ Giải quyết lỗi thường gặp

### Lỗi: "WebView2 Runtime not found"

**Nguyên nhân**: WebView2 chưa được cài đặt (thường gặp trên Windows 10)

**Giải pháp**:
```powershell
# Cài đặt WebView2 Runtime
winget install Microsoft.WebView2

# Hoặc tải từ Microsoft
# https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

### Lỗi: "go: command not found"

**Nguyên nhân**: Go chưa được thêm vào PATH

**Giải pháp**:
```powershell
# Tìm đường dẫn Go
where go

# Nếu không tìm thấy, thêm vào PATH
# PowerShell (user level)
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";C:\Program Files\Go\bin", "User")

# Khởi động lại PowerShell
```

### Lỗi: "npm command not found"

**Nguyên nhân**: Node.js chưa được cài đặt đúng cách

**Giải pháp**:
```powershell
# Kiểm tra Node.js
where node
where npm

# Nếu không có, thêm vào PATH
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";C:\Program Files\nodejs", "User")

# Hoặc cài đặt lại Node.js
winget uninstall OpenJS.NodeJS
winget install OpenJS.NodeJS
```

### Lỗi: "wails: command not found"

**Nguyên nhân**: Wails CLI chưa được cài đặt hoặc GOPATH chưa được cấu hình

**Giải pháp**:
```powershell
# Cài đặt Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Kiểm tra GOPATH
go env GOPATH

# Thêm vào PATH
$env:PATH += ";$env:GOPATH\bin"

# Kiểm tra lại
wails version
```

### Lỗi: Build failed với lỗi CGO

**Nguyên nhân**: Thiếu C compiler hoặc build tools

**Giải pháp**:
```powershell
# Cài đặt Visual Studio Build Tools
# Hoặc cài đặt MinGW-w64

# Kiểm tra GCC
gcc --version

# Nếu chưa có, cài đặt via winget
winget install LLVM.LLVM
```

### Lỗi: Permission denied

**Nguyên nhân**: Không có quyền ghi vào thư mục

**Giải pháp**:
```powershell
# Chạy PowerShell với quyền Administrator
# Hoặc thay đổi quyền thư mục
icacls "C:\path\to\folder" /grant Everyone:F /T
```

### Lỗi: "Frontend build failed"

**Nguyên nhân**: npm dependencies chưa được cài đặt

**Giải pháp**:
```powershell
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
cd ..
```

---

## 🔍 Kiểm tra sau khi build

### Chạy ứng dụng
```powershell
.\build\bin\network-3d-scanner.exe
```

### Kiểm tra log
```powershell
# Log file được tạo trong thư mục chạy ứng dụng
Get-Content network-3d-scanner.log -Tail 50
```

### Kiểm tra trong Task Manager
```powershell
# Tên process: network-3d-scanner
Get-Process network-3d-scanner -ErrorAction SilentlyContinue
```

---

## 📞 Hỗ trợ

Nếu gặp lỗi không có trong danh sách trên:

1. Chạy `wails doctor` để kiểm tra môi trường
2. Kiểm tra log file trong thư mục ứng dụng
3. Liên hệ: mr.buivan.vn@gmail.com

---

## 📝 Ghi chú bổ sung

### Tốc độ build
- Lần đầu build: 5-15 phút
- Các lần sau: 1-3 phút (nhờ cache)

### Dung lượng file
- Portable EXE: ~20-50 MB
- Installer: ~30-60 MB

### Antivirus
- Một số antivirus có thể cảnh báo false positive
- Thêm exception cho thư mục build nếu cần
