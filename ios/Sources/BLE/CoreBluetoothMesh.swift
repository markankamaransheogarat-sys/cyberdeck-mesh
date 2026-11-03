import Foundation
import CoreBluetooth
import Combine

/// iOS Dual-Mode Bluetooth Low Energy Mesh Transceiver
/// Executes simultaneous Peripheral advertisement and Central scanning
public final class CoreBluetoothMesh: NSObject, ObservableObject {
    public static let serviceUUID = CBUUID(string: "5CDB0001-0000-1000-8000-00805F9B34FB")
    public static let packetCharUUID = CBUUID(string: "5CDB0002-0000-1000-8000-00805F9B34FB")

    @Published public private(set) var isScanning = false
    @Published public private(set) var discoveredPeers: [String: Int] = [:] // NodeId -> RSSI
    public let packetSubject = PassthroughSubject<Data, Never>()

    private var centralManager: CBCentralManager!
    private var peripheralManager: CBPeripheralManager!
    private var transferCharacteristic: CBMutableCharacteristic?

    public override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: .global(qos: .userInitiated))
        peripheralManager = CBPeripheralManager(delegate: self, queue: .global(qos: .userInitiated))
    }

    public func startMesh() {
        startScanning()
        startAdvertising()
    }

    public func stopMesh() {
        centralManager.stopScan()
        peripheralManager.stopAdvertising()
        isScanning = false
    }

    private func startScanning() {
        guard centralManager.state == .poweredOn else { return }
        centralManager.scanForPeripherals(
            withServices: [Self.serviceUUID],
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
        )
        isScanning = true
    }

    private func startAdvertising() {
        guard peripheralManager.state == .poweredOn else { return }
        peripheralManager.startAdvertising([
            CBAdvertisementDataServiceUUIDsKey: [Self.serviceUUID],
            CBAdvertisementDataLocalNameKey: "CYBERDECK-NODE"
        ])
    }

    public func broadcastPacket(_ data: Data) {
        packetSubject.send(data)
    }
}

extension CoreBluetoothMesh: CBCentralManagerDelegate {
    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn {
            startScanning()
        }
    }

    public func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        let peerId = peripheral.identifier.uuidString.prefix(8).uppercased()
        DispatchQueue.main.async {
            self.discoveredPeers[String(peerId)] = RSSI.intValue
        }
    }
}

extension CoreBluetoothMesh: CBPeripheralManagerDelegate {
    public func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        if peripheral.state == .poweredOn {
            let characteristic = CBMutableCharacteristic(
                type: Self.packetCharUUID,
                properties: [.read, .writeWithoutResponse, .notify],
                value: nil,
                permissions: [.readable, .writeable]
            )
            let service = CBMutableService(type: Self.serviceUUID, primary: true)
            service.characteristics = [characteristic]
            peripheral.add(service)
            self.transferCharacteristic = characteristic
            startAdvertising()
        }
    }
}
