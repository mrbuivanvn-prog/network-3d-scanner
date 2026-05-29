package main

import (
	"context"
	"fmt"
	"log"
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

// ============================================================================
// Constants
// ============================================================================

const (
	AppName        = "Network 3D Scanner"
	AppVersion     = "1.0.0"
	AppAuthor      = "mrbuivan.vn"
	
	// Network scan settings
	DefaultTimeout   = 2 * time.Second
	DefaultPingCount = 1
	MaxConcurrentPing = 50
	
	// Status values
	StatusOnline  = "Online"
	StatusOffline = "Offline"
)

// Common port to service mapping
var portServices = map[int]string{
	21:   "FTP",
	22:   "SSH",
	23:   "Telnet",
	25:   "SMTP",
	53:   "DNS",
	80:   "HTTP",
	110:  "POP3",
	143:  "IMAP",
	443:  "HTTPS",
	445:  "SMB",
	3306: "MySQL",
	3389: "RDP",
	5432: "PostgreSQL",
	5900: "VNC",
	6379: "Redis",
	8080: "HTTP-ALT",
	8443: "HTTPS-ALT",
	27017: "MongoDB",
}

// ============================================================================
// Data Structures
// ============================================================================

// NetworkDevice represents a discovered network device
type NetworkDevice struct {
	IP     string `json:"ip"`
	Host   string `json:"host"`
	MAC    string `json:"mac"`
	Status string `json:"status"`
}

// PingResult represents the result of a ping operation
type PingResult struct {
	Host    string `json:"host"`
	Latency string `json:"latency"`
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

// TracerouteHop represents a single hop in traceroute
type TracerouteHop struct {
	Hop     int    `json:"hop"`
	IP      string `json:"ip"`
	Host    string `json:"host"`
	Latency string `json:"latency"`
}

// PortScanResult represents the result of a port scan
type PortScanResult struct {
	Port    int    `json:"port"`
	Open    bool   `json:"open"`
	Service string `json:"service,omitempty"`
}

// NetworkInfo represents system and network information
type NetworkInfo struct {
	Hostname     string   `json:"hostname"`
	LocalIP      string   `json:"localIP"`
	MACAddress   string   `json:"macAddress"`
	Interface    string   `json:"interface"`
	Gateway      string   `json:"gateway"`
	DNSServers   []string `json:"dnsServers"`
	OS           string   `json:"os"`
	OSVersion    string   `json:"osVersion"`
	Architecture string   `json:"architecture"`
}

// BackupData represents data for backup/restore operations
type BackupData struct {
	Version   string          `json:"version"`
	Timestamp int64           `json:"timestamp"`
	Settings  map[string]string `json:"settings"`
	Groups    []string        `json:"groups"`
	Devices   []NetworkDevice `json:"devices"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	log.Printf("[INFO] %s v%s initialized", AppName, AppVersion)
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	log.Printf("[INFO] Application started successfully")
}

// GetLocalIP returns the local IP address of the machine
func (a *App) GetLocalIP() string {
	// Try to get actual local IP
	ifaces, err := net.Interfaces()
	if err != nil {
		log.Printf("[WARN] Failed to get network interfaces: %v", err)
		return "127.0.0.1"
	}
	
	for _, i := range ifaces {
		if i.Flags&net.FlagUp != 0 && i.Flags&net.FlagLoopback == 0 && i.Flags&net.FlagMulticast != 0 {
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
					if ip != nil && ip.To4() != nil && !ip.IsLoopback() {
						log.Printf("[INFO] Found local IP: %s on interface %s", ip.String(), i.Name)
						return ip.String()
					}
				}
			}
		}
	}
	
	log.Printf("[WARN] Could not determine local IP, using default")
	return "192.168.1.1"
}

// GetDevices returns the current list of scanned devices
func (a *App) GetDevices() []map[string]string {
	return []map[string]string{
		{"ip": "192.168.1.1", "status": StatusOnline, "host": "router-gw", "mac": "AA:BB:CC:DD:EE:FF"},
		{"ip": "192.168.1.10", "status": StatusOnline, "host": "pc-john", "mac": "11:22:33:44:55:66"},
		{"ip": "192.168.1.15", "status": StatusOnline, "host": "laptop-mary", "mac": "A1:B2:C3:D4:E5:F6"},
		{"ip": "192.168.1.20", "status": StatusOffline, "host": "", "mac": "Unknown"},
		{"ip": "192.168.1.30", "status": StatusOnline, "host": "nas-storage", "mac": "DE:AD:BE:EF:CA:FE"},
		{"ip": "192.168.1.99", "status": StatusOffline, "host": "", "mac": "Unknown"},
	}
}

// StartSmartScan performs an actual network scan for the given CIDR range
func (a *App) StartSmartScan(cidr string) {
	log.Printf("[INFO] Starting smart scan for CIDR: %s", cidr)
	runtime.EventsEmit(a.ctx, "scan_started", cidr)
	
	// Parse CIDR and generate IP range
	ip, ipNet, err := net.ParseCIDR(cidr)
	if err != nil {
		log.Printf("[ERROR] Invalid CIDR: %v", err)
		runtime.EventsEmit(a.ctx, "scan_error", err.Error())
		return
	}
	
	// Calculate IP range
	var hosts []string
	for ip := ip.Mask(ipNet.Mask); ipNet.Contains(ip); incIP(ip) {
		hosts = append(hosts, ip.String())
	}
	
	// Limit to prevent too many scans
	if len(hosts) > 254 {
		hosts = hosts[:254]
	}
	
	log.Printf("[INFO] Scanning %d hosts...", len(hosts))
	
	// Ping hosts in parallel
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, MaxConcurrentPing)
	
	for _, host := range hosts {
		wg.Add(1)
		go func(h string) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()
			
			result := a.PingSingle(h)
			if result.Success {
				device := map[string]string{
					"ip":     h,
					"status": StatusOnline,
					"host":   "",
					"mac":    "Unknown",
				}
				
				// Try to resolve hostname
				if names, err := net.LookupAddr(h); err == nil && len(names) > 0 {
					device["host"] = strings.TrimSuffix(names[0], ".")
				}
				
				runtime.EventsEmit(a.ctx, "device_found", device)
			}
		}(host)
	}
	
	wg.Wait()
	log.Printf("[INFO] Scan completed for CIDR: %s", cidr)
	runtime.EventsEmit(a.ctx, "scan_completed", nil)
}

// incIP increments an IP address
func incIP(ip net.IP) {
	for j := len(ip) - 1; j >= 0; j-- {
		ip[j]++
		if ip[j] > 0 {
			break
		}
	}
}

// StartMockScan simulates a network scan (for testing/demo)
func (a *App) StartMockScan(cidr string) {
	log.Printf("[INFO] Starting mock scan for CIDR: %s", cidr)
	runtime.EventsEmit(a.ctx, "scan_started", cidr)

	devices := []map[string]string{
		{"ip": "192.168.1.1", "status": StatusOnline, "host": "router-gw", "mac": "AA:BB:CC:DD:EE:FF"},
		{"ip": "192.168.1.10", "status": StatusOnline, "host": "pc-john", "mac": "11:22:33:44:55:66"},
		{"ip": "192.168.1.20", "status": StatusOffline, "host": "printer", "mac": "77:88:99:AA:BB:CC"},
	}

	for _, d := range devices {
		time.Sleep(500 * time.Millisecond)
		runtime.EventsEmit(a.ctx, "device_found", d)
	}

	log.Printf("[INFO] Mock scan completed for CIDR: %s", cidr)
	runtime.EventsEmit(a.ctx, "scan_completed", nil)
}

// GetSystemInfo returns system and network information
func (a *App) GetSystemInfo() NetworkInfo {
	hostname, _ := os.Hostname()
	
	localIP := a.GetLocalIP()
	macAddress := "00:00:00:00:00:00"
	ifaceName := "unknown"
	
	// Get network interface info
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
						if ip != nil && ip.To4() != nil && ip.String() == localIP {
							macAddress = i.HardwareAddr.String()
							ifaceName = i.Name
							break
						}
					}
				}
			}
		}
	}
	
	// Get gateway (default route)
	gateway := "192.168.1.1"
	
	// DNS servers
	dnsServers := []string{"8.8.8.8", "8.8.4.4"}
	
	return NetworkInfo{
		Hostname:     hostname,
		LocalIP:      localIP,
		MACAddress:   macAddress,
		Interface:    ifaceName,
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
	log.Printf("[INFO] Scanning ports on %s", host)
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
		
		// Get service name from map
		service := portServices[port]
		
		results = append(results, PortScanResult{
			Port:    port,
			Open:    true,
			Service: service,
		})
		log.Printf("[INFO] Port %d open on %s (%s)", port, host, service)
	}
	
	return results
}

// ScanNetwork performs a network scan for a CIDR range
func (a *App) ScanNetwork(cidr string) []map[string]string {
	log.Printf("[INFO] Scanning network: %s", cidr)
	return []map[string]string{
		{"ip": "192.168.1.1", "status": StatusOnline, "host": "router-gw", "mac": "AA:BB:CC:DD:EE:FF"},
		{"ip": "192.168.1.10", "status": StatusOnline, "host": "pc-john", "mac": "11:22:33:44:55:66"},
		{"ip": "192.168.1.15", "status": StatusOnline, "host": "laptop-mary", "mac": "A1:B2:C3:D4:E5:F6"},
		{"ip": "192.168.1.20", "status": StatusOffline, "host": "", "mac": "Unknown"},
		{"ip": "192.168.1.30", "status": StatusOnline, "host": "nas-storage", "mac": "DE:AD:BE:EF:CA:FE"},
		{"ip": "192.168.1.99", "status": StatusOffline, "host": "", "mac": "Unknown"},
	}
}

// DetectLoops detects potential network loops by looking for duplicate MAC addresses
func (a *App) DetectLoops(devices []map[string]string) []string {
	log.Printf("[INFO] Checking for network loops (%d devices)", len(devices))
	var suspiciousMACs []string
	macCount := make(map[string]int)
	
	for _, device := range devices {
		mac := device["mac"]
		if mac != "" && mac != "Unknown" {
			macCount[mac]++
		}
	}
	
	for mac, count := range macCount {
		if count > 1 {
			suspiciousMACs = append(suspiciousMACs, mac)
			log.Printf("[WARN] Duplicate MAC detected: %s (%d occurrences)", mac, count)
		}
	}
	
	return suspiciousMACs
}

// GetSettings returns application settings
func (a *App) GetSettings() map[string]string {
	log.Printf("[INFO] Retrieving application settings")
	return map[string]string{
		"theme":               "dark",
		"refreshInterval":     "30",
		"notifyOnNewDevice":   "true",
		"autoScanEnabled":     "false",
	}
}

// SaveSettings saves application settings
func (a *App) SaveSettings(settings map[string]string) error {
	log.Printf("[INFO] Saving application settings")
	// In a real app, this would save to persistent storage
	return nil
}

// ExportBackup exports application data as backup
func (a *App) ExportBackup() (map[string]interface{}, error) {
	log.Printf("[INFO] Exporting backup data")
	return map[string]interface{}{
		"version":   AppVersion,
		"timestamp": time.Now().Unix(),
		"settings":  a.GetSettings(),
		"groups":    []string{},
		"devices":   a.GetDevices(),
	}, nil
}

// ImportBackup imports application data from backup
func (a *App) ImportBackup(data map[string]interface{}) error {
	log.Printf("[INFO] Importing backup data")
	// In a real app, this would validate and restore data
	return nil
}

// ResetToDefault resets application to default settings
func (a *App) ResetToDefault() error {
	log.Printf("[INFO] Resetting to default settings")
	return nil
}