#include <time.h>

#include "esp_log.h"
#include "esp_rom_sys.h"
#include "esp_sntp.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "nvs_flash.h"
#include "sensor_manager.h"
#include "websocket_client.h"
#include "wifi_manager.h"

#define NOISE_QUEUE_LENGTH 10

static const char *TAG = "main";

void init_time_sync() {
    esp_sntp_setoperatingmode(SNTP_OPMODE_POLL);
    esp_sntp_setservername(0, "pool.ntp.org");
    esp_sntp_init();

    time_t now;
    struct tm timeinfo = {0};
    int retry = 0;
    const int max_retries = 10;

    while (timeinfo.tm_year < (2016 - 1900) && ++retry < max_retries) {
        ESP_LOGI(TAG, "Aguardando sincronização do tempo...");
        vTaskDelay(pdMS_TO_TICKS(2000));
        time(&now);
        localtime_r(&now, &timeinfo);
    }
}

/* void sensor_task(void *pvParameters) {
    SensorReading readings[5];
    size_t count;

    while (1) {
        read_all_sensors(readings, &count);
        websocket_send_readings(readings, count);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
} */

static QueueHandle_t noise_queue;

// --- Task de coleta de ruído ---
/* void noise_task(void *pvParameters) {
    SensorPacket packet;
    SensorReading reading;

    while (1) {
        // Timestamp da primeira amostra
        struct timeval tv;
        gettimeofday(&tv, NULL);
        packet.timestamp = (tv.tv_sec * 1000) + (tv.tv_usec / 1000);

        // Coleta 8 amostras a cada 125 us (8 kHz)
        for (int i = 0; i < NOISE_SAMPLES_PER_PACKET; ++i) {
            read_noise(&reading);
            packet.samples[i] = (int16_t)reading.value;
            esp_rom_delay_us(125);
        }

        // Enfileira o pacote (com timeout curto)
        if (xQueueSend(noise_queue, &packet, pdMS_TO_TICKS(10)) != pdTRUE) {
            ESP_LOGW("NOISE_TASK", "Fila cheia, pacote descartado");
        }

        // Espera até a próxima iteração (mantém periodicidade e deixa o sistema
respirar) vTaskDelay(pdMS_TO_TICKS(1));
    }
} */

static esp_timer_handle_t sample_timer;
static SensorPacket packet;
static int sample_index = 0;

void IRAM_ATTR noise_sample_callback(void *arg) {
    SensorReading reading;
    read_noise(&reading);  // deve ser leve e rápido!
    // ESP_LOGI(TAG, "Noise sample: %d", reading.value);

    packet.samples[sample_index++] = (int16_t)reading.value;

    if (sample_index == NOISE_SAMPLES_PER_PACKET) {
        ESP_LOGI(TAG, "1o valor: %d", packet.samples[0]);

        struct timeval tv;
        gettimeofday(&tv, NULL);
        packet.timestamp = (tv.tv_sec * 1000) + (tv.tv_usec / 1000);

        BaseType_t xHigherPriorityTaskWoken = pdFALSE;
        xQueueSendFromISR(noise_queue, &packet, &xHigherPriorityTaskWoken);
        sample_index = 0;

        if (xHigherPriorityTaskWoken) {
            portYIELD_FROM_ISR();
        }
    }
}

void start_noise_timer() {
    const esp_timer_create_args_t sample_timer_args = {
        .callback = &noise_sample_callback, .name = "noise_sample_timer"};

    ESP_ERROR_CHECK(esp_timer_create(&sample_timer_args, &sample_timer));
    ESP_ERROR_CHECK(
        esp_timer_start_periodic(sample_timer, 125));  // 125us = 8000Hz
}

// --- Task que envia pacotes da fila via WebSocket ---
void send_task(void *pvParameters) {
    SensorPacket packet;
    
    while (1) {
        if (xQueueReceive(noise_queue, &packet, portMAX_DELAY) == pdTRUE) {
            websocket_send_noise_readings(&packet);
        }
    }
}

void ldr_task(void *pvParameters) {
    SensorReading reading;
    while (1) {
        read_ldr(&reading);
        websocket_send_readings(&reading);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

void dht_task(void *pvParameters) {
    SensorReading readings[2];
    while (1) {
        read_dht(readings);
        websocket_send_readings(readings);
        vTaskDelay(pdMS_TO_TICKS(2000));
    }
}

void app_main(void) {
    ESP_ERROR_CHECK(nvs_flash_init());
    wifi_init_sta();
    websocket_app_start();
    init_time_sync();

    sensor_manager_init();

    // Cria fila
    noise_queue = xQueueCreate(NOISE_QUEUE_LENGTH, sizeof(SensorPacket));
    if (noise_queue == NULL) {
        ESP_LOGE("MAIN", "Falha ao criar a fila");
        return;
    }

    // Cria tasks
    // xTaskCreate(noise_task, "Noise Task", 4096, NULL, 10, NULL); //
    // prioridade maior
    xTaskCreate(send_task, "Send Task", 4096, NULL, 5, NULL);
    start_noise_timer();
    // xTaskCreate(ldr_task, "LDR Task", 4096, NULL, 5, NULL);
    // xTaskCreate(dht_task, "DHT Task", 4096, NULL, 5, NULL);
    //  xTaskCreate(sensor_task, "Sensor Task", 4096, NULL, 5, NULL);
}
