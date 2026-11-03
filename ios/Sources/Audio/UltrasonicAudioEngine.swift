import Foundation
import AVFoundation

/// iOS CoreAudio Ultrasonic Acoustic Air-Gap Modem (18.5 - 19.5 kHz)
public final class UltrasonicAudioEngine {
    public static let sampleRate: Double = 44100.0
    public static let freqMark: Double = 19500.0     // Bit 1
    public static let freqSpace: Double = 18500.0    // Bit 0
    public static let freqPreamble: Double = 17500.0 // Sync Tone
    public static let baudRate: Double = 100.0       // 10 ms per symbol

    private let engine = AVAudioEngine()
    private let playerNode = AVAudioPlayerNode()

    public init() {
        engine.attach(playerNode)
        let format = AVAudioFormat(standardFormatWithSampleRate: Self.sampleRate, channels: 1)!
        engine.connect(playerNode, to: engine.mainMixerNode, format: format)
        try? engine.start()
    }

    /// Transmits binary data as ultrasonic BFSK sound pulse
    public func transmitData(_ data: Data) {
        let bits = bytesToBits(data)
        let samplesPerBit = Int(Self.sampleRate / Self.baudRate)
        let preambleBits = 8
        let totalSamples = (preambleBits + bits.count) * samplesPerBit

        let format = AVAudioFormat(standardFormatWithSampleRate: Self.sampleRate, channels: 1)!
        guard let pcmBuffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(totalSamples)) else { return }
        pcmBuffer.frameLength = AVAudioFrameCount(totalSamples)

        guard let channelData = pcmBuffer.floatChannelData?[0] else { return }

        var sampleIdx = 0
        var phase: Double = 0.0

        // 1. Preamble sync burst
        let preamblePhaseInc = (2.0 * .pi * Self.freqPreamble) / Self.sampleRate
        for _ in 0..<preambleBits {
            for _ in 0..<samplesPerBit {
                channelData[sampleIdx] = Float(sin(phase) * 0.9)
                sampleIdx += 1
                phase += preamblePhaseInc
            }
        }

        // 2. Modulate payload bits
        for bit in bits {
            let freq = bit == 1 ? Self.freqMark : Self.freqSpace
            let phaseInc = (2.0 * .pi * freq) / Self.sampleRate
            for s in 0..<samplesPerBit {
                let envelope = Float(sin((.pi * Double(s)) / Double(samplesPerBit)))
                channelData[sampleIdx] = Float(sin(phase)) * envelope * 0.95
                sampleIdx += 1
                phase += phaseInc
            }
        }

        if !playerNode.isPlaying { playerNode.play() }
        playerNode.scheduleBuffer(pcmBuffer, at: nil, options: .interrupts, completionHandler: nil)
    }

    private func bytesToBits(_ data: Data) -> [Int] {
        var bits: [Int] = []
        for byte in data {
            for b in (0...7).reversed() {
                bits.append(Int((byte >> b) & 1))
            }
        }
        return bits
    }
}
