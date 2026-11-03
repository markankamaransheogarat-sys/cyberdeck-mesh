package org.cyberdeck.mesh.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily

val CyberGreen = Color(0xFF00FF66)
val CyberGreenDim = Color(0xFF00441B)
val CyberAmber = Color(0xFFFFB000)
val CyberCrimson = Color(0xFFFF2A5F)
val CyberCyan = Color(0xFF00F0FF)
val CyberVoid = Color(0xFF05080A)
val CyberSurface = Color(0xFF0C1217)
val CyberBorder = Color(0xFF1E302B)

private val CyberColorScheme = darkColorScheme(
    primary = CyberGreen,
    secondary = CyberCyan,
    tertiary = CyberAmber,
    error = CyberCrimson,
    background = CyberVoid,
    surface = CyberSurface,
    onPrimary = Color.Black,
    onBackground = CyberGreen,
    onSurface = CyberGreen
)

@Composable
fun CyberdeckTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = CyberColorScheme,
        content = content
    )
}
