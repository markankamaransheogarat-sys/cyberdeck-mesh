/**
 * Cyberdeck RF & Acoustic Signal Telemetry Analyzer
 */

export interface NodeProximity {
  nodeId: string;
  rssi: number;
  estimatedDistanceMeters: number;
  signalQualityPercent: number;
  linkHealth: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL' | 'UNREACHABLE';
}

export class SignalAnalyzer {
  private static TX_POWER_AT_1M = -59; // Measured reference RSSI at 1 meter for standard BLE
  private static PATH_LOSS_EXPONENT = 2.4; // Typical indoor/tactical RF path loss exponent

  /**
   * Estimates physical distance in meters using Log-Distance Path Loss Model
   * Formula: d = 10 ^ ((TxPower - RSSI) / (10 * n))
   */
  public static calculateDistance(rssi: number): number {
    if (rssi === 0) return -1.0;
    const ratio = (this.TX_POWER_AT_1M - rssi) / (10 * this.PATH_LOSS_EXPONENT);
    const distance = Math.pow(10, ratio);
    return Math.round(distance * 10) / 10;
  }

  /**
   * Normalizes RSSI (-100 dBm to -40 dBm) into an intuitive 0–100% quality rating
   */
  public static calculateQuality(rssi: number): number {
    if (rssi >= -45) return 100;
    if (rssi <= -95) return 0;
    return Math.round(((rssi + 95) / 50) * 100);
  }

  public static evaluateProximity(nodeId: string, rssi: number): NodeProximity {
    const quality = this.calculateQuality(rssi);
    const distance = this.calculateDistance(rssi);

    let linkHealth: NodeProximity['linkHealth'] = 'UNREACHABLE';
    if (quality >= 75) linkHealth = 'OPTIMAL';
    else if (quality >= 40) linkHealth = 'DEGRADED';
    else if (quality > 0) linkHealth = 'CRITICAL';

    return {
      nodeId,
      rssi,
      estimatedDistanceMeters: distance,
      signalQualityPercent: quality,
      linkHealth,
    };
  }
}
