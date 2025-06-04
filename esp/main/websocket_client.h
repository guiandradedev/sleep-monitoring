#pragma once
#include <stddef.h>  // para size_t

#include "sensor_manager.h"

void websocket_app_start(void);
void websocket_send_readings(SensorReading *readings);
void websocket_send_noise_readings(SensorPacket *packet);
