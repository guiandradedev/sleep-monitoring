#include "websocket_client.h"

#include "esp_timer.h"
#include "esp_log.h"
#include "esp_websocket_client.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "sdkconfig.h"

static const char *TAG = "websocket";
static esp_websocket_client_handle_t client;

SemaphoreHandle_t ws_mutex;

static void websocket_event_handler(void *handler_args, esp_event_base_t base,
                                    int32_t event_id, void *event_data) {
    if (event_id == WEBSOCKET_EVENT_CONNECTED) {
        ESP_LOGI(TAG, "WebSocket connected");
    } else if (event_id == WEBSOCKET_EVENT_DISCONNECTED) {
        ESP_LOGI(TAG, "WebSocket disconnected");
    } else if (event_id == WEBSOCKET_EVENT_ERROR) {
        ESP_LOGE(TAG, "WebSocket error");
    }
}

void websocket_app_start(void) {
    ws_mutex = xSemaphoreCreateMutex();
    esp_websocket_client_config_t cfg = {
        .uri = CONFIG_WEBSOCKET_URI,
    };

    client = esp_websocket_client_init(&cfg);
    esp_websocket_register_events(client, WEBSOCKET_EVENT_ANY,
                                  websocket_event_handler, NULL);
    esp_websocket_client_start(client);
}


void websocket_send_ldr_readings(LdrSensorReading *reading) {
    if (xSemaphoreTake(ws_mutex, pdMS_TO_TICKS(5))) {
        if (esp_websocket_client_is_connected(client)) {
            ESP_LOGI(TAG, "Sending ldr reading: value=%ld, timestamp=%lu",
                        reading->value,
                        (unsigned long)reading->timestamp);
            esp_websocket_client_send_bin(client, (const char *)reading,
                                        sizeof(LdrSensorReading),
                                        portMAX_DELAY);
        }
        xSemaphoreGive(ws_mutex);
    }
}


void websocket_send_dht_readings(DhtSensorReading *reading) {
    if (xSemaphoreTake(ws_mutex, pdMS_TO_TICKS(5))) {
        if (esp_websocket_client_is_connected(client)) {
            ESP_LOGI(TAG, "Sending DHT reading: temp=%d, hum=%d, timestamp=%lu",
                        reading->temperature_value, reading->humidity_value,
                        (unsigned long)reading->timestamp);
            esp_websocket_client_send_bin(client, (const char *)reading,
                                        sizeof(DhtSensorReading),
                                        portMAX_DELAY);
        }
        xSemaphoreGive(ws_mutex);
    }
}


void websocket_send_mic_readings(SensorPacket *packet) {
    uint64_t now = esp_timer_get_time();
    if (xSemaphoreTake(ws_mutex, pdMS_TO_TICKS(5))) {
        uint64_t mutex = esp_timer_get_time();
        if (esp_websocket_client_is_connected(client)) {
            esp_websocket_client_send_bin(client, (const char *)packet,
            sizeof(SensorPacket),
            portMAX_DELAY);
            uint64_t elapsed = esp_timer_get_time();
            ESP_LOGI(TAG, "Sending mic packet: timestamp=%lu, samples[0]=%d ||||||| Mutex took %llu us, send took %llu us",
                (unsigned long)packet->timestamp, packet->samples[0], (mutex - now), (elapsed - mutex));
        }
        xSemaphoreGive(ws_mutex);
    }
}