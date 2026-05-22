package main

import (
	"context"
	"fmt"
	"net"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	stdruntime "runtime"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NetworkDevice represents a discovered network device
type NetworkDevice struct {
	IP     string `json:"ip"`
	Host   string `json:"host"`
	MAC    string `json:"mac"`
	Status string `json:"status"` // "Online" or "Offline"
}

// PingResult represents the result of a ping operation
type PingResult struct {
	Host     string `json:"host"`
	Latency  string `json:"latency"` // e.g., "23.4ms" or "timeout"
	Success  bool   `json:"success"`
	Error    string `json:"error,omitempty"`
}

// TracerouteHop represents a single hop in traceroute
type TracerouteHop struct {
	Hop    int    `json:"hop"`
	IP     string `json:"ip"`
	Host   string `json:"host"`
	Latency string `json:"latency"`
}

// PortScanResult represents the result of a port scan
type PortScanResult struct {
	Port     int    `json:"port"`
	Open     bool   `json:"open"`
	Service  string `json:"service,omitempty"`
}

// NetworkInfo represents system and network information
type NetworkInfo struct {
	Hostname     string `json:"hostname"`
	LocalIP      string `json:"localIP"`
	MACAddress   string `json:"macAddress"`
	Interface    string `json:"interface"`
	Gateway      string `json:"gateway"`
	DNSServers   []string `json:"dnsServers"`
	OS           string `json:"os"`
	OSVersion    string `json:"osVersion"`
	Architecture string `json:"architecture"`
}

// BackupData represents data for backup/restore operations
type BackupData struct {
	Version   string            `json:"version"`
	Timestamp int64             `json:"timestamp"`
	Settings  map[string]string `json:"settings"`
	Groups    []string          `json:"groups"`
	Devices   []NetworkDevice   `json:"devices"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// GetLocalIP returns the local IP address of the machine
func (a *App) GetLocalIP() string {
	return "192.168.1.105"
}

// GetDevices returns the current list of scanned devices
func (a *App) GetDevices() []map[string]string {
	return []map[string]string{
		{"ip": "192.168.1.1", "status": "Online", "host": "router-gw", "mac": "AA:BB:CC:DD:EE:FF"},
		{"ip": "192.168.1.10", "status": "Online", "host": "pc-john", "mac": "11:22:33:44:55:66"},
		{"ip": "192.168.1.15", "status": "Online", "host": "laptop-mary", "mac": "A1:B2:C3:D4:E5:F6"},
		{"ip": "192.168.1.20", "status": "Offline", "host": "", "mac": "Unknown"},
		{"ip": "192.168.1.30", "status": "Online", "host": "nas-storage", "mac": "DE:AD:BE:EF:CA:FE"},
		{"ip": "192.168.1.99", "status": "Offline", "host": "", "mac": "Unknown"},
	}
}

// StartMockScan simulates a network scan and emits events the frontend can listen to
func (a *App) StartMockScan(cidr string) {
	// emit scan_started
	runtime.EventsEmit(a.ctx, "scan_started")

	// simulate finding devices
	devices := []map[string]string{
		{"ip": "192.168.1.1", "status": "Online", "host": "router-gw", "mac": "AA:BB:CC:DD:EE:FF"},
		{"ip": "192.168.1.10", "status": "Online", "host": "pc-john", "mac": "11:22:33:44:55:66"},
		{"ip": "192.168.1.20", "status": "Offline", "host": "printer", "mac": "77:88:99:AA:BB:CC"},
	}

	for _, d := range devices {
		time.Sleep(500 * time.Millisecond)
		runtime.EventsEmit(a.ctx, "device_found", d)
	}

	runtime.EventsEmit(a.ctx, "scan_completed")
}

// GetSystemInfo returns system and network information
func (a *App) GetSystemInfo() NetworkInfo {
	hostname, _ := os.Hostname()
	
	// Try to get local IP and MAC
	localIP := a.GetLocalIP()
	macAddress := "00:00:00:00:00:00"
	iface := "unknown"
	
	// Try to get better network info
	ifaces, err := net.Interfaces()
	if err == nil {
		for _, i := range ifaces {
			if i.Flags&net.FlagUp != 0 && i.Flags&net.FlagLoopback == 0 {
				addrs, err := i.Addrs()
				if err == nil {
					for _, addr := range addrs {
						var ip net.IP
						switch v := addr.(type) {
						case *net.IPNet:
							ip = v.IP
						case *net.IPAddr:
							ip = v.IP
						}
						if ip != nil && ip.To4() != nil {
							localIP = ip.String()
							macAddress = i.HardwareAddr.String()
							iface = i.Name
							break
						}
					}
				}
			}
		}
	}
	
	// Get gateway (simplified)
	gateway := "192.168.1.1"
	
	// DNS servers (simplified)
	dnsServers := []string{"8.8.8.8", "8.8.4.4"}
	
	return NetworkInfo{
		Hostname:     hostname,
		LocalIP:      localIP,
		MACAddress:   macAddress,
		Interface:    iface,
		Gateway:      gateway,
		DNSServers:   dnsServers,
		OS:           stdruntime.GOOS,
		OSVersion:    stdruntime.GOOS + " " + stdruntime.Version(),
		Architecture: stdruntime.GOARCH,
	}
}

// PingSingle performs a single ping to a host
func (a *App) PingSingle(host string) PingResult {
	// Use system ping command with timeout
	var cmd *exec.Cmd
	if stdruntime.GOOS == "windows" {
		cmd = exec.Command("ping", "-n", "1", "-w", "1000", host)
	} else {
		cmd = exec.Command("ping", "-c", "1", "-W", "1", host)
	}
	
	output, err := cmd.CombinedOutput()
	if err != nil {
		return PingResult{
			Host:   host,
			Latency: "timeout",
			Success: false,
			Error: err.Error(),
		}
	}
	
	// Parse output to extract latency
	outputStr := string(output)
	latency := "timeout"
	success := false
	
	if stdruntime.GOOS == "windows" {
		// Windows format: "time=23ms"
		if match := regexp.MustCompile(`time=(\d+)ms`).FindStringSubmatch(outputStr); len(match) > 1 {
			latency = match[1] + "ms"
			success = true
		}
	} else {
		// Linux/macOS format: "time=23.4 ms"
		if match := regexp.MustCompile(`time=([0-9.]+) ms`).FindStringSubmatch(outputStr); len(match) > 1 {
			latency = match[1] + "ms"
			success = true
		}
	}
	
	return PingResult{
		Host:   host,
		Latency: latency,
		Success: success,
		Error:   "",
	}
}

// PingMultiple performs ping to multiple hosts concurrently
func (a *App) PingMultiple(hosts []string) []PingResult {
	results := make([]PingResult, len(hosts))
	var wg sync.WaitGroup
	
	for i, host := range hosts {
		wg.Add(1)
		go func(i int, host string) {
			defer wg.Done()
			results[i] = a.PingSingle(host)
		}(i, host)
	}
	
	wg.Wait()
	return results
}

// Traceroute performs traceroute to a host
func (a *App) Traceroute(host string) []TracerouteHop {
	var cmd *exec.Cmd
	if stdruntime.GOOS == "windows" {
		cmd = exec.Command("tracert", "-d", "-h", "10", host)
	} else {
		cmd = exec.Command("traceroute", "-n", "-m", "10", host)
	}
	
	output, err := cmd.CombinedOutput()
	if err != nil {
		return []TracerouteHop{}
	}
	
	var hops []TracerouteHop
	outputStr := string(output)
	
	// Parse traceroute output
	lines := strings.Split(outputStr, "\n")
	hopNum := 0
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		
		// Try to parse hop line
		var hopIP string
		var latency string
		
	if stdruntime.GOOS == "windows" {
			// Windows tracert format: " 1    <1 ms    <1 ms    <1 ms  192.168.1.1"
			if match := regexp.MustCompile(`^\s*(\d+)\s+([\d<>,\s ms]+)\s+([\d<>,\s ms]+)\s+([\d<>,\s ms]+)\s+([^\s]+)`).FindStringSubmatch(line); len(match) > 4 {
				hopNum, _ = strconv.Atoi(match[1])
				hopIP = match[5]
				// Extract best latency
				latencies := strings.Split(match[2], ",")
				if len(latencies) > 0 {
					latency = strings.TrimSpace(latencies[0])
					if strings.Contains(latency, "<") {
						latency = "1ms"
					}
				}
			}
		} else {
			// Linux/macOS traceroute format: " 1  192.168.1.1  0.5 ms  0.4 ms  0.3 ms"
			if match := regexp.MustCompile(`^\s*(\d+)\s+([^\s]+)\s+([0-9.]+)\s+ms`).FindStringSubmatch(line); len(match) > 3 {
				hopNum, _ = strconv.Atoi(match[1])
				hopIP = match[2]
				latency = match[3] + "ms"
			}
		}
		
		if hopIP != "" && hopIP != "*" {
			// Try to get hostname for IP
			hopHost := ""
			names, err := net.LookupAddr(hopIP)
			if err == nil && len(names) > 0 {
				hopHost = names[0]
				// Remove trailing dot
				if len(hopHost) > 0 && hopHost[len(hopHost)-1] == '.' {
					hopHost = hopHost[:len(hopHost)-1]
				}
			}
			
			hops = append(hops, TracerouteHop{
				Hop:    hopNum,
				IP:     hopIP,
				Host:   hopHost,
				Latency: latency,
			})
		}
	}
	
	return hops
}

// PortScan scans a host for open ports
func (a *App) PortScan(host string, ports []int) []PortScanResult {
	var results []PortScanResult
	
	for _, port := range ports {
		address := fmt.Sprintf("%s:%d", host, port)
		timeout := time.Second * 2
		
		conn, err := net.DialTimeout("tcp", address, timeout)
		if err != nil {
			results = append(results, PortScanResult{
				Port: port,
				Open: false,
			})
			continue
		}
		conn.Close()
		
		// Try to guess service
		service := ""
		switch port {
		case 21:
			service = "FTP"
		case 22:
			service = "SSH"
		case 23:
			service = "Telnet"
		case 25:
			service = "SMTP"
		case 53:
			service = "DNS"
		case 80:
			service = "HTTP"
		case 110:
			service = "POP3"
		case 143:
			service = "IMAP"
		case 443:
			service = "HTTPS"
		case 3306:
			service = "MySQL"
		case 3389:
			service = "RDP"
		case 5900:
			service = "VNC"
		case 8080:
			service = "HTTP-ALT"
		}
		
		results = append(results, PortScanResult{
			Port: port,
			Open: true,
			Service: service,
		})
	}
	
	return results
}

// ScanNetwork performs a network scan for a CIDR range
func (a *App) ScanNetwork(cidr string) []map[string]string {
	// For demo purposes, return simulated results
	// In a real implementation, this would use ARP scanning or similar
	return []map[string]string{
		{"ip": "192.168.1.1", "status": "Online", "host": "router-gw", "mac": "AA:BB:CC:DD:EE:FF"},
		{"ip": "192.168.1.10", "status": "Online", "host": "pc-john", "mac": "11:22:33:44:55:66"},
		{"ip": "192.168.1.15", "status": "Online", "host": "laptop-mary", "mac": "A1:B2:C3:D4:E5:F6"},
		{"ip": "192.168.1.20", "status": "Offline", "host": "", "mac": "Unknown"},
		{"ip": "192.168.1.30", "status": "Online", "host": "nas-storage", "mac": "DE:AD:BE:EF:CA:FE"},
		{"ip": "192.168.1.99", "status": "Offline", "host": "", "mac": "Unknown"},
	}
}

// DetectLoops detects potential network loops by looking for duplicate MAC addresses
func (a *App) DetectLoops(devices []map[string]string) []string {
	var suspiciousMACs []string
	macCount := make(map[string]int)
	
	// Count MAC occurrences
	for _, device := range devices {
		mac := device["mac"]
		if mac != "" && mac != "Unknown" {
			macCount[mac]++
		}
	}
	
	// Find MACs that appear more than once
	for mac, count := range macCount {
		if count > 1 {
			suspiciousMACs = append(suspiciousMACs, mac)
		}
	}
	
	return suspiciousMACs
}

// GetSettings returns application settings
func (a *App) GetSettings() map[string]string {
	// In a real app, this would load from persistent storage
	return map[string]string{
		"theme": "dark",
		"refreshInterval": "30",
		"notifyOnNewDevice": "true",
		"autoScanEnabled": "false",
	}
}

// SaveSettings saves application settings
func (a *App) SaveSettings(settings map[string]string) error {
	// In a real app, this would save to persistent storage
	// For now, just return success
	return nil
}

// ExportBackup exports application data as backup
func (a *App) ExportBackup() (map[string]interface{}, error) {
	// In a real app, this would export settings, groups, devices, etc.
	return map[string]interface{}{
		"version": "1.0",
		"timestamp": time.Now().Unix(),
		"settings": a.GetSettings(),
		"groups": []string{}, // Empty for now
		"devices": a.GetDevices(),
	}, nil
}

// ImportBackup imports application data from backup
func (a *App) ImportBackup(data map[string]interface{}) error {
	// In a real app, this would validate and restore data
	// For now, just return success
	return nil
}

// ResetToDefault resets application to default settings
func (a *App) ResetToDefault() error {
	// In a real app, this would reset settings to defaults
	// For now, just return success
	return nil
}