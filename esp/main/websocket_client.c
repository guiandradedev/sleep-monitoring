#include "websocket_client.h"

#include "esp_log.h"
#include "esp_timer.h"
#include "esp_websocket_client.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "sdkconfig.h"

static const char *TAG = "websocket_client";
static esp_websocket_client_handle_t client;

SemaphoreHandle_t ws_mutex;

// --- Função de callback para eventos do WebSocket ---
// É chamada quando ocorrem eventos do WebSocket de conexão, desconexão e erro.
// TODO: Talvez melhorar depois
static void websocket_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
    if (event_id == WEBSOCKET_EVENT_CONNECTED) {
        ESP_LOGI(TAG, "WebSocket connected");
    } else if (event_id == WEBSOCKET_EVENT_DISCONNECTED) {
        ESP_LOGI(TAG, "WebSocket disconnected");
    } else if (event_id == WEBSOCKET_EVENT_ERROR) {
        ESP_LOGE(TAG, "WebSocket error");
    }
}

// --- Função que inicializa o cliente WebSocket e registra os eventos ---
void websocket_init(void) {
    ws_mutex = xSemaphoreCreateMutex();
    esp_websocket_client_config_t cfg = {
        .uri = CONFIG_WEBSOCKET_URI,
    };

    client = esp_websocket_client_init(&cfg);
    esp_websocket_register_events(client, WEBSOCKET_EVENT_ANY, websocket_event_handler, NULL);
    esp_websocket_client_start(client);
}

// --- Função que envia leituras de sensores ambientais via WebSocket ---
void websocket_send_ambient_readings(AmbientSensorsReadings *reading) {
    if (xSemaphoreTake(ws_mutex, pdMS_TO_TICKS(5))) {
        if (esp_websocket_client_is_connected(client)) {
            esp_websocket_client_send_bin(client, (const char *)reading, sizeof(AmbientSensorsReadings), portMAX_DELAY);
            ESP_LOGI(TAG,
                     "Sending ambient reading: timestamp = %lu, luminosity = %ld, temperature = %d, humidity = %d",
                     (unsigned long)reading->timestamp,
                     reading->luminosity_value,
                     reading->temperature_value,
                     reading->humidity_value);
        }
        xSemaphoreGive(ws_mutex);
    }
}

// --- Função que envia pacotes de áudio do microfone via WebSocket ---
void websocket_send_mic_readings(MicPacket *packet) {
    uint64_t now = esp_timer_get_time();
    if (xSemaphoreTake(ws_mutex, pdMS_TO_TICKS(5))) {
        if (esp_websocket_client_is_connected(client)) {
            esp_websocket_client_send_bin(client, (const char *)packet, sizeof(MicPacket), portMAX_DELAY);
            uint64_t elapsed = esp_timer_get_time();
            ESP_LOGI(TAG,
                     "Sending mic packet: timestamp = %lu, samples[0] = %d | Took %llu us",
                     (unsigned long)packet->timestamp,
                     packet->samples[0],
                     (elapsed - now));
        }
        xSemaphoreGive(ws_mutex);
    }
}