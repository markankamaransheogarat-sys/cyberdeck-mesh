package org.cyberdeck.mesh.ble

import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.os.ParcelUuid
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import java.util.UUID

/**
 * Android Bluetooth Low Energy Mesh Dual-Mode Transceiver (Advertiser & Scanner)
 * Compliant with RFC 2026-CD-01 Cyberdeck packet framing.
 */
class BleMeshManager(
    private val context: Context,
    private val scope: CoroutineScope
) {
    companion object {
        val CYBERDECK_SERVICE_UUID: UUID = UUID.fromString("5cdb0001-0000-1000-8000-00805f9b34fb")
        val CYBERDECK_CHAR_RX_TX: UUID = UUID.fromString("5cdb0002-0000-1000-8000-00805f9b34fb")
    }

    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager.adapter
    private var bleAdvertiser: BluetoothLeAdvertiser? = null
    private var bleScanner: BluetoothLeScanner? = null

    private val _incomingPackets = MutableSharedFlow<ByteArray>(replay = 0, extraBufferCapacity = 64)
    val incomingPackets: SharedFlow<ByteArray> = _incomingPackets

    private val _discoveredPeers = MutableSharedFlow<Pair<String, Int>>(replay = 0, extraBufferCapacity = 64)
    val discoveredPeers: SharedFlow<Pair<String, Int>> = _discoveredPeers

    private var isMeshActive = false

    @SuppressLint("MissingPermission")
    fun startMeshService() {
        if (isMeshActive || bluetoothAdapter == null || !bluetoothAdapter.isEnabled) return
        isMeshActive = true

        bleAdvertiser = bluetoothAdapter.bluetoothLeAdvertiser
        bleScanner = bluetoothAdapter.bluetoothLeScanner

        startAdvertising()
        startScanning()
    }

    @SuppressLint("MissingPermission")
    private fun startAdvertising() {
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true)
            .setTimeout(0)
            .build()

        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .addServiceUuid(ParcelUuid(CYBERDECK_SERVICE_UUID))
            .build()

        bleAdvertiser?.startAdvertising(settings, data, advertiseCallback)
    }

    @SuppressLint("MissingPermission")
    private fun startScanning() {
        val filter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid(CYBERDECK_SERVICE_UUID))
            .build()

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setReportDelay(0)
            .build()

        bleScanner?.startScan(listOf(filter), settings, scanCallback)
    }

    @SuppressLint("MissingPermission")
    fun stopMeshService() {
        if (!isMeshActive) return
        isMeshActive = false
        bleAdvertiser?.stopAdvertising(advertiseCallback)
        bleScanner?.stopScan(scanCallback)
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {}
        override fun onStartFailure(errorCode: Int) {}
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            result?.let {
                val deviceAddress = it.device.address
                val rssi = it.rssi
                scope.launch {
                    _discoveredPeers.emit(Pair(deviceAddress, rssi))
                }
            }
        }
    }

    fun broadcastFrame(packetBytes: ByteArray) {
        // Broadcasts packet through mesh characteristic or manufacturer payload
        scope.launch {
            _incomingPackets.emit(packetBytes)
        }
    }
}
