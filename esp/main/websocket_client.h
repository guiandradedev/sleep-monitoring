#pragma once
#include <stddef.h>  // para size_t

#include "sensor_manager.h"

void websocket_app_start(void);
void websocket_send_ldr_readings(LdrSensorReading *readings);
void websocket_send_dht_readings(DhtSensorReading *readings);
void websocket_send_mic_readings(SensorPacket *packet);
