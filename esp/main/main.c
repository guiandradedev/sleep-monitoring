#include <time.h>
#include <math.h>

#include "esp_log.h"
#include "esp_sntp.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "nvs_flash.h"
#include "sensor_manager.h"
#include "websocket_client.h"
#include "wifi_manager.h"

#define NOISE_QUEUE_LENGTH 30

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


static QueueHandle_t noise_queue;

// --- Task para coletar e enfileirar pacotes de áudio I2S ---
// Esta task substituirá o timer ISR e a lógica de leitura ADC.
// Ela vai ler grandes blocos de áudio I2S e enfileirar para envio.
void i2s_audio_capture_task(void *pvParameters) {
    // Alocar buffer para a tarefa de leitura I2S
    // O tamanho deste buffer deve ser grande o suficiente para a quantidade de amostras
    // que você quer ler por vez antes de empacotar.
    // É recomendado que seja um múltiplo do I2S_DMA_BUFFER_LEN
    // Vamos usar um buffer do tamanho do pacote de envio aqui (500 amostras * 2 bytes/amostra)
    int32_t *audio_buffer = (int32_t *)malloc(NOISE_SAMPLES_PER_PACKET * sizeof(int32_t));
    if (audio_buffer == NULL) {
        ESP_LOGE(TAG, "Falha ao alocar buffer de áudio na task de captura.");
        vTaskDelete(NULL); // Deleta a própria task em caso de falha
    }
    memset(audio_buffer, 0, NOISE_SAMPLES_PER_PACKET * sizeof(int32_t));

    RawSensorPacket packet;
    size_t samples_read;
    //const TickType_t i2s_read_timeout = pdMS_TO_TICKS(100); // Timeout para leitura I2S

    while (1) {
        // Lê as amostras diretamente do I2S.
        // A função i2s_read() já utiliza DMA e é otimizada.
        // Ela esperará até que o número de bytes solicitado seja lido, ou até o timeout.
        samples_read = i2s_read_samples(audio_buffer, NOISE_SAMPLES_PER_PACKET);

        if (samples_read == NOISE_SAMPLES_PER_PACKET) {
            // Copia as amostras lidas para a estrutura do pacote
            memcpy(packet.samples, audio_buffer, NOISE_SAMPLES_PER_PACKET * sizeof(int32_t));

            // Adiciona o timestamp
            struct timeval tv;
            gettimeofday(&tv, NULL);
            packet.timestamp = (tv.tv_sec * 1000000LL) + tv.tv_usec; // Use 1000000LL para garantir que a multiplicação seja 64-bit

            // Enfileira o pacote para a task de envio
            if (xQueueSend(noise_queue, &packet, pdMS_TO_TICKS(100)) != pdTRUE) {
                ESP_LOGW(TAG, "Fila de áudio cheia, pacote descartado");
            }
        } else {
            ESP_LOGW(TAG, "Não foram lidas todas as amostras esperadas (%d de %d)", samples_read, NOISE_SAMPLES_PER_PACKET);
        }
        // Não é necessário um delay fixo aqui, i2s_read já é bloqueante e controla o fluxo.
        // Um pequeno delay pode ser útil para outras tarefas, mas cuidado para não perder amostras
        // vTaskDelay(pdMS_TO_TICKS(1));
    }
    free(audio_buffer); // Atingível apenas se a task for deletada
}

// --- Task que envia pacotes da fila via WebSocket ---
void i2s_send_task(void *pvParameters) {
    RawSensorPacket raw_packet;
    SensorPacket packet;
    
    while (1) {
        if (xQueueReceive(noise_queue, &raw_packet, portMAX_DELAY) == pdTRUE) {

            for (int i = 0; i < NOISE_SAMPLES_PER_PACKET; i++) {
                packet.samples[i] = (int16_t) (raw_packet.samples[i] >> 8); // Converte de int32_t para int16_t
            }
            packet.timestamp = raw_packet.timestamp; // Mantém o timestamp original

            websocket_send_mic_readings(&packet);

        }
    }
}


void ldr_task(void *pvParameters) {
    LdrSensorReading reading;
    while (1) {
        read_ldr(&reading);
        websocket_send_ldr_readings(&reading);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}


void dht_task(void *pvParameters) {
    DhtSensorReading reading;
    while (1) {
        read_dht(&reading);
        websocket_send_dht_readings(&reading);
        vTaskDelay(pdMS_TO_TICKS(2000));
    }
}



void print_task_cpu_usage(void)
{
    UBaseType_t num_tasks = uxTaskGetNumberOfTasks();
    TaskStatus_t *task_array = pvPortMalloc(num_tasks * sizeof(TaskStatus_t));
    uint32_t total_runtime;

    if (task_array == NULL) {
        ESP_LOGE("TASK_STATS", "Erro ao alocar memória");
        return;
    }

    num_tasks = uxTaskGetSystemState(task_array, num_tasks, &total_runtime);

    // Dividir para obter percentual
    total_runtime /= 100;

    printf("\n=== CPU USO POR TASK ===\n");
    printf("Nome\t\tTempo\t\tUso CPU\n");

    for (int i = 0; i < num_tasks; i++) {
        uint32_t time = task_array[i].ulRunTimeCounter;
        if (total_runtime > 0) {
            uint32_t percent = time / total_runtime;
            printf("%-12s\t%8lu\t\t%2lu%%\n", task_array[i].pcTaskName, time, percent);
        } else {
            printf("%-12s\t%8lu\t\t<1%%\n", task_array[i].pcTaskName, time);
        }
    }

    vPortFree(task_array);
}

void monitor_task(void *pvParameters) {
    while (1) {
        print_task_cpu_usage();
        vTaskDelay(pdMS_TO_TICKS(5000)); // a cada 5 segundos
    }
}



void app_main(void) {
    ESP_ERROR_CHECK(nvs_flash_init());
    wifi_init_sta();
    websocket_app_start();
    init_time_sync();

    sensor_manager_init();

    // Cria fila
    noise_queue = xQueueCreate(NOISE_QUEUE_LENGTH, sizeof(RawSensorPacket));
    if (noise_queue == NULL) {
        ESP_LOGE("MAIN", "Falha ao criar a fila");
        return;
    }

    // Cria tasks
    xTaskCreatePinnedToCore(i2s_audio_capture_task, "I2S Audio Capture", 4096, NULL, 10, NULL, 0); // Prioridade alta para áudio
    xTaskCreatePinnedToCore(i2s_send_task, "Send Task", 8192, NULL, 8, NULL, 1); // Prioridade menor que a de captura
    xTaskCreatePinnedToCore(ldr_task, "LDR Task", 4096, NULL, 9, NULL, 0);
    xTaskCreatePinnedToCore(dht_task, "DHT Task", 4096, NULL, 9, NULL, 0);
    xTaskCreatePinnedToCore(monitor_task, "Monitor Task", 4096, NULL, 5, NULL, 0); // Task de monitoramento
}
