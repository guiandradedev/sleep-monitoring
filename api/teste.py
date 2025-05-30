import serial
import wave

porta = serial.Serial('/dev/tty.usbserial-0001', 115200)
amostras = []

print("Gravando... Pressione Ctrl+C para parar.")

try:
    while True:
        if porta.in_waiting:
            amostras.append(ord(porta.read()))
except KeyboardInterrupt:
    pass
finally:
    porta.close()

# Salvar como WAV
with wave.open("saida.wav", "wb") as wavfile:
    wavfile.setnchannels(1)
    wavfile.setsampwidth(1)      # 8 bits
    wavfile.setframerate(8000)   # 8kHz
    wavfile.writeframes(bytes(amostras))

print("Arquivo salvo como 'saida.wav'")