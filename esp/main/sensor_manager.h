#pragma once

#include <stddef.h>
#include <stdint.h> // Para int16_t

// NOVO: Incluir a API I2S padrão
#include "driver/i2s_std.h"
// Para I2S_CHANNEL_MONO, I2S_BITS_PER_SAMPLE_16BIT e outras definições comuns
#include "driver/i2s_types.h"
// Para GPIO_NUM_NC (Not Connected), se não for usado no I2S_GPIO_UNUSED (que pode ser removido)
#include "driver/gpio.h"

// Antigo
#define LDR_SENSOR_PIN ADC_CHANNEL_4 // GPIO 32
#define DHT_SENSOR_PIN GPIO_NUM_33

// --- Novas definições para o I2S ---
#define I2S_MIC_WS_GPIO      GPIO_NUM_25 // Exemplo: Pin WS (LRCK) do microfone
#define I2S_MIC_BCLK_GPIO    GPIO_NUM_26 // Exemplo: Pin BCLK do microfone
#define I2S_MIC_DATA_GPIO    GPIO_NUM_27 // Exemplo: Pin SD (DATA) do microfone
#define I2S_SAMPLE_RATE      8000        // Taxa de amostragem desejada (8 kHz)
// A macro I2S_BITS_PER_SAMPLE agora define o tipo da API antiga,
// mas vamos usar o valor direto na config da nova API.
// #define I2S_BITS_PER_SAMPLE  I2S_BITS_PER_SAMPLE_16BIT // REMOVER ou não usar diretamente


#define I2S_DMA_BUFFER_COUNT 8           // Número de buffers DMA
#define I2S_DMA_BUFFER_LEN   64          // Tamanho de cada buffer DMA em *amostras de 16 bits*

// Tamanho do buffer de leitura I2S em BYTES
// Cada amostra de 16 bits ocupa 2 bytes.
// Então, para ler N amostras, o buffer precisa ser N * 2 bytes.
#define I2S_READ_BUFFER_SIZE (I2S_DMA_BUFFER_LEN * 2) // O buffer de leitura precisa ter o tamanho de um buffer DMA

// SensorPacket ajustado para conter os dados I2S
#define NOISE_SAMPLES_PER_PACKET 448 // Número de amostras por pacote (para 8kHz, 500 amostras = 62.5ms)

typedef struct {
    int64_t timestamp;
    int16_t samples[NOISE_SAMPLES_PER_PACKET]; // Amostras de áudio de 16 bits
} __attribute__((packed)) SensorPacket;

typedef struct {
    int64_t timestamp;
    int32_t samples[NOISE_SAMPLES_PER_PACKET]; // Amostras de áudio de 32 bits
} RawSensorPacket;

typedef struct {
    int64_t timestamp; // Timestamp da leitura
    int16_t value;    // Valor lido do sensor
} __attribute__((packed)) LdrSensorReading;

typedef struct {
    int64_t timestamp; // Timestamp da leitura
    int16_t temperature_value;    // Valor lido do sensor
    int16_t humidity_value;       // Valor lido do sensor
} __attribute__((packed)) DhtSensorReading;

void sensor_manager_init(void);

size_t i2s_read_samples(int32_t *buffer, size_t num_samples_to_read);

void read_ldr(LdrSensorReading *buffer);
void read_dht(DhtSensorReading *buffer);
