#include "config_server.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "esp_log.h"
#include "esp_err.h"
#include "esp_http_server.h"

static const char *TAG = "CONFIG_SERVER";

// HTML simples para formulário de taxa de amostragem
static const char *html_form = 
    "<!DOCTYPE html><html><head><title>Configurar Amostragem</title></head><body>"
    "<h2>Configurar Taxa de Amostragem (Hz)</h2>"
    "<form method=\"POST\" action=\"/set_rate\">"
    "<input type=\"number\" name=\"rate\" min=\"1000\" max=\"48000\" required>"
    "<input type=\"submit\" value=\"Atualizar\">"
    "</form></body></html>";

static esp_err_t root_get_handler(httpd_req_t *req) {
    httpd_resp_set_type(req, "text/html");
    httpd_resp_send(req, html_form, HTTPD_RESP_USE_STRLEN);
    return ESP_OK;
}

#ifndef MIN
#define MIN(a, b) ((a) < (b) ? (a) : (b))
#endif

static esp_err_t set_rate_post_handler(httpd_req_t *req) {
    char buf[100] = {0};
    int ret = httpd_req_recv(req, buf, MIN(req->content_len, sizeof(buf) - 1));
    if (ret <= 0) {
        return ESP_FAIL;
    }

    ESP_LOGI(TAG, "Corpo recebido: %s", buf);

    // Extrai valor de "rate=16000"
    char *rate_str = strstr(buf, "rate=");
    if (!rate_str) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Parâmetro ausente");
        return ESP_FAIL;
    }

    int new_rate = atoi(rate_str + 5); // Pula "rate="
    if (new_rate < 1000 || new_rate > 48000) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Valor inválido");
        return ESP_FAIL;
    }

    ESP_LOGI(TAG, "Nova taxa de amostragem: %d", new_rate);
    set_sample_rate((uint32_t)new_rate);

    httpd_resp_sendstr(req, "Taxa atualizada com sucesso.");
    return ESP_OK;
}

void start_config_server(void) {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    httpd_handle_t server = NULL;

    if (httpd_start(&server, &config) == ESP_OK) {
        httpd_uri_t root_uri = {
            .uri = "/",
            .method = HTTP_GET,
            .handler = root_get_handler
        };
        httpd_register_uri_handler(server, &root_uri);

        httpd_uri_t set_rate_uri = {
            .uri = "/set_rate",
            .method = HTTP_POST,
            .handler = set_rate_post_handler
        };
        httpd_register_uri_handler(server, &set_rate_uri);

        ESP_LOGI(TAG, "Servidor de configuração iniciado");
    } else {
        ESP_LOGE(TAG, "Falha ao iniciar o servidor HTTP");
    }
}
