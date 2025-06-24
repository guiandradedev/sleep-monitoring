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

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    conn = None
    cursor = None
    try:
        # Get and validate the 'interval' parameter
        # Using .get() with a default value is safer than 'or' for request args.
        interval_str = request.args.get('interval', "5m") 
        nightId = request.args.get('nightId', "") 
        
        if not interval_str.endswith('m'):
            return jsonify({'error': "O parâmetro 'interval' deve terminar com 'm' (ex: '5m', '10m')."}), 400
        
        try:
            interval_minutes = int(interval_str.split("m")[0])
            if interval_minutes <= 0:
                return jsonify({'error': "O intervalo de minutos deve ser um número positivo."}), 400
        except ValueError:
            return jsonify({'error': "O parâmetro 'interval' contém um valor numérico inválido."}), 400

        seconds_interval = 60 * interval_minutes # Convert to seconds

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        if nightId:
            # If nightId is provided, filter data for that night
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
                WHERE
                    night_id = %s
                GROUP BY
                    interval_timestamp
                ORDER BY
                    interval_timestamp ASC;
            """
            cursor.execute(query, (seconds_interval, seconds_interval, nightId))
        else:
            # If no nightId is provided, get all data
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

        raw_data = cursor.fetchall()

        processed_data = []
        
        # Initialize variables for overall min/max and sums for averages
        total_temperature_sum = 0
        total_humidity_sum = 0
        total_luminosity_sum = 0
        
        overall_min_temperature = float('inf')
        overall_max_temperature = float('-inf')
        overall_min_humidity = float('inf')
        overall_max_humidity = float('-inf')
        overall_min_luminosity = float('inf')
        overall_max_luminosity = float('-inf')

        for row in raw_data:
            timestamp_in_seconds = int(row["interval_timestamp"])
            dt_object = datetime.fromtimestamp(timestamp_in_seconds)
            formatted_dt_string = dt_object.strftime('%Y-%m-%dT%H:%M:%S')

            # Apply scaling as per your original code
            current_avg_humidity = float(row["avg_humidity"]) / 10.0
            current_min_humidity = float(row["min_humidity"]) / 10.0
            current_max_humidity = float(row["max_humidity"]) / 10.0

            current_avg_luminosity = float(row["avg_luminosity"]) / 1000.0
            current_min_luminosity = float(row["min_luminosity"]) / 1000.0
            current_max_luminosity = float(row["max_luminosity"]) / 1000.0
            
            current_avg_temperature = float(row["avg_temperature"]) / 10.0
            current_min_temperature = float(row["min_temperature"]) / 10.0
            current_max_temperature = float(row["max_temperature"]) / 10.0

            processed_row = {
                "timestamp": timestamp_in_seconds,
                "datetime": formatted_dt_string,
                "humidity": {
                    "avg": current_avg_humidity,
                    "min": current_min_humidity,
                    "max": current_max_humidity
                },
                "luminosity": {
                    "avg": current_avg_luminosity,
                    "min": current_min_luminosity,
                    "max": current_max_luminosity
                },
                "temperature": {
                    "avg": current_avg_temperature,
                    "min": current_min_temperature,
                    "max": current_max_temperature
                },
            }
            processed_data.append(processed_row)
            
            # Accumulate for overall averages
            total_temperature_sum += current_avg_temperature
            total_humidity_sum += current_avg_humidity
            total_luminosity_sum += current_avg_luminosity

            # Update overall min/max values
            overall_min_temperature = min(overall_min_temperature, current_min_temperature)
            overall_max_temperature = max(overall_max_temperature, current_max_temperature)
            overall_min_humidity = min(overall_min_humidity, current_min_humidity)
            overall_max_humidity = max(overall_max_humidity, current_max_humidity)
            overall_min_luminosity = min(overall_min_luminosity, current_min_luminosity)
            overall_max_luminosity = max(overall_max_luminosity, current_max_luminosity)

        # Calculate overall averages, handle case where no data is returned
        num_records = len(processed_data)
        overall_avg_temperature = total_temperature_sum / num_records if num_records > 0 else 0
        overall_avg_humidity = total_humidity_sum / num_records if num_records > 0 else 0
        overall_avg_luminosity = total_luminosity_sum / num_records if num_records > 0 else 0

        query_last_night = """
            SELECT
                night_id
            FROM
                data
            ORDER BY
                night_id DESC
            LIMIT 1;
        """
        cursor.execute(query_last_night)
        last_night = cursor.fetchone()

        # If no data, return default values
        if not processed_data:
            return jsonify({
                'data': [], 
                'last_night': last_night['night_id'] if last_night else None,
                'averages': {
                    'temperature': 0, 
                    'humidity': 0, 
                    'luminosity': 0
                },
                'overall_min_max': {
                    'temperature': {'min': 0, 'max': 0},
                    'humidity': {'min': 0, 'max': 0},
                    'luminosity': {'min': 0, 'max': 0}
                }
            })
        
        return jsonify({
            'data': processed_data,
            'last_night': last_night['night_id'] if last_night else None,
            'overall': {
                'temperature': {'min': overall_min_temperature, 'max': overall_max_temperature, 'avg': overall_avg_temperature},
                'humidity': {'min': overall_min_humidity, 'max': overall_max_humidity, 'avg': overall_avg_humidity},
                'luminosity': {'min': overall_min_luminosity, 'max': overall_max_luminosity, 'avg': overall_avg_luminosity}
            }
        })

    except mysql.connector.Error as err:
        print(f"MySQL Database Error: {err}")
        return jsonify({'error': f"Erro no banco de dados: {str(err)}"}), 500
    except Exception as e:
        print(f"Unexpected error processing data: {e}")
        return jsonify({'error': f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()



@app.route('/api/nights', methods=['GET'])
def get_nights():
    """
        Retorna uma lista de noites com o primeiro timestamp de cada uma.
        A lista é ordenada por night_id.
        Cada noite é representada por um dicionário com 'night_id' e 'first_timestamp'.
        O timestamp é retornado como um inteiro representando o número de segundos desde a época
        (1 de janeiro de 1970).
        Exemplo de resposta:
        {
            "data": [
                {"night_id": 1, "first_timestamp": 1700000000},
                {"night_id": 2, "first_timestamp": 1700003600},
                ...
            ]
        }
    """
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT
                night_id,
                MIN(timestamp) AS first_timestamp,
                MAX(timestamp) AS last_timestamp
            FROM
                data
            GROUP BY
                night_id
            ORDER BY
                night_id;
        """
        
        cursor.execute(query)
        raw_data = cursor.fetchall()

        return jsonify({
            'data': raw_data, 
        })
    
    except mysql.connector.Error as err:
        print(f"MySQL Database Error: {err}")
        return jsonify({'error': f"Erro no banco de dados: {str(err)}"}), 500
    except Exception as e:
        print(f"Unexpected error processing data: {e}")
        return jsonify({'error': f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)