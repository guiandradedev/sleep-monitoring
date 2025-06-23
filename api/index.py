from flask import Flask, request, jsonify
import mysql.connector
from dotenv import load_dotenv
import os
from flask_sock import Sock
import json
from datetime import datetime
import struct
from flask_cors import CORS
import requests

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

app = Flask(__name__)
sock = Sock(app)
CORS(app)

# Configuração do banco de dados MySQL usando variáveis do .env
db_config = {
    'host': os.getenv('MYSQL_HOST'),
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD'),
    'database': os.getenv('MYSQL_DATABASE'),
    'port': int(os.getenv('MYSQL_PORT', 3306))  # Adicione a porta
}

# Constantes para corresponder ao ESP32
NOISE_SAMPLES_PER_PACKET = 384
I2S_SAMPLE_RATE_HZ = 18000
SAMPLE_DURATION_US = 1000000.0 / I2S_SAMPLE_RATE_HZ


@sock.route('/ws')
def websocket(ws):
    while True:
        raw_data = ws.receive()
        if raw_data is None:
            break

        try:
            # Tamanho do pacote esperado (int64_t para timestamp + 448 x int16_t para samples)
            expected_mic_packet_size = 8 + (NOISE_SAMPLES_PER_PACKET * 2) # 904 bytes
            expected_ldr_packet_size = 8 + 2 # 10 bytes
            expected_dht_packet_size = 8 + 2 * 2 # 12 bytes
            
            if len(raw_data) == expected_mic_packet_size:
                print("pacote mic recebido")
                timestamp, *samples = struct.unpack(f'<q{NOISE_SAMPLES_PER_PACKET}h', raw_data)

                rows = [
                    (
                        int(timestamp - (NOISE_SAMPLES_PER_PACKET - 1 - i) * SAMPLE_DURATION_US), 
                        int(sample), 
                        "microphone"
                    )
                    for i, sample in enumerate(samples)
                ]
            elif len(raw_data) == expected_ldr_packet_size:
                print("pacote ldr recebido")
                timestamp, sample = struct.unpack('<qh', raw_data)
                rows = [(int(timestamp), int(sample), "luminosity")]
            elif len(raw_data) == expected_dht_packet_size:
                print("pacote dht recebido")
                timestamp, temp, hum = struct.unpack('<q2h', raw_data)
                rows = [
                    (int(timestamp), int(temp), "temperature"),
                    (int(timestamp), int(hum), "humidity")
                ]
            else:
                print(f"⚠️ Pacote inesperado (tamanho {len(raw_data)} bytes)")
                continue
            
            # Inserir no banco
            try:
                conn = mysql.connector.connect(**db_config)
                cursor = conn.cursor()

                # Insere todos de uma vez
                cursor.executemany("INSERT INTO data (timestamp, sample, type) VALUES (%s, %s, %s)", rows)

                conn.commit()
                #ws.send("Cadastrado")
            except mysql.connector.Error as err:
                print("❌ Erro ao inserir dados:", err)
                #ws.send(f"Erro: {str(err)}")
            finally:
                cursor.close()
                conn.close()

        except Exception as e:
            print("❌ Erro ao interpretar pacote binário:", e)
            #ws.send("Erro: pacote inválido")

@app.route('/data')
def get_data():
    try:
        # Obter o parâmetro 'interval' (ex: "5m", "10m")
        interval_str = request.args.get('interval') or "5m"
        
        # Validar e converter o intervalo para minutos
        if not interval_str.endswith('m'):
            raise ValueError("O parâmetro 'interval' deve terminar com 'm' (ex: '5m', '10m').")
        
        try:
            interval_minutes = int(interval_str.split("m")[0])
            if interval_minutes <= 0:
                raise ValueError("O intervalo de minutos deve ser um número positivo.")
        except ValueError as ve:
            return jsonify({'error': f"Parâmetro 'interval' inválido: {str(ve)}"}), 400

        seconds_interval = 60 * interval_minutes # Converter para segundos

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT
                FLOOR(timestamp / %s) * %s AS interval_timestamp,
                AVG(humidity) AS avg_humidity,
                AVG(luminosity) AS avg_luminosity,
                AVG(temperature) AS avg_temperature,
                MIN(humidity) AS min_humidity,
                MIN(luminosity) AS min_luminosity,
                MIN(temperature) AS min_temperature,
                MAX(humidity) AS max_humidity,
                MAX(luminosity) AS max_luminosity,
                MAX(temperature) AS max_temperature
            FROM
                data
            GROUP BY
                interval_timestamp
            ORDER BY
                interval_timestamp ASC;
        """
        
        cursor.execute(query, (seconds_interval, seconds_interval))

        raw_dados = cursor.fetchall()

        processed_dados = []
        for row in raw_dados:
            timestamp_in_seconds = int(row["interval_timestamp"]) 
            
            dt_object = datetime.fromtimestamp(timestamp_in_seconds)
            formatted_dt_string = dt_object.strftime('%Y-%m-%d %H:%M:%S')

            processed_row = {
                "timestamp": timestamp_in_seconds,
                "datetime": formatted_dt_string,
                "humidity": {
                    "avg": float(row["avg_humidity"]) / 10.0,
                    "min": float(row["min_humidity"]) / 10.0,
                    "max": float(row["max_humidity"]) / 10.0
                },
                "luminosity": {
                    "avg": float(row["avg_luminosity"]) / 1000.0,
                    "min": float(row["min_luminosity"]) / 1000.0,
                    "max": float(row["max_luminosity"]) / 1000.0
                },
                "temperature": {
                    "avg": float(row["avg_temperature"]) / 10.0,
                    "min": float(row["min_temperature"]) / 10.0,
                    "max": float(row["max_temperature"]) / 10.0
                },
            }
            processed_dados.append(processed_row)

        return jsonify(processed_dados)

    except mysql.connector.Error as err:
        print(f"Erro no banco de dados MySQL: {err}")
        return jsonify({'error': f"Erro no banco de dados: {str(err)}"}), 500
    except Exception as e:
        print(f"Erro inesperado ao processar os dados: {e}")
        return jsonify({'error': f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn and conn.is_connected():
            conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)