package org.cyberdeck.mesh.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import org.cyberdeck.mesh.ui.theme.*
import kotlin.math.*

data class PeerRadarBlip(
    val id: String,
    val angleDeg: Float,
    val distanceRatio: Float, // 0.0 (center) to 1.0 (perimeter)
    val rssi: Int
)

@Composable
fun TacticalRadarView(
    peers: List<PeerRadarBlip>,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "RadarSweep")
    val sweepAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 3500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "Angle"
    )

    Canvas(modifier = modifier.aspectRatio(1f).padding(16.dp)) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val radius = size.width / 2f

        // 1. Concentric Range Rings
        for (step in 1..4) {
            val ringRadius = radius * (step / 4f)
            drawCircle(
                color = CyberGreenDim,
                radius = ringRadius,
                center = center,
                style = Stroke(width = 1.dp.toPx())
            )
        }

        // 2. Crosshairs
        drawLine(
            color = CyberGreenDim,
            start = Offset(center.x, 0f),
            end = Offset(center.x, size.height),
            strokeWidth = 1.dp.toPx()
        )
        drawLine(
            color = CyberGreenDim,
            start = Offset(0f, center.y),
            end = Offset(size.width, center.y),
            strokeWidth = 1.dp.toPx()
        )

        // 3. Rotating Sweep Beam
        val sweepRad = Math.toRadians(sweepAngle.toDouble())
        val beamEnd = Offset(
            (center.x + radius * cos(sweepRad)).toFloat(),
            (center.y + radius * sin(sweepRad)).toFloat()
        )
        drawLine(
            brush = Brush.linearGradient(
                colors = listOf(CyberGreen, Color.Transparent),
                start = center,
                end = beamEnd
            ),
            start = center,
            end = beamEnd,
            strokeWidth = 2.dp.toPx()
        )

        // 4. Peer Blips
        for (peer in peers) {
            val pRad = Math.toRadians(peer.angleDeg.toDouble())
            val pRadius = radius * peer.distanceRatio
            val pX = (center.x + pRadius * cos(pRad)).toFloat()
            val pY = (center.y + pRadius * sin(pRad)).toFloat()

            // Glow ring
            drawCircle(
                color = CyberCyan.copy(alpha = 0.4f),
                radius = 7.dp.toPx(),
                center = Offset(pX, pY)
            )
            // Solid center blip
            drawCircle(
                color = if (peer.rssi > -65) CyberGreen else CyberAmber,
                radius = 3.5.dp.toPx(),
                center = Offset(pX, pY)
            )
        }
    }
}
