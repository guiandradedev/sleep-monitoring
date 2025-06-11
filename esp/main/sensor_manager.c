#include "sensor_manager.h"

#include <sys/time.h> // Para gettimeofday
#include <string.h>   // Para memset
#include <stdlib.h>   // Para malloc, free

#include "esp_log.h" // Para logs do ESP-IDF
#include "freertos/FreeRTOS.h" // Para portMAX_DELAY
#include "freertos/task.h"     // Para portMAX_DELAY (pode ser aqui ou em main.c)
#include "dht.h"
#include "esp_adc/adc_oneshot.h"

#include "driver/i2s_std.h" // Para i2s_std_config_t e related functions
#include "driver/i2s_types.h" // Para I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO, etc.
#include "driver/gpio.h"    // Para GPIO_NUM_NC

static const char *TAG = "I2S_Manager";

// O handle do canal I2S precisa ser global estático para ser acessível na função i2s_read_samples
static i2s_chan_handle_t rx_handle = NULL;
static adc_oneshot_unit_handle_t adc_handle;


void sensor_manager_init(void) {
    // --- Inicialização do Driver I2S ---
    // A API nova usa i2s_std_config_t para configuração padrão
    i2s_std_config_t i2s_config = {
        .clk_cfg = {
            .sample_rate_hz = I2S_SAMPLE_RATE,
            .clk_src = I2S_CLK_SRC_DEFAULT, // Ou I2S_CLK_APLL, I2S_CLK_DEFAULT
                                          // I2S_CLK_DEDICATED é comum para I2S de áudio
            .mclk_multiple = I2S_MCLK_MULTIPLE_384, // Use 384x para 24 bits
        },        .slot_cfg = I2S_STD_MSB_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_24BIT, I2S_SLOT_MODE_MONO), // CORRIGIDO: MSB_SLOT_DEFAULT_CONFIG e enums corretos
        .gpio_cfg = {
            .mclk = I2S_GPIO_UNUSED, // Não usamos MCLK neste exemplo (continua funcionando)
            .bclk = I2S_MIC_BCLK_GPIO,
            .ws = I2S_MIC_WS_GPIO,
            .dout = GPIO_NUM_NC, // Não estamos enviando dados para fora
            .din = I2S_MIC_DATA_GPIO,
            .invert_flags = {
                .mclk_inv = false,
                .bclk_inv = false,
                .ws_inv = false,
            },
        },
    };

    // Primeiro, defina o canal para RX (receber dados)
    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
    chan_cfg.dma_desc_num = I2S_DMA_BUFFER_COUNT; // Número de buffers DMA
    // Tamanho de cada buffer DMA em BYTES. Se 64 amostras de 16-bit, então 64 * 2 = 128 bytes
    // A dma_desc_buf_size é definida implicitamente pela .slot_cfg ou pode ser configurada aqui se I2S_DMA_BUFFER_LEN for o tamanho em bytes.
    // Se I2S_DMA_BUFFER_LEN * I2S_BITS_PER_SAMPLE / 8 for o tamanho em bytes
    // No seu caso, I2S_DMA_BUFFER_LEN era 64 (amostras). Então o tamanho em bytes é 64 * 2 = 128.
    chan_cfg.dma_frame_num = I2S_DMA_BUFFER_LEN; // NOVO: dma_frame_num define o tamanho do buffer DMA em FRAMES (amostras por canal)
    chan_cfg.auto_clear = true; // Limpa buffers DMA automaticamente para evitar lixo

    ESP_ERROR_CHECK(i2s_new_channel(&chan_cfg, NULL, &rx_handle)); // NULL para TX (não usado), &rx_handle para RX
    ESP_ERROR_CHECK(i2s_channel_init_std_mode(rx_handle, &i2s_config));
    ESP_ERROR_CHECK(i2s_channel_enable(rx_handle));

    ESP_LOGI(TAG, "I2S driver instalado e configurado para microfone.");

    // --- Configuração do ADC para sensores adicionais (se necessário) ---
    adc_oneshot_unit_init_cfg_t adc_init_cfg = {
        .unit_id = ADC_UNIT_1, // Use ADC_UNIT_1 para ESP32
    };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&adc_init_cfg, &adc_handle));

    adc_oneshot_chan_cfg_t adc_chan_cfg = {
        .bitwidth = ADC_BITWIDTH_DEFAULT, // Resolução padrão de 12 bits
        .atten = ADC_ATTEN_DB_12,     // Atenuação de 0 dB (ajuste conforme necessário)
    };
    ESP_ERROR_CHECK(adc_oneshot_config_channel(adc_handle, LDR_SENSOR_PIN, &adc_chan_cfg)); // Configura o canal LDR
}

// Nova função para ler uma quantidade de amostras I2S.
// Retorna o número de amostras lidas (não bytes).
size_t i2s_read_samples(int32_t *buffer, size_t num_samples_to_read) {
    size_t bytes_read;
    // O handle do canal I2S é o rx_handle global estático
    //ESP_LOGI(TAG, "Tentando ler %zu amostras I2S...", num_samples_to_read);
    esp_err_t err = i2s_channel_read(rx_handle, (void *)buffer, num_samples_to_read * sizeof(int32_t), &bytes_read, portMAX_DELAY);

    if (err == ESP_OK) {
        return bytes_read / sizeof(int32_t); // Retorna o número de amostras lidas
    } else {
        ESP_LOGE(TAG, "Erro ao ler dados I2S: %d", err);
        return 0;
    }
}


void read_ldr(LdrSensorReading *buffer) {
    struct timeval tv;
    gettimeofday(&tv, NULL);
    int64_t timestamp = ((int64_t)tv.tv_sec) * 1000 + tv.tv_usec / 1000;

    int ldr_raw = 0;
    adc_oneshot_read(adc_handle, LDR_SENSOR_PIN, &ldr_raw);
    buffer->value = (int16_t)ldr_raw; // Lê o valor do ADC e converte para int16_t
    buffer->timestamp = timestamp; // Adiciona o timestamp da leitura
}


void read_dht(DhtSensorReading *buffer) {
    struct timeval tv;
    gettimeofday(&tv, NULL);
    int64_t timestamp = ((int64_t)tv.tv_sec) * 1000 + tv.tv_usec / 1000;

    int16_t temp, hum;
    if (dht_read_data(DHT_TYPE_DHT11, DHT_SENSOR_PIN, &hum, &temp) == ESP_OK) {
        buffer->temperature_value = (int16_t)temp; // Lê a temperatura
        buffer->humidity_value = (int16_t)hum; // Lê a umidade
        buffer->timestamp = timestamp; // Adiciona o timestamp da leitura
    }
}
