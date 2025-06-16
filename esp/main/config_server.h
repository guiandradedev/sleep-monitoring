#pragma once

#include <stdint.h>

// Inicializa o servidor HTTP para configurar taxa de amostragem
void start_config_server(void);

// Função para atualizar a taxa de amostragem (deve ser implementada por quem usa)
void set_sample_rate(uint32_t new_rate);
