#pragma once
#include <stddef.h>  // para size_t
#include <stdint.h>  // para int64_t

#define NOISE_SAMPLES_PER_PACKET 500

typedef struct {
    const char *name;
    int value;
    int64_t timestamp;
} SensorReading;

typedef struct {
    uint32_t timestamp;     // apenas o timestamp da primeira amostra
    int16_t samples[NOISE_SAMPLES_PER_PACKET];     // 40 amostras de 16 bits
} __attribute__((packed)) SensorPacket;

void sensor_manager_init(void);
// void read_all_sensors(SensorReading *buffer, size_t *count);
void read_noise(SensorReading *buffer);
void read_ldr(SensorReading *buffer);
void read_dht(SensorReading *buffer);
