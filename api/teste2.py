import mysql.connector
import numpy as np
import wave
import struct

# Configurações do banco de dados
DB_CONFIG = {
    'host': 'localhost',
    'user': 'usuario',
    'password': 'senha',
    'database': 'database'
}

# Parâmetros do WAV
TARGET_SAMPLE_RATE = 8000  # Hz desejado para o WAV final
SAMPLE_WIDTH = 2           # 16 bits
NUM_CHANNELS = 1

def fetch_data():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT timestamp, sample FROM data
        WHERE type = 'microphone'
        ORDER BY timestamp ASC
    """)
    data = cursor.fetchall()
    conn.close()
    return [(int(ts), int(4095 - val)) for ts, val in data]

def linear_interpolate(data, target_rate):
    if len(data) < 2:
        raise ValueError("Dados insuficientes para interpolação")

    timestamps, values = zip(*data)
    timestamps = np.array(timestamps) / 1_000_000.0   # converte ms para segundos
    values = np.array(values)

    # Define novo eixo de tempo para interpolação
    t_start = timestamps[0]
    t_end = timestamps[-1]
    num_samples = int((t_end - t_start) * target_rate)
    new_times = np.linspace(t_start, t_end, num_samples)

    interpolated = np.interp(new_times, timestamps, values)
    return interpolated

def normalize(samples):
    min_val = np.min(samples)
    max_val = np.max(samples)
    offset = (max_val + min_val) / 2
    amplitude = max(abs(max_val - offset), abs(min_val - offset))
    gain = 32767 / amplitude if amplitude != 0 else 1
    normalized = ((samples - offset) * gain).astype(np.int16)
    return normalized

def filter_lowpass(samples, cutoff_freq=3000, sample_rate=TARGET_SAMPLE_RATE):
    from scipy.signal import butter, filtfilt

    nyquist = 0.5 * sample_rate
    normal_cutoff = cutoff_freq / nyquist
    b, a = butter(1, normal_cutoff, btype='low', analog=False)
    filtered = filtfilt(b, a, samples)
    return filtered.astype(np.int16)

def save_wav(samples, filename='output.wav'):
    with wave.open(filename, 'wb') as wav_file:
        wav_file.setnchannels(NUM_CHANNELS)
        wav_file.setsampwidth(SAMPLE_WIDTH)
        wav_file.setframerate(TARGET_SAMPLE_RATE)
        wav_file.writeframes(samples.tobytes())

def calculate_average_frequency(data):
    timestamps = [t for t, _ in data]
    if len(timestamps) < 2:
        return 0

    diffs_us = np.diff(timestamps)  # em microssegundos
    diffs_s = diffs_us / 1_000_000.0
    avg_interval = np.mean(diffs_s)
    avg_freq = 1.0 / avg_interval if avg_interval > 0 else 0
    return avg_freq

if __name__ == "__main__":
    dados = fetch_data()
    avg_freq = calculate_average_frequency(dados)
    print(f"Frequência média dos dados: {avg_freq:.2f} Hz")
    
    interp = linear_interpolate(dados, TARGET_SAMPLE_RATE)
    save_wav(interp, 'output.wav')
    norm = normalize(interp)
    save_wav(norm, 'output_normalized.wav')
    filt = filter_lowpass(norm)
    save_wav(filt, 'output_filtered.wav')
    print(f"WAVs salvo com sucesso: {TARGET_SAMPLE_RATE} Hz")
    
    import matplotlib.pyplot as plt
    intervals = np.diff([t for t, _ in dados])
    plt.plot(intervals)
    plt.title("Intervalos entre amostras (μs)")
    plt.ylabel("Δ timestamp (μs)")
    plt.show()

