import SwiftUI

public struct TacticalTerminalView: View {
    @StateObject private var bleMesh = CoreBluetoothMesh()
    private let audioEngine = UltrasonicAudioEngine()

    @State private var inputMessage: String = ""
    @State private var packetLogs: [PacketLog] = [
        PacketLog(timestamp: "14:02:11", source: "LOCAL", message: "CYBERDECK TACTICAL CORE ONLINE", isAirgap: false),
        PacketLog(timestamp: "14:02:15", source: "AIRGAP", message: "ACOUSTIC MODEM SYNCED @ 18.5-19.5kHz", isAirgap: true),
        PacketLog(timestamp: "14:02:22", source: "MESH", message: "DISCOVERY BEACON PROPAGATED // 0 HOP", isAirgap: false)
    ]
    @State private var sweepAngle: Double = 0

    public init() {}

    public var body: some View {
        ZStack {
            Color(red: 0.02, green: 0.03, blue: 0.04).ignoresSafeArea()

            VStack(spacing: 12) {
                // Header Status
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("CYBERDECK // NEURO-MESH")
                            .font(.system(.caption, design: .monospaced))
                            .fontWeight(.bold)
                            .foregroundColor(Color(red: 0.0, green: 1.0, blue: 0.4))
                        Text("iOS SECURE AIRGAP & BLE TRANSCEIVER")
                            .font(.system(size: 8, design: .monospaced))
                            .foregroundColor(.cyan)
                    }
                    Spacer()
                    Text("PEERS: \(bleMesh.discoveredPeers.count)")
                        .font(.system(.caption, design: .monospaced))
                        .fontWeight(.bold)
                        .foregroundColor(bleMesh.discoveredPeers.isEmpty ? .orange : Color(red: 0.0, green: 1.0, blue: 0.4))
                }
                .padding(10)
                .background(Color(red: 0.05, green: 0.07, blue: 0.09))
                .border(Color(red: 0.1, green: 0.2, blue: 0.15), width: 1)

                // Tactical Radar HUD
                ZStack {
                    Color(red: 0.05, green: 0.07, blue: 0.09)
                    Canvas { context, size in
                        let center = CGPoint(x: size.width / 2, y: size.height / 2)
                        let radius = size.width / 2

                        // Rings
                        for step in 1...4 {
                            let ringRadius = radius * CGFloat(step) / 4.0
                            context.stroke(
                                Path(ellipseIn: CGRect(x: center.x - ringRadius, y: center.y - ringRadius, width: ringRadius * 2, height: ringRadius * 2)),
                                with: .color(Color(red: 0.0, green: 0.3, blue: 0.1)),
                                lineWidth: 1
                            )
                        }

                        // Sweep Beam
                        let rad = sweepAngle * .pi / 180.0
                        let endPoint = CGPoint(x: center.x + radius * cos(rad), y: center.y + radius * sin(rad))
                        var beamPath = Path()
                        beamPath.move(to: center)
                        beamPath.addLine(to: endPoint)
                        context.stroke(beamPath, with: .color(Color(red: 0.0, green: 1.0, blue: 0.4).opacity(0.8)), lineWidth: 2)
                    }
                    .padding(8)

                    Text("TACTICAL PROXIMITY GRID")
                        .font(.system(size: 8, design: .monospaced))
                        .foregroundColor(Color(red: 0.0, green: 0.4, blue: 0.2))
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        .padding(6)
                }
                .frame(height: 200)
                .border(Color(red: 0.1, green: 0.2, blue: 0.15), width: 1)

                // Terminal Packet Stream
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 4) {
                        ForEach(packetLogs.reversed()) { log in
                            HStack(alignment: .top, spacing: 6) {
                                Text("[\(log.timestamp)]")
                                    .font(.system(size: 9, design: .monospaced))
                                    .foregroundColor(Color(red: 0.0, green: 0.4, blue: 0.2))
                                Text("<\(log.source)>")
                                    .font(.system(size: 9, design: .monospaced))
                                    .fontWeight(.bold)
                                    .foregroundColor(log.isAirgap ? .orange : .cyan)
                                Text(log.message)
                                    .font(.system(size: 9, design: .monospaced))
                                    .foregroundColor(Color(red: 0.0, green: 1.0, blue: 0.4))
                            }
                        }
                    }
                    .padding(8)
                }
                .background(Color(red: 0.05, green: 0.07, blue: 0.09))
                .border(Color(red: 0.1, green: 0.2, blue: 0.15), width: 1)

                // Input Bar
                HStack(spacing: 6) {
                    TextField("Enter broadcast...", text: $inputMessage)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundColor(Color(red: 0.0, green: 1.0, blue: 0.4))
                        .padding(8)
                        .background(Color(red: 0.05, green: 0.07, blue: 0.09))
                        .border(Color(red: 0.1, green: 0.2, blue: 0.15), width: 1)

                    Button("BLE TX") {
                        sendPacket(isAirgap: false)
                    }
                    .font(.system(size: 10, design: .monospaced))
                    .padding(8)
                    .background(Color(red: 0.0, green: 0.3, blue: 0.1))
                    .foregroundColor(Color(red: 0.0, green: 1.0, blue: 0.4))

                    Button("AIRGAP") {
                        sendPacket(isAirgap: true)
                    }
                    .font(.system(size: 10, design: .monospaced))
                    .padding(8)
                    .background(Color.orange.opacity(0.2))
                    .foregroundColor(.orange)
                }
            }
            .padding(12)
        }
        .onAppear {
            bleMesh.startMesh()
            withAnimation(.linear(duration: 3.5).repeatForever(autoreverses: false)) {
                sweepAngle = 360
            }
        }
    }

    private func sendPacket(isAirgap: Bool) {
        guard !inputMessage.isEmpty else { return }
        let now = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
        let data = inputMessage.data(using: .utf8) ?? Data()

        if isAirgap {
            audioEngine.transmitData(data)
            packetLogs.append(PacketLog(timestamp: now, source: "AIRGAP_TX", message: inputMessage, isAirgap: true))
        } else {
            bleMesh.broadcastPacket(data)
            packetLogs.append(PacketLog(timestamp: now, source: "BLE_TX", message: inputMessage, isAirgap: false))
        }
        inputMessage = ""
    }
}

struct PacketLog: Identifiable {
    let id = UUID()
    let timestamp: String
    let source: String
    let message: String
    let isAirgap: Bool
}
