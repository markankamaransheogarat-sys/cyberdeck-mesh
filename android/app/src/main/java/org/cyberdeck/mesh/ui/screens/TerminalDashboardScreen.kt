package org.cyberdeck.mesh.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.cyberdeck.mesh.ui.components.*
import org.cyberdeck.mesh.ui.theme.*

data class TerminalLogEntry(
    val timestamp: String,
    val source: String,
    val message: String,
    val isAirgap: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TerminalDashboardScreen(
    localNodeId: String = "CDB-78A9-91F2",
    discoveredPeers: List<PeerRadarBlip> = emptyList(),
    logEntries: List<TerminalLogEntry> = emptyList(),
    onSendBroadcast: (String) -> Unit = {},
    onTriggerAcousticAirgap: (String) -> Unit = {}
) {
    var inputCommand by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CyberVoid)
            .padding(12.dp)
    ) {
        // --- TOP TELEMETRY BAR ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, CyberBorder, RoundedCornerShape(4.dp))
                .background(CyberSurface)
                .padding(8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "CYBERDECK // NEURO-MESH v1.0",
                    color = CyberGreen,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "NODE: $localNodeId [AIRGAP/BLE ACTIVE]",
                    color = CyberCyan,
                    fontSize = 9.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
            Text(
                text = "PEERS: ${discoveredPeers.size}",
                color = if (discoveredPeers.isNotEmpty()) CyberGreen else CyberAmber,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        // --- TACTICAL RADAR HUD ---
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(210.dp)
                .border(1.dp, CyberBorder, RoundedCornerShape(4.dp))
                .background(CyberSurface),
            contentAlignment = Alignment.Center
        ) {
            TacticalRadarView(
                peers = discoveredPeers,
                modifier = Modifier.fillMaxHeight()
            )
            Text(
                text = "TACTICAL BLE / ACOUSTIC PROXIMITY",
                color = CyberGreenDim,
                fontSize = 8.sp,
                fontFamily = FontFamily.Monospace,
                modifier = Modifier.align(Alignment.TopStart).padding(6.dp)
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        // --- PACKET STREAM TERMINAL ---
        Text(
            text = "DECRYPTED PACKET LOG",
            color = CyberGreen,
            fontSize = 9.sp,
            fontFamily = FontFamily.Monospace
        )
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .border(1.dp, CyberBorder, RoundedCornerShape(4.dp))
                .background(CyberSurface)
                .padding(8.dp),
            reverseLayout = true
        ) {
            items(logEntries) { entry ->
                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
                    Text(
                        text = "[${entry.timestamp}] ",
                        color = CyberGreenDim,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = if (entry.isAirgap) "<ULTRASONIC> " else "<BLE_MESH> ",
                        color = if (entry.isAirgap) CyberAmber else CyberCyan,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = entry.message,
                        color = CyberGreen,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // --- COMMAND TRANSMISSION INPUT ---
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = inputCommand,
                onValueChange = { inputCommand = it },
                modifier = Modifier.weight(1f),
                placeholder = {
                    Text("Enter broadcast message...", color = CyberGreenDim, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = CyberGreen,
                    unfocusedBorderColor = CyberBorder,
                    focusedTextColor = CyberGreen,
                    unfocusedTextColor = CyberGreen
                ),
                singleLine = true
            )
            Spacer(modifier = Modifier.width(6.dp))
            Button(
                onClick = {
                    if (inputCommand.isNotBlank()) {
                        onSendBroadcast(inputCommand)
                        inputCommand = ""
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = CyberGreenDim),
                shape = RoundedCornerShape(4.dp)
            ) {
                Text("BLE TX", color = CyberGreen, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
            }
            Spacer(modifier = Modifier.width(4.dp))
            Button(
                onClick = {
                    if (inputCommand.isNotBlank()) {
                        onTriggerAcousticAirgap(inputCommand)
                        inputCommand = ""
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = CyberAmber.copy(alpha = 0.2f)),
                shape = RoundedCornerShape(4.dp)
            ) {
                Text("AIRGAP", color = CyberAmber, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
            }
        }
    }
}
