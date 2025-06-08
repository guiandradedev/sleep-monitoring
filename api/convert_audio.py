import mysql.connector
import numpy as np
import wave
import struct
import os
from dotenv import load_dotenv
from scipy.signal import butter, filtfilt # Para o filtro, certifique-se de ter scipy instalado (`pip install scipy`)

# Carrega as variáveis de ambiente
load_dotenv()

# --- Configurações do Banco de Dados ---
DB_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'user': os.getenv('MYSQL_USER', 'usuario'),
    'password': os.getenv('MYSQL_PASSWORD', 'senha'),
    'database': os.getenv('MYSQL_DATABASE', 'database'),
    'port': int(os.getenv('MYSQL_PORT', 3306))
}

# --- Parâmetros do WAV ---
TARGET_SAMPLE_RATE = 8000  # Hz desejado para o WAV final (corresponde ao ESP32)
SAMPLE_WIDTH = 2           # 2 bytes para 16 bits
NUM_CHANNELS = 1           # Monocanal

# --- Parâmetros de Áudio ---
# A faixa ideal para int16 é de -32768 a 32767.
# Se seus dados brutos do I2S não usam toda essa faixa (ex: microfone só vai até +/-10000),
# você pode aplicar um GAIN_FACTOR para preencher mais.
# Escolha um fator de ganho que não cause clipagem nos seus dados mais barulhentos.
# Um valor de 1.0 significa sem ganho.
# Se seus dados I2S variam de -10000 a 10000, um ganho de 3.0-3.2 pode preencher quase toda a faixa.
# Ajuste este valor após testar seu microfone.
GAIN_FACTOR = 1 # Exemplo: 2.0 para dobrar a amplitude. Ajuste conforme seu microfone!

# --- Funções ---

def fetch_data():
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT timestamp, sample FROM data
            WHERE type = 'microphone'
            ORDER BY timestamp ASC
        """)
        data = cursor.fetchall()
        # Não é mais necessário 4095 - val. Os dados do I2S já devem estar centrados em zero.
        # Retorna os timestamps em microssegundos (como vêm do banco) e os valores de amostra.
        return [(int(ts), int(val)) for ts, val in data]
    except mysql.connector.Error as err:
        print(f"Erro ao buscar dados do banco de dados: {err}")
        return []
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def linear_interpolate(data, target_rate):
    """
    Interpola linearmente os dados para uma nova taxa de amostragem.
    Assume que os timestamps estão em microssegundos.
    """
    if len(data) < 2:
        print("Aviso: Dados insuficientes para interpolação, retornando dados originais.")
        # Se for um único ponto, retorne-o como um array para evitar erros
        if len(data) == 1:
            return np.array([data[0][1]], dtype=np.int16)
        return np.array([], dtype=np.int16)


    timestamps, values = zip(*data)
    timestamps = np.array(timestamps) / 1_000_000.0  # converte microssegundos para segundos
    values = np.array(values, dtype=np.float64) # Use float para interpolação

    # Define novo eixo de tempo para interpolação
    t_start = timestamps[0]
    t_end = timestamps[-1]
    
    # Se t_start == t_end (apenas um ponto ou pontos no mesmo microsegundo), num_samples será 0
    # ou causará erro em np.linspace. Lidar com isso.
    if t_end == t_start:
        print("Aviso: Todos os timestamps são idênticos. Não é possível interpolar.")
        return values.astype(np.int16) # Retorna os valores originais, sem interpolação

    # O número de amostras na taxa alvo
    num_samples = int((t_end - t_start) * target_rate)
    
    # Adicionar um mínimo de amostras para evitar erro se num_samples for muito pequeno ou zero
    if num_samples < 2:
        print(f"Aviso: Número de amostras interpoladas muito baixo ({num_samples}). Retornando valores originais.")
        return values.astype(np.int16)

    new_times = np.linspace(t_start, t_end, num_samples)

    interpolated = np.interp(new_times, timestamps, values)
    return interpolated.astype(np.int16) # Converte para int16 após interpolação

def apply_gain(samples, gain_factor=GAIN_FACTOR):
    """
    Aplica um ganho constante aos samples e clipa para a faixa int16.
    """
    gained_samples = samples * gain_factor
    # Clipa os valores para garantir que estejam dentro da faixa de int16
    gained_samples = np.clip(gained_samples, -32768, 32767)
    return gained_samples.astype(np.int16)

def filter_lowpass(samples, cutoff_freq=3000, sample_rate=TARGET_SAMPLE_RATE):
    """
    Aplica um filtro passa-baixa Butterworth aos samples.
    """
    if len(samples) < 2: # scipy.signal precisa de pelo menos 2 pontos
        print("Aviso: Dados insuficientes para filtragem, pulando filtro passa-baixa.")
        return samples

    nyquist = 0.5 * sample_rate
    if cutoff_freq >= nyquist:
        print(f"Aviso: Frequência de corte ({cutoff_freq} Hz) >= Frequência de Nyquist ({nyquist} Hz). Pulando filtro passa-baixa.")
        return samples

    normal_cutoff = cutoff_freq / nyquist
    # A ordem do filtro (1 no seu caso) pode ser ajustada. Ordens mais altas filtram mais abruptamente.
    b, a = butter(4, normal_cutoff, btype='low', analog=False) # Ordem 4 para um filtro mais eficaz
    filtered = filtfilt(b, a, samples)
    return filtered.astype(np.int16)

def save_wav(samples, filename='output.wav'):
    """
    Salva um array numpy de samples em um arquivo WAV.
    """
    with wave.open(filename, 'wb') as wav_file:
        wav_file.setnchannels(NUM_CHANNELS)
        wav_file.setsampwidth(SAMPLE_WIDTH)
        wav_file.setframerate(TARGET_SAMPLE_RATE)
        wav_file.writeframes(samples.tobytes())
    print(f"Arquivo WAV salvo: {filename}")

def calculate_average_frequency(data):
    """
    Calcula a frequência média de amostragem a partir dos timestamps.
    """
    timestamps = [t for t, _ in data]
    if len(timestamps) < 2:
        return 0

    diffs_us = np.diff(timestamps)  # em microssegundos
    # Filtra diferenças de 0 ou negativas para evitar divisões por zero ou resultados inválidos
    diffs_us = diffs_us[diffs_us > 0]
    if len(diffs_us) == 0:
        return 0

    diffs_s = diffs_us / 1_000_000.0 # converte para segundos
    avg_interval = np.mean(diffs_s) # intervalo médio entre amostras em segundos
    avg_freq = 1.0 / avg_interval if avg_interval > 0 else 0
    return avg_freq

# --- Execução Principal ---
if __name__ == "__main__":
    dados = fetch_data() # Dados brutos do banco (timestamp_us, sample_value_int16)

    if not dados:
        print("Nenhum dado de microfone encontrado para processar.")
    else:
        avg_freq = calculate_average_frequency(dados)
        print(f"Frequência média dos dados brutos: {avg_freq:.2f} Hz")
        print(f"Primeiro timestamp: {dados[0][0]} µs, Último timestamp: {dados[-1][0]} µs")
        print(f"Primeira amostra: {dados[0][1]}, Última amostra: {dados[-1][1]}")


        # 1. Interpolar para a taxa de amostragem alvo (se necessário)
        # Se sua taxa de amostragem do ESP32 (8000Hz) for exatamente a TARGET_SAMPLE_RATE,
        # e seus dados forem perfeitos, a interpolação pode ser simplificada ou até pulada.
        # No entanto, se houver flutuações no tempo ou se você quiser outra taxa, mantenha.
        interpolated_samples = linear_interpolate(dados, TARGET_SAMPLE_RATE)
        
        if interpolated_samples.size == 0:
            print("Nenhuma amostra interpolada para processar. Sair.")
        else:
            # 2. Aplicar ganho constante
            gained_samples = apply_gain(interpolated_samples, GAIN_FACTOR)
            save_wav(gained_samples, 'output_gained.wav')

            # 3. Filtrar (opcional, mas bom para limpar ruído de alta frequência)
            filtered_samples = filter_lowpass(gained_samples, cutoff_freq=3500, sample_rate=TARGET_SAMPLE_RATE) # Aumentei a frequência de corte
            save_wav(filtered_samples, 'output_filtered.wav')

            print(f"WAVs salvos com sucesso na taxa de: {TARGET_SAMPLE_RATE} Hz")

            # Plotagem dos intervalos
            import matplotlib.pyplot as plt
            if len(dados) > 1:
                timestamps = [t for t, _ in dados]
                intervals = np.diff(timestamps)
                plt.figure(figsize=(12, 6))
                plt.plot(intervals)
                plt.title("Intervalos entre amostras (µs)")
                plt.xlabel("Índice da Amostra")
                plt.ylabel("Δ timestamp (µs)")
                plt.grid(True)
                plt.show()
            else:
                print("Não há dados suficientes para plotar os intervalos.")