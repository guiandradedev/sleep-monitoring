#pragma once

#include "sensor_manager.h"

void websocket_init(void);

void websocket_send_ambient_readings(AmbientSensorsReadings *readings);

void websocket_send_mic_readings(MicPacket *packet);
