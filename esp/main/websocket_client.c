#include "websocket_client.h"

#include "cJSON.h"
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

/*
void websocket_send_readings(SensorReading *readings) {
    cJSON *root = cJSON_CreateObject();
    cJSON *data = cJSON_CreateArray();

    if (strcmp(readings[0].name, "temperature") == 0 ||
        strcmp(readings[0].name, "humidity") == 0) {
        cJSON *entry = cJSON_CreateObject();
        cJSON_AddNumberToObject(entry, "temperature", readings[0].value);
        cJSON_AddNumberToObject(entry, "humidity", readings[1].value);
        cJSON_AddNumberToObject(entry, "timestamp", readings[0].timestamp);
        cJSON_AddItemToArray(data, entry);

        cJSON_AddItemToObject(root, "data", data);
        cJSON_AddStringToObject(root, "type", "dht");
    } else {
        cJSON *entry = cJSON_CreateObject();
        cJSON_AddNumberToObject(entry, "sample", readings->value);
        cJSON_AddNumberToObject(entry, "timestamp", readings->timestamp);
        cJSON_AddItemToArray(data, entry);

        cJSON_AddItemToObject(root, "data", data);
        cJSON_AddStringToObject(root, "type", readings->name);
    }

    char *json = cJSON_PrintUnformatted(root);

    if (xSemaphoreTake(ws_mutex, pdMS_TO_TICKS(100))) {
        if (esp_websocket_client_is_connected(client)) {
            ESP_LOGI(TAG, "Sending data: %s", json);
            esp_websocket_client_send_text(client, json, strlen(json),
                                           portMAX_DELAY);
        }
        xSemaphoreGive(ws_mutex);
    }

    cJSON_free(json);
    cJSON_Delete(root);
}*/

void websocket_send_noise_readings(SensorPacket *packet) {
    if (xSemaphoreTake(ws_mutex, pdMS_TO_TICKS(5))) {
        if (esp_websocket_client_is_connected(client)) {
            ESP_LOGI(TAG, "Sending noise packet: timestamp=%lu, samples[0]=%d",
                   (unsigned long)packet->timestamp, packet->samples[0]);
            esp_websocket_client_send_bin(client, (const char *)packet,
                                            sizeof(SensorPacket),
                                            portMAX_DELAY);
        }
        xSemaphoreGive(ws_mutex);
    }
}