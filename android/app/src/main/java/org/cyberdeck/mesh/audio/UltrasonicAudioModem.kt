package org.cyberdeck.mesh.audio

import android.annotation.SuppressLint
import android.media.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlin.math.*

/**
 * Android Hardware Ultrasonic Acoustic Modem (18.5 kHz - 19.5 kHz FSK)
 * Enables air-gapped data transmission through device speaker & microphone.
 */
class UltrasonicAudioModem(
    private val scope: CoroutineScope
) {
    companion object {
        const val SAMPLE_RATE = 44100
        const val FREQ_MARK = 19500.0     // Bit 1
        const val FREQ_SPACE = 18500.0    // Bit 0
        const val FREQ_PREAMBLE = 17500.0 // Sync Tone
        const val BAUD_RATE = 100         // 100 baud (10 ms per symbol)
    }

    private val samplesPerBit = SAMPLE_RATE / BAUD_RATE
    private var isListening = false
    private var audioRecord: AudioRecord? = null

    private val _receivedPackets = MutableSharedFlow<ByteArray>(replay = 0, extraBufferCapacity = 32)
    val receivedPackets: SharedFlow<ByteArray> = _receivedPackets

    private val _audioFftSpectrum = MutableSharedFlow<FloatArray>(replay = 0, extraBufferCapacity = 8)
    val audioFftSpectrum: SharedFlow<FloatArray> = _audioFftSpectrum

    /**
     * Transmits binary packet as inaudible ultrasonic sound burst
     */
    fun transmitPacket(data: ByteArray) = scope.launch(Dispatchers.IO) {
        val bits = bytesToBits(data)
        val preambleBits = 8
        val totalSamples = (preambleBits + bits.size) * samplesPerBit
        val pcm = ShortArray(totalSamples)

        var sampleIdx = 0
        var phase = 0.0

        // 1. Generate Preamble Tone
        val preamblePhaseInc = (2.0 * Math.PI * FREQ_PREAMBLE) / SAMPLE_RATE
        for (b in 0 until preambleBits) {
            for (s in 0 until samplesPerBit) {
                pcm[sampleIdx++] = (sin(phase) * 32000).toInt().toShort()
                phase += preamblePhaseInc
            }
        }

        // 2. Modulate FSK bits
        for (bit in bits) {
            val freq = if (bit == 1) FREQ_MARK else FREQ_SPACE
            val phaseInc = (2.0 * Math.PI * freq) / SAMPLE_RATE
            for (s in 0 until samplesPerBit) {
                val envelope = sin((Math.PI * s) / samplesPerBit)
                pcm[sampleIdx++] = (sin(phase) * envelope * 32000).toInt().toShort()
                phase += phaseInc
            }
        }

        // Play via AudioTrack
        val audioTrack = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(pcm.size * 2)
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()

        audioTrack.write(pcm, 0, pcm.size)
        audioTrack.play()
        delay((totalSamples * 1000L) / SAMPLE_RATE + 100)
        audioTrack.release()
    }

    @SuppressLint("MissingPermission")
    fun startListening() = scope.launch(Dispatchers.IO) {
        if (isListening) return@launch
        isListening = true

        val bufferSize = max(
            AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT),
            samplesPerBit * 4
        )

        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize
        )

        audioRecord?.startRecording()
        val readBuffer = ShortArray(samplesPerBit)

        while (isListening && isActive) {
            val read = audioRecord?.read(readBuffer, 0, readBuffer.size) ?: 0
            if (read > 0) {
                // Compute discrete frequency powers
                val pMark = computeGoertzelPower(readBuffer, FREQ_MARK)
                val pSpace = computeGoertzelPower(readBuffer, FREQ_SPACE)
                val pPreamble = computeGoertzelPower(readBuffer, FREQ_PREAMBLE)

                // Emit live spectrum snapshot for HUD visualizer
                _audioFftSpectrum.emit(floatArrayOf(pPreamble, pSpace, pMark))
            }
        }
    }

    fun stopListening() {
        isListening = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }

    private fun computeGoertzelPower(samples: ShortArray, targetFreq: Double): Float {
        val k = (samples.size * targetFreq / SAMPLE_RATE).roundToInt()
        val omega = (2.0 * Math.PI * k) / samples.size
        val coeff = 2.0 * cos(omega)

        var sPrev = 0.0
        var sPrev2 = 0.0

        for (sample in samples) {
            val s = (sample.toDouble() / 32768.0) + coeff * sPrev - sPrev2
            sPrev2 = sPrev
            sPrev = s
        }

        val power = sPrev * sPrev + sPrev2 * sPrev2 - sPrev * sPrev2 * coeff
        return max(0.0, power).toFloat()
    }

    private fun bytesToBits(bytes: ByteArray): List<Int> {
        val bits = mutableListOf<Int>()
        for (b in bytes) {
            val byteVal = b.toInt() and 0xFF
            for (i in 7 downTo 0) {
                bits.add((byteVal shr i) and 1)
            }
        }
        return bits
    }
}
