interface GeoLocation {
  ip: string;
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp: string;
  riskScore: number;
  isVPN: boolean;
  isProxy: boolean;
  isTor: boolean;
}

interface ThreatLocation {
  id: string;
  ip: string;
  location: GeoLocation;
  timestamp: string;
  threatType: string;
  riskScore: number;
  fraudSignalId: string;
  eventDetails: any;
}

const threatLocations: ThreatLocation[] = [];
const ipCache = new Map<string, GeoLocation>();

export const GeoIPService = {
  async analyzeIP(ip: string): Promise<GeoLocation> {
    // Check cache first
    if (ipCache.has(ip)) {
      return ipCache.get(ip)!;
    }

    // For demo purposes, simulate geo-location lookup
    // In production, integrate with services like MaxMind, IPapi, or similar
    const geoData = this.simulateGeoLookup(ip);
    
    // Cache the result
    ipCache.set(ip, geoData);
    
    return geoData;
  },

  simulateGeoLookup(ip: string): GeoLocation {
    // Simulate different threat patterns based on IP patterns
    const lastOctet = parseInt(ip.split('.').pop() || '0');
    
    const locations = [
      {
        country: 'Russia',
        region: 'Moscow Oblast',
        city: 'Moscow',
        latitude: 55.7558,
        longitude: 37.6176,
        timezone: 'Europe/Moscow',
        isp: 'Yandex LLC',
        baseRisk: 85
      },
      {
        country: 'China',
        region: 'Beijing',
        city: 'Beijing',
        latitude: 39.9042,
        longitude: 116.4074,
        timezone: 'Asia/Shanghai',
        isp: 'China Telecom',
        baseRisk: 75
      },
      {
        country: 'Nigeria',
        region: 'Lagos',
        city: 'Lagos',
        latitude: 6.5244,
        longitude: 3.3792,
        timezone: 'Africa/Lagos',
        isp: 'MTN Nigeria',
        baseRisk: 90
      },
      {
        country: 'Romania',
        region: 'Bucharest',
        city: 'Bucharest',
        latitude: 44.4268,
        longitude: 26.1025,
        timezone: 'Europe/Bucharest',
        isp: 'RCS & RDS',
        baseRisk: 70
      },
      {
        country: 'United States',
        region: 'California',
        city: 'Los Angeles',
        latitude: 34.0522,
        longitude: -118.2437,
        timezone: 'America/Los_Angeles',
        isp: 'Cloudflare Inc',
        baseRisk: 25
      },
      {
        country: 'Germany',
        region: 'Berlin',
        city: 'Berlin',
        latitude: 52.5200,
        longitude: 13.4050,
        timezone: 'Europe/Berlin',
        isp: 'Deutsche Telekom AG',
        baseRisk: 15
      }
    ];

    const locationIndex = lastOctet % locations.length;
    const selectedLocation = locations[locationIndex];

    // Add some variability to risk scoring
    const riskVariation = (lastOctet % 30) - 15; // -15 to +15
    const finalRiskScore = Math.max(0, Math.min(100, selectedLocation.baseRisk + riskVariation));

    // Determine if it's a VPN/Proxy/Tor based on risk score and patterns
    const isHighRisk = finalRiskScore > 60;
    const isVPN = isHighRisk && (lastOctet % 4 === 0);
    const isProxy = isHighRisk && (lastOctet % 7 === 0);
    const isTor = finalRiskScore > 80 && (lastOctet % 11 === 0);

    return {
      ip,
      ...selectedLocation,
      riskScore: finalRiskScore,
      isVPN,
      isProxy,
      isTor
    };
  },

  logThreatLocation(ip: string, threatType: string, riskScore: number, fraudSignalId: string, eventDetails: any): void {
    this.analyzeIP(ip).then(location => {
      const threatLocation: ThreatLocation = {
        id: 'threat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        ip,
        location,
        timestamp: new Date().toISOString(),
        threatType,
        riskScore,
        fraudSignalId,
        eventDetails
      };

      threatLocations.push(threatLocation);

      // Keep only the last 100 threat locations to prevent memory issues
      if (threatLocations.length > 100) {
        threatLocations.shift();
      }
    });
  },

  getThreatMap(): ThreatLocation[] {
    return threatLocations.slice(-50).reverse();
  },

  getThreatStats() {
    const total = threatLocations.length;
    const lastHour = threatLocations.filter(t => 
      new Date(t.timestamp).getTime() > Date.now() - (60 * 60 * 1000)
    ).length;

    const byCountry = threatLocations.reduce((acc, threat) => {
      const country = threat.location.country;
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byThreatType = threatLocations.reduce((acc, threat) => {
      acc[threat.threatType] = (acc[threat.threatType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgRiskScore = threatLocations.length > 0 
      ? threatLocations.reduce((sum, t) => sum + t.riskScore, 0) / threatLocations.length 
      : 0;

    const vpnCount = threatLocations.filter(t => t.location.isVPN).length;
    const proxyCount = threatLocations.filter(t => t.location.isProxy).length;
    const torCount = threatLocations.filter(t => t.location.isTor).length;

    return {
      total,
      lastHour,
      byCountry,
      byThreatType,
      avgRiskScore: Math.round(avgRiskScore),
      vpnCount,
      proxyCount,
      torCount
    };
  },

  clearThreatData(): void {
    threatLocations.length = 0;
    ipCache.clear();
  }
};