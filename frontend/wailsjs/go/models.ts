export namespace main {
	
	export class NetworkInfo {
	    hostname: string;
	    localIP: string;
	    macAddress: string;
	    interface: string;
	    gateway: string;
	    dnsServers: string[];
	    os: string;
	    osVersion: string;
	    architecture: string;
	
	    static createFrom(source: any = {}) {
	        return new NetworkInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hostname = source["hostname"];
	        this.localIP = source["localIP"];
	        this.macAddress = source["macAddress"];
	        this.interface = source["interface"];
	        this.gateway = source["gateway"];
	        this.dnsServers = source["dnsServers"];
	        this.os = source["os"];
	        this.osVersion = source["osVersion"];
	        this.architecture = source["architecture"];
	    }
	}
	export class PingResult {
	    host: string;
	    latency: string;
	    success: boolean;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new PingResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.host = source["host"];
	        this.latency = source["latency"];
	        this.success = source["success"];
	        this.error = source["error"];
	    }
	}
	export class PortScanResult {
	    port: number;
	    open: boolean;
	    service?: string;
	
	    static createFrom(source: any = {}) {
	        return new PortScanResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.port = source["port"];
	        this.open = source["open"];
	        this.service = source["service"];
	    }
	}
	export class TracerouteHop {
	    hop: number;
	    ip: string;
	    host: string;
	    latency: string;
	
	    static createFrom(source: any = {}) {
	        return new TracerouteHop(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hop = source["hop"];
	        this.ip = source["ip"];
	        this.host = source["host"];
	        this.latency = source["latency"];
	    }
	}

}

